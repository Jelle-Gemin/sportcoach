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
2. Get oldest activity timestamp from database
3. Query Strava for ALL activities before that timestamp
4. Process activities in batches, respecting rate limits
5. For each activity:
   â†' Fetch detailed activity data
   â†' Fetch streams data
   â†' Save to database
6. Check if more activities exist
7. If yes, repeat from step 3
8. If no, mark as fully_synced
```

### Detailed Algorithm

```javascript
async function continuousHistoricalSync(userId) {
  updateSyncStatus(userId, "syncing");

  try {
    while (true) {
      // 1. Get oldest activity in database
      const oldestActivity = await getOldestLocalActivity(userId);

      if (!oldestActivity) {
        // No activities in database - should not happen after initial sync
        throw new Error("No activities found for continuous sync");
      }

      const beforeTimestamp = oldestActivity.date.getTime() / 1000; // Unix timestamp

      // 2. Fetch ALL activities older than oldest local activity
      const olderActivities = await fetchAllActivitiesBeforeTimestamp(
        beforeTimestamp,
        userId
      );

      if (olderActivities.length === 0) {
        // No more older activities exist on Strava
        updateSyncStatus(userId, "fully_synced");
        break;
      }

      // 3. Process activities in batches
      await processBatchWithRateLimits(olderActivities, userId);

      // 4. Update progress
      await updateSyncProgress(userId, olderActivities.length);
    }

    // Final status update
    updateLastSyncCheck(userId, new Date());
  } catch (error) {
    updateSyncStatus(userId, "error");
    logError(userId, error);
  }
}
```

### Fetching All Activities Before Timestamp

```javascript
async function fetchAllActivitiesBeforeTimestamp(beforeTimestamp, userId) {
  const allActivities = [];
  let page = 1;
  const perPage = 200; // Strava max

  while (true) {
    // Check rate limit before request
    await checkAndWaitForRateLimit();

    const activities = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?before=${beforeTimestamp}&per_page=${perPage}&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (activities.length === 0) {
      break; // No more activities
    }

    allActivities.push(...activities);

    if (activities.length < perPage) {
      break; // Last page
    }

    page++;
  }

  return allActivities;
}
```

### Batch Processing with Rate Limits

```javascript
async function processBatchWithRateLimits(activities, userId) {
  const BATCH_SIZE = 10; // Process 10 activities at a time
  const MAX_REQUESTS_PER_WINDOW = 95; // Safety buffer

  for (let i = 0; i < activities.length; i += BATCH_SIZE) {
    const batch = activities.slice(i, i + BATCH_SIZE);

    for (const activity of batch) {
      // Check if we need to wait for rate limit reset
      await checkAndWaitForRateLimit();

      // Fetch detailed activity
      const details = await fetchActivityDetails(activity.id);

      await checkAndWaitForRateLimit();

      // Fetch streams
      const streams = await fetchActivityStreams(activity.id);

      // Save to database
      await saveActivityToDatabase(userId, details, streams);

      // Update progress in real-time
      await updateProgressUI(userId, {
        processed: i + batch.indexOf(activity) + 1,
        total: activities.length,
      });
    }
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
