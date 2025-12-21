# Strava Activity Sync Specification v2

## Overview

This specification defines two distinct sync strategies for Strava activities:

1. **Initial Sync**: Quick onboarding sync fetching the 30 most recent activities
2. **Continuous Historical Sync**: Complete historical data retrieval initiated by user

## Rate Limit Constraints

### Strava API Limits

- **100 requests per 15 minutes**
- **1000 requests per day**
- **Reset times**: xx:00, xx:15, xx:30, xx:45 of every hour

### Implementation Strategy

- Track requests in 15-minute windows
- Pause sync 2 minutes before reset boundary
- Resume automatically after reset
- Reserve buffer (use max 95 requests per window)

## 1. Initial Sync (Fast Onboarding)

### Purpose

Get users started quickly with their most recent training data without waiting for a complete historical sync.

### Trigger

Automatically runs on user's first login after Strava OAuth authentication.

### Process

```
On First Login:
1. Check if user has any activities in database
2. If database is empty:
   â†' Fetch last 30 activities (summary data)
   â†' Fetch details for each of the 30 activities
   â†' Save to database
   â†' Mark sync_status as "initial_complete"
3. Show user their recent activities
4. Display prompt: "You have more historical activities. Start full sync?"
```

### API Calls

**Step 1: Fetch Recent Activities**

```
GET https://www.strava.com/api/v3/athlete/activities?per_page=30&page=1
```

**Step 2: For Each Activity (30 total)**

```
GET https://www.strava.com/api/v3/activities/{id}
GET https://www.strava.com/api/v3/activities/{id}/streams?keys=time,distance,heartrate,cadence,watts,altitude,latlng
```

**Total API Calls**: 1 + (30 × 2) = **61 requests**

### Database Updates

```javascript
// After initial sync completes
{
  userId: ObjectId,
  strava_sync_status: "initial_complete",
  strava_last_sync_check: new Date(),
  strava_newest_activity_date: <date of newest activity>,
  strava_oldest_activity_date: <date of oldest synced activity>,
  total_activities_count: 30,
  has_older_activities: <boolean>, // Check if there are activities older than oldest synced
  continuous_sync_status: "not_started"
}
```

### Checking for Older Activities

After initial sync, make one additional query to check if historical data exists:

```
GET https://www.strava.com/api/v3/athlete/activities?before=<oldest_activity_timestamp>&per_page=1
```

If this returns any results → `has_older_activities: true`

### User Experience

**UI During Initial Sync:**

```
┌─────────────────────────────────────┐
│  Setting up your profile...         │
│                                     │
│  [■■■■■■■■■■░░░░░░] 65%             │
│                                     │
│  Syncing your recent activities     │
│  15 of 30 activities processed      │
└─────────────────────────────────────┘
```

**After Initial Sync Complete:**

```
┌─────────────────────────────────────┐
│  ✓ Your recent activities are ready │
│                                     │
│  📊 30 activities synced            │
│  📅 Oldest: December 1, 2024        │
│                                     │
│  ℹ️  You have older activities       │
│     available (dating back to 2020) │
│                                     │
│  [Start Full Historical Sync]       │
│                                     │
│  This will fetch all your           │
│  historical data in the background  │
└─────────────────────────────────────┘
```

## 2. Continuous Historical Sync

### Purpose

Fetch all historical activities older than the oldest activity currently in the database.

### Trigger

- User clicks "Start Full Historical Sync" button
- Manual trigger only (not automatic)

### Process Overview

```
Continuous Sync Process:
1. User initiates sync
2. Fetches the ids of all the activities the user has. (useTotalActivities hook)
3. Filter out the activities that are already in the database (based on stravaId) --> activitiesToSync variable
5. For each activity:
   â†' Check rate limit before details/streams call
   â†' Fetch detailed activity data
   â†' Fetch streams data
   â†' Save to database
   â†' Remove synced activity from the activitesToSync list
6. Keep going until activitiesToSync === 0
```

> NOTE: If the rate limit is hit, it should save which call and which activity. After the rate limit delay has reset it should do the same call again and go onward.

### Detailed Algorithm

```javascript
  async continuousHistoricalSync(accessToken: string): Promise<{
    success: boolean;
    syncedCount: number;
    completed: boolean;
    errors: Array<{ activityId: number; error: string }>;
  }> {
    try {
      console.log('Starting continuous historical sync');

      // Get sync metadata
      let metadata: SyncMetadataDocument | null = await this.syncMetadataCollection.findOne({ type: 'strava_sync' });
      if (!metadata) {
        // Create default metadata if none exists
        metadata = {
          type: 'strava_sync',
          strava_sync_status: 'not_started',
          strava_last_sync_check: new Date(0),
          strava_newest_activity_date: undefined,
          strava_oldest_activity_date: undefined,
          total_activities_count: 0,
          has_older_activities: false,
          continuous_sync_status: 'not_started',
          continuous_sync_started_at: undefined,
          continuous_sync_progress: undefined,
          rate_limit_info: undefined,
          last_error: undefined,
        };
        await this.syncMetadataCollection.insertOne(metadata);
      }

      // Check if continuous sync is already running or completed
      if (metadata.continuous_sync_status === 'completed') {
        console.log('Continuous sync already completed');
        return { success: true, syncedCount: 0, completed: true, errors: [] };
      }

      if (metadata.continuous_sync_status === 'syncing') {
        console.log('Continuous sync already running');
        return { success: false, syncedCount: 0, completed: false, errors: [{ activityId: 0, error: 'Sync already running' }] };
      }

      // Update status to syncing
      await this.syncMetadataCollection.updateOne(
        { type: 'strava_sync' },
        {
          $set: {
            continuous_sync_status: 'syncing',
            continuous_sync_started_at: new Date(),
            continuous_sync_progress: {
              totalActivitiesFound: 0,
              activitiesProcessed: 0,
              currentBatchStart: undefined,
              estimatedCompletion: undefined,
              lastProcessedActivityId: metadata.continuous_sync_progress?.lastProcessedActivityId || 0,
            },
            last_error: undefined
          }
        }
      );

      let totalSynced = 0;
      const errors: Array<{ activityId: number; error: string }> = [];

      // Fetch all activity IDs from Strava
      console.log('Fetching all activity IDs from Strava...');
      const allActivityIds = await fetchAllActivityIds(accessToken);
      console.log(`Found ${allActivityIds.length} total activities on Strava`);

      // Get all activity IDs already in the database
      const existingActivities = await this.activitiesCollection.find({}, { projection: { stravaId: 1 } }).toArray();
      const existingActivityIds = new Set(existingActivities.map(activity => activity.stravaId));
      console.log(`Found ${existingActivityIds.size} activities already in database`);

      // Filter out activities already in the database
      const activitiesToSync = allActivityIds.filter(id => !existingActivityIds.has(id));
      console.log(`Need to sync ${activitiesToSync.length} activities`);

      if (activitiesToSync.length === 0) {
        console.log('All activities are already synced');
        // Mark continuous sync as completed
        await this.syncMetadataCollection.updateOne(
          { type: 'strava_sync' },
          {
            $set: {
              continuous_sync_status: 'completed',
              strava_sync_status: 'fully_synced',
              strava_last_sync_check: new Date(),
              'continuous_sync_progress.totalActivitiesFound': allActivityIds.length,
              'continuous_sync_progress.activitiesProcessed': 0,
              'continuous_sync_progress.estimatedCompletion': new Date(),
              rate_limit_info: this.rateLimitManager.getRateLimitInfo(),
            }
          }
        );
        return { success: true, syncedCount: 0, completed: true, errors: [] };
      }

      // Update progress with total activities found
      await this.syncMetadataCollection.updateOne(
        { type: 'strava_sync' },
        {
          $set: {
            'continuous_sync_progress.totalActivitiesFound': allActivityIds.length,
            rate_limit_info: this.rateLimitManager.getRateLimitInfo(),
          }
        }
      );

      // Process activities one by one, removing from activitiesToSync after successful sync
      while (activitiesToSync.length > 0) {
        // Check if sync should be paused
        const metadata = await this.syncMetadataCollection.findOne({ type: 'strava_sync' });
        if (metadata?.continuous_sync_status === 'paused') {
          console.log('Sync paused by user during activity processing');
          return { success: true, syncedCount: totalSynced, completed: false, errors };
        }

        const activityId = activitiesToSync[0]; // Take the first activity

        try {
          // Check rate limit before each detail fetch
          await this.rateLimitManager.checkAndWait();
          const activityDetail = await fetchActivityDetail(accessToken, activityId);

          // Fetch streams data for graphs (heartrate, pace, cadence, etc.)
          await this.rateLimitManager.checkAndWait();
          const streams = await fetchActivityStreams(accessToken, activityId, ['time', 'distance', 'heartrate', 'cadence', 'watts', 'altitude', 'latlng']);

          const activityDoc = this.mapStravaToMongo(activityDetail, streams);

          await this.activitiesCollection.updateOne(
            { stravaId: activityId },
            { $set: activityDoc },
            { upsert: true }
          );

          // Successfully synced, remove from activitiesToSync
          activitiesToSync.shift(); // Remove the first element
          totalSynced++;

          // Update progress
          await this.syncMetadataCollection.updateOne(
            { type: 'strava_sync' },
            {
              $inc: { 'continuous_sync_progress.activitiesProcessed': 1 },
              $set: {
                'continuous_sync_progress.lastProcessedActivityId': activityId,
                total_activities_count: await this.activitiesCollection.countDocuments(),
              }
            }
          );

        } catch (error) {
          if (error instanceof RateLimitError) {
            // Rate limit hit - pause sync and wait for reset, then retry this activity
            console.log(`Rate limit hit while processing activity ${activityId}. Pausing sync to wait for reset.`);

            // Update metadata to indicate rate limit pause
            await this.syncMetadataCollection.updateOne(
              { type: 'strava_sync' },
              {
                $set: {
                  continuous_sync_status: 'paused',
                  last_error: {
                    timestamp: new Date(),
                    message: `Rate limit hit while processing activity ${activityId}. Waiting for reset.`,
                    activityId: activityId,
                  },
                  'continuous_sync_progress.lastProcessedActivityId': activityId,
                }
              }
            );

            // Calculate wait time based on rate limit error or default to 15 minutes
            const waitTimeMs = error.retryAfter ? error.retryAfter * 1000 : 15 * 60 * 1000; // 15 minutes default
            console.log(`Waiting ${Math.ceil(waitTimeMs / 1000)} seconds for rate limit reset...`);

            // Wait for rate limit reset
            await this.sleep(waitTimeMs);

            // After waiting, reset rate limit counters and resume sync
            console.log(`Rate limit reset period passed. Resuming sync from activity ${activityId}.`);

            // Update status back to syncing
            await this.syncMetadataCollection.updateOne(
              { type: 'strava_sync' },
              {
                $set: {
                  continuous_sync_status: 'syncing',
                  last_error: undefined,
                }
              }
            );

            // Don't remove the activity from the list - it will be retried in the next iteration
            // Continue the loop to retry this activity
            continue;

          } else {
            // Other error - log and remove from list
            console.error(`Failed to process activity ${activityId}:`, error);
            errors.push({ activityId: activityId, error: error instanceof Error ? error.message : String(error) });
            // Remove failed activity to avoid infinite loop
            activitiesToSync.shift();
          }
        }
      }

      // Mark continuous sync as completed
      await this.syncMetadataCollection.updateOne(
        { type: 'strava_sync' },
        {
          $set: {
            continuous_sync_status: 'completed',
            strava_sync_status: 'fully_synced',
            strava_last_sync_check: new Date(),
            'continuous_sync_progress.estimatedCompletion': new Date(),
            rate_limit_info: this.rateLimitManager.getRateLimitInfo(),
          }
        }
      );

      console.log(`Continuous sync completed: ${totalSynced} activities synced`);

      return {
        success: true,
        syncedCount: totalSynced,
        completed: true,
        errors
      };

    } catch (error) {
      console.error('Continuous sync failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.syncMetadataCollection.updateOne(
        { type: 'strava_sync' },
        {
          $set: {
            continuous_sync_status: 'error',
            last_error: {
              timestamp: new Date(),
              message: errorMessage,
            }
          }
        }
      );
      return {
        success: false,
        syncedCount: 0,
        completed: false,
        errors: [{ activityId: 0, error: errorMessage }]
      };
    }
  }
```

### Rate Limit Manager

```javascript
class RateLimitManager {
  constructor() {
    this.requestsThisWindow = 0;
    this.requestsToday = 0;
    this.currentWindow = this.getCurrentWindow();
    this.dailyResetTime = this.getNextDailyReset();
  }

  getCurrentWindow() {
    const now = new Date();
    const minutes = now.getMinutes();
    const windowStart = Math.floor(minutes / 15) * 15;
    now.setMinutes(windowStart, 0, 0);
    return now;
  }

  getNextWindowReset() {
    const now = new Date();
    const minutes = now.getMinutes();
    const nextWindow = (Math.floor(minutes / 15) + 1) * 15;

    if (nextWindow === 60) {
      now.setHours(now.getHours() + 1, 0, 0, 0);
    } else {
      now.setMinutes(nextWindow, 0, 0);
    }

    return now;
  }

  getNextDailyReset() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  async checkAndWait() {
    const now = new Date();

    // Check if we've entered a new 15-minute window
    if (now >= this.getNextWindowReset()) {
      this.requestsThisWindow = 0;
      this.currentWindow = this.getCurrentWindow();
    }

    // Check if we've entered a new day
    if (now >= this.dailyResetTime) {
      this.requestsToday = 0;
      this.dailyResetTime = this.getNextDailyReset();
    }

    // Check if we're approaching the 15-minute limit
    if (this.requestsThisWindow >= 95) {
      const waitTime = this.getNextWindowReset() - now;
      console.log(
        `Rate limit approaching. Waiting ${waitTime}ms until next window.`
      );
      await this.sleep(waitTime + 1000); // Add 1 second buffer
      this.requestsThisWindow = 0;
      this.currentWindow = this.getCurrentWindow();
    }

    // Check daily limit
    if (this.requestsToday >= 950) {
      const waitTime = this.dailyResetTime - now;
      console.log(
        `Daily limit approaching. Waiting ${waitTime}ms until tomorrow.`
      );
      await this.sleep(waitTime + 1000);
      this.requestsToday = 0;
      this.dailyResetTime = this.getNextDailyReset();
    }

    // Increment counters
    this.requestsThisWindow++;
    this.requestsToday++;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Method to pause sync strategically (2 minutes before reset)
  shouldPauseBeforeReset() {
    const now = new Date();
    const nextReset = this.getNextWindowReset();
    const timeUntilReset = nextReset - now;

    // Pause if less than 2 minutes until reset and we're near the limit
    return timeUntilReset < 120000 && this.requestsThisWindow >= 90;
  }
}
```

### Database Schema Updates

```javascript
// User sync status document
{
  userId: ObjectId,

  // Initial sync fields
  strava_sync_status: "not_started" | "initial_complete" | "fully_synced",
  strava_last_sync_check: Date,
  strava_newest_activity_date: Date,
  strava_oldest_activity_date: Date,
  total_activities_count: Number,
  has_older_activities: Boolean,

  // Continuous sync fields
  continuous_sync_status: "not_started" | "syncing" | "paused" | "completed" | "error",
  continuous_sync_started_at: Date,
  continuous_sync_progress: {
    totalActivitiesFound: Number,
    activitiesProcessed: Number,
    currentBatchStart: Date,
    estimatedCompletion: Date,
    lastProcessedActivityId: Number
  },

  // Rate limiting tracking
  rate_limit_info: {
    requestsThisWindow: Number,
    requestsToday: Number,
    currentWindowStart: Date,
    nextWindowReset: Date,
    lastRequestTime: Date
  },

  // Error tracking
  last_error: {
    timestamp: Date,
    message: String,
    activityId: Number
  }
}
```

## User Interface Components

### Continuous Sync Control Panel

```
┌─────────────────────────────────────────────┐
│  Historical Activity Sync                   │
├─────────────────────────────────────────────┤
│                                             │
│  Status: Syncing                            │
│  Started: 10 minutes ago                    │
│                                             │
│  Progress                                   │
│  [■■■■■■■■■░░░░░░░░░░░] 45%                 │
│                                             │
│  Activities: 450 / 1,000                    │
│  Oldest synced: March 15, 2021              │
│                                             │
│  Rate Limit Status                          │
│  This window: 87 / 100 requests             │
│  Resets in: 3 minutes                       │
│                                             │
│  Daily: 542 / 1,000 requests                │
│                                             │
│  [Pause Sync]  [Cancel]                     │
│                                             │
│  ℹ️  Sync runs in the background. You can   │
│     continue using the app.                 │
└─────────────────────────────────────────────┘
```

### Real-time Progress Updates

Use WebSocket or polling (every 5 seconds) to update progress:

```javascript
// Client-side polling
useEffect(() => {
  if (syncStatus === "syncing") {
    const interval = setInterval(async () => {
      const progress = await fetch("/api/sync/progress");
      setSyncProgress(progress);
    }, 5000);

    return () => clearInterval(interval);
  }
}, [syncStatus]);
```

## API Endpoints

### POST `/api/sync/start-continuous`

Start the continuous historical sync.

```javascript
Request: {
  userId: string
}

Response: {
  success: boolean,
  message: string,
  estimatedActivities: number,
  estimatedTimeMinutes: number
}
```

### GET `/api/sync/progress`

Get current sync progress.

```javascript
Response: {
  status: "syncing" | "paused" | "completed" | "error",
  progress: {
    totalActivitiesFound: number,
    activitiesProcessed: number,
    percentComplete: number,
    currentBatchStart: string,
    estimatedCompletion: string
  },
  rateLimit: {
    requestsThisWindow: number,
    requestsToday: number,
    nextReset: string
  }
}
```

### POST `/api/sync/pause`

Pause the continuous sync.

```javascript
Response: {
  success: boolean,
  pausedAt: string,
  canResume: boolean
}
```

### POST `/api/sync/resume`

Resume a paused sync.

```javascript
Response: {
  success: boolean,
  resumedFrom: string
}
```

### POST `/api/sync/cancel`

Cancel the sync entirely.

```javascript
Response: {
  success: boolean,
  activitiesSynced: number
}
```

## Background Job Implementation

Use a job queue (Bull, Agenda, or similar) to manage the sync process:

```javascript
// Queue definition
const syncQueue = new Queue("strava-sync", {
  redis: redisConfig,
});

// Job processor
syncQueue.process("continuous-sync", async (job) => {
  const { userId } = job.data;

  await continuousHistoricalSync(userId);

  // Update job progress
  job.progress(50);

  return { completed: true };
});

// Add job
await syncQueue.add(
  "continuous-sync",
  {
    userId: user.id,
  },
  {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 60000, // 1 minute
    },
  }
);
```

## Error Handling

### Recoverable Errors

- **Network timeout**: Retry with exponential backoff
- **Rate limit exceeded**: Wait for reset, then resume
- **Temporary Strava API error**: Retry up to 3 times

### Non-Recoverable Errors

- **Invalid OAuth token**: Stop sync, prompt user to reconnect
- **Activity not found (404)**: Skip activity, continue with others
- **Database connection lost**: Pause sync, attempt reconnection

### Error Recovery

```javascript
async function handleSyncError(error, context) {
  if (error.status === 401) {
    // Token expired
    updateSyncStatus(context.userId, "error");
    notifyUser(context.userId, "Please reconnect your Strava account");
    return "stop";
  }

  if (error.status === 429) {
    // Rate limit hit
    const resetTime = error.headers["x-ratelimit-reset"];
    await waitUntil(resetTime);
    return "retry";
  }

  if (error.status === 404) {
    // Activity not found, skip it
    logSkippedActivity(context.activityId);
    return "skip";
  }

  // Unknown error
  if (context.retryCount < 3) {
    return "retry";
  }

  return "fail";
}
```

## Performance Optimizations

1. **Batch Database Writes**: Save activities in batches of 10
2. **Connection Pooling**: Maintain persistent connections
3. **Parallel Processing**: Process multiple activities simultaneously (respecting rate limits)
4. **Incremental Progress Saves**: Save progress after each batch
5. **Resume from Last Position**: Allow sync to resume if interrupted

## Testing Scenarios

### Initial Sync Tests

- [ ] New user with 0 activities
- [ ] New user with exactly 30 activities
- [ ] New user with 150 activities (should show "more available")
- [ ] Initial sync failure recovery
- [ ] Network interruption during initial sync

### Continuous Sync Tests

- [ ] User with 100 total activities (small dataset)
- [ ] User with 5,000+ activities (large dataset)
- [ ] Sync interruption and resume
- [ ] Rate limit hit during sync
- [ ] Daily rate limit reached
- [ ] Sync across multiple 15-minute windows
- [ ] Pause and resume functionality
- [ ] Cancel mid-sync
- [ ] Deleted activities on Strava (404 errors)

## Success Criteria

- ✅ Initial sync completes in under 2 minutes for 30 activities
- ✅ Continuous sync respects all rate limits
- ✅ Sync can be paused and resumed without data loss
- ✅ Progress updates in real-time
- ✅ Graceful error handling and recovery
- ✅ No duplicate activities in database
- ✅ User can use app while sync runs in background
- ✅ Clear communication of sync status to user

## Monitoring & Logging

Track the following metrics:

- Average sync time per activity
- Rate limit usage patterns
- Error frequency and types
- Sync completion rates
- Database write performance
- API response times
- User sync status distribution
