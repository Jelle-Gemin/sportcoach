import { fetchActivities, fetchActivityDetail, fetchActivityStreams, fetchAllActivityIds, RateLimitError, StravaActivityDetail } from './stravaApi';
import { MongoClient, Db, Collection } from 'mongodb';



interface ActivityDocument {
  _id?: any;
  stravaId: number;
  name: string;
  date: Date;
  description?: string;
  type: string;
  distance?: number;
  total_elevation_gain?: number;
  averagePace?: string;
  maxPace?: string;
  movingTime: number;
  elapsedTime: number;
  avgCadence?: number;
  avgHR?: number;
  maxHR?: number;
  laps?: any[];
    map: {
    id: string;
    summary_polyline?: string;
    resource_state: number;
  };
  streams?: {
    time?: number[];
    distance?: number[];
    heartrate?: number[];
    pace?: number[];
    cadence?: number[];
    watts?: number[];
    altitude?: number[];
    latlng?: [number, number][];
  };
  fetchedAt: Date;
  lastUpdated: Date;
}

interface AthleteDocument {
  _id?: any;
  stravaId: number;
  username?: string;
  firstname?: string;
  lastname?: string;
  bio?: string;
  city?: string;
  state?: string;
  country?: string;
  sex?: string;
  premium: boolean;
  summit: boolean;
  created_at: Date;
  updated_at: Date;
  badge_type_id: number;
  weight?: number;
  profile_medium: string;
  profile: string;
  friend?: string;
  follower?: string;
  measurement_preference: string;
  ftp?: number;
  clubs?: any[];
  bikes?: any[];
  shoes?: any[];
  stats?: any;
  fetchedAt: Date;
  lastUpdated: Date;
}

interface SyncMetadataDocument {
  _id?: any;
  type: string;

  // Initial sync fields
  strava_sync_status: "not_started" | "initial_syncing" | "initial_complete" | "fully_synced" | "error";
  strava_last_sync_check: Date;
  strava_newest_activity_date?: Date;
  strava_oldest_activity_date?: Date;
  total_activities_count: number;
  has_older_activities: boolean;

  // Continuous sync fields
  continuous_sync_status: "not_started" | "syncing" | "paused" | "completed" | "error";
  continuous_sync_started_at?: Date;
  continuous_sync_progress?: {
    totalActivitiesFound: number;
    activitiesProcessed: number;
    currentBatchStart?: Date;
    estimatedCompletion?: Date;
    lastProcessedActivityId?: number;
  };

  // Rate limiting tracking
  rate_limit_info?: {
    requestsThisWindow: number;
    requestsToday: number;
    currentWindowStart: Date;
    nextWindowReset: Date;
    lastRequestTime: Date;
  };

  // Error tracking
  last_error?: {
    timestamp: Date;
    message: string;
    activityId?: number;
  };

  // Legacy fields (to be removed after migration)
  lastSyncDate?: Date;
  lastActivityId?: number;
  fetchedActivityIds?: number[];
  syncStatus?: string;
  errorMessage?: string;
  currentBeforeTimestamp?: number;
  currentAfterTimestamp?: number;
  stats?: {
    totalActivities: number;
    lastSyncCount: number;
    failedFetches: number;
  };
}

class RateLimitManager {
  private requestsThisWindow: number = 0;
  private requestsToday: number = 0;
  private currentWindowStart: Date;
  private nextWindowReset: Date;
  private dailyResetTime: Date;
  private readonly MAX_REQUESTS_PER_WINDOW = 95; // Safety buffer below 100
  private readonly MAX_REQUESTS_PER_DAY = 950; // Safety buffer below 1000

  constructor() {
    this.currentWindowStart = this.getCurrentWindowStart();
    this.nextWindowReset = this.getNextWindowReset();
    this.dailyResetTime = this.getNextDailyReset();
  }

  private getCurrentWindowStart(): Date {
    const now = new Date();
    const minutes = now.getMinutes();
    const windowStart = Math.floor(minutes / 15) * 15;
    now.setMinutes(windowStart, 0, 0);
    return now;
  }

  private getNextWindowReset(): Date {
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

  private getNextDailyReset(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  async checkAndWait(): Promise<void> {
    const now = new Date();

    // Check if we've entered a new 15-minute window
    if (now >= this.nextWindowReset) {
      this.requestsThisWindow = 0;
      this.currentWindowStart = this.getCurrentWindowStart();
      this.nextWindowReset = this.getNextWindowReset();
    }

    // Check if we've entered a new day
    if (now >= this.dailyResetTime) {
      this.requestsToday = 0;
      this.dailyResetTime = this.getNextDailyReset();
    }

    // Check if we're approaching the 15-minute limit
    if (this.requestsThisWindow >= this.MAX_REQUESTS_PER_WINDOW) {
      const waitTime = this.nextWindowReset.getTime() - now.getTime();
      console.log(`Rate limit approaching. Waiting ${waitTime}ms until next window.`);
      await this.sleep(waitTime + 1000); // Add 1 second buffer
      this.requestsThisWindow = 0;
      this.currentWindowStart = this.getCurrentWindowStart();
      this.nextWindowReset = this.getNextWindowReset();
    }

    // Check daily limit
    if (this.requestsToday >= this.MAX_REQUESTS_PER_DAY) {
      const waitTime = this.dailyResetTime.getTime() - now.getTime();
      console.log(`Daily limit approaching. Waiting ${waitTime}ms until tomorrow.`);
      await this.sleep(waitTime + 1000);
      this.requestsToday = 0;
      this.dailyResetTime = this.getNextDailyReset();
    }

    // Increment counters
    this.requestsThisWindow++;
    this.requestsToday++;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getRateLimitInfo() {
    return {
      requestsThisWindow: this.requestsThisWindow,
      requestsToday: this.requestsToday,
      currentWindowStart: this.currentWindowStart,
      nextWindowReset: this.nextWindowReset,
      lastRequestTime: new Date(),
    };
  }

  shouldPauseBeforeReset(): boolean {
    const now = new Date();
    const timeUntilReset = this.nextWindowReset.getTime() - now.getTime();
    // Pause if less than 2 minutes until reset and we're near the limit
    return timeUntilReset < 120000 && this.requestsThisWindow >= 90;
  }
}

export class StravaSync {
  private client: MongoClient;
  private db: Db;
  private activitiesCollection: Collection<ActivityDocument>;
  private athletesCollection: Collection<AthleteDocument>;
  private syncMetadataCollection: Collection<SyncMetadataDocument>;
  private rateLimitManager: RateLimitManager;
  private lastApiCall: number = 0;
  private readonly minDelayMs: number = 1000; // 1 second between API calls

  constructor(mongoUri: string, dbName: string) {
    this.client = new MongoClient(mongoUri);
    this.db = this.client.db(dbName);
    this.activitiesCollection = this.db.collection('activities');
    this.athletesCollection = this.db.collection('athletes');
    this.syncMetadataCollection = this.db.collection('sync_metadata');
    this.rateLimitManager = new RateLimitManager();
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  async initializeIndexes(): Promise<void> {
    await this.activitiesCollection.createIndex({ stravaId: 1 }, { unique: true });
    await this.activitiesCollection.createIndex({ date: -1 });
    await this.activitiesCollection.createIndex({ type: 1 });
    await this.athletesCollection.createIndex({ stravaId: 1 }, { unique: true });
    await this.syncMetadataCollection.createIndex({ type: 1 }, { unique: true });
  }

  async initialSync(accessToken: string): Promise<{
    success: boolean;
    syncedCount: number;
    hasOlderActivities: boolean;
    errors: Array<{ activityId: number; error: string }>;
  }> {
    try {
      console.log('Starting initial sync (30 most recent activities)');

      // Get sync metadata
      let metadata: SyncMetadataDocument | null = await this.syncMetadataCollection.findOne({ type: 'strava_sync' });
      if (!metadata) {
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
      }

      // Check if initial sync already completed
      if (metadata.strava_sync_status === 'initial_complete' || metadata.strava_sync_status === 'fully_synced') {
        console.log('Initial sync already completed');
        return {
          success: true,
          syncedCount: metadata.total_activities_count,
          hasOlderActivities: metadata.has_older_activities || false,
          errors: []
        };
      }

      // Update status to initial sync in progress
      await this.syncMetadataCollection.updateOne(
        { type: 'strava_sync' },
        { $set: { strava_sync_status: 'initial_syncing', last_error: undefined } }
      );

      let syncedCount = 0;
      const errors: Array<{ activityId: number; error: string }> = [];

      // Step 1: Fetch 30 most recent activities (summary data)
      await this.rateLimitManager.checkAndWait();
      const activities = await fetchActivities(accessToken, 1, 30);

      if (activities.length === 0) {
        // No activities found
        await this.syncMetadataCollection.updateOne(
          { type: 'strava_sync' },
          {
            $set: {
              strava_sync_status: 'initial_complete',
              strava_last_sync_check: new Date(),
              total_activities_count: 0,
              has_older_activities: false,
            }
          }
        );
        return { success: true, syncedCount: 0, hasOlderActivities: false, errors: [] };
      }

      // Step 2: For each activity, fetch details and streams
      for (const activity of activities) {
        try {
          // Fetch detailed activity data
          await this.rateLimitManager.checkAndWait();
          const activityDetail = await fetchActivityDetail(accessToken, activity.id);

          // Fetch streams data
          await this.rateLimitManager.checkAndWait();
          const streams = await fetchActivityStreams(accessToken, activity.id, ['time', 'distance', 'heartrate', 'cadence', 'watts', 'altitude', 'latlng']);

          const activityDoc = this.mapStravaToMongo(activityDetail, streams);

          await this.activitiesCollection.updateOne(
            { stravaId: activity.id },
            { $set: activityDoc },
            { upsert: true }
          );

          syncedCount++;

        } catch (error) {
          console.error(`Failed to process activity ${activity.id}:`, error);
          errors.push({ activityId: activity.id, error: error instanceof Error ? error.message : String(error) });
        }
      }

      // Check if there are older activities
      let hasOlderActivities = false;
      if (activities.length === 30) {
        try {
          await this.rateLimitManager.checkAndWait();
          const checkOlder = await fetchActivities(accessToken, 1, 1, undefined, Math.floor(new Date(activities[activities.length - 1].start_date).getTime() / 1000) - 1);
          hasOlderActivities = checkOlder.length > 0;
        } catch (error) {
          console.warn('Could not check for older activities:', error);
          hasOlderActivities = false; // Assume no older activities if check fails
        }
      }

      // Update metadata
      const newestActivity = activities[0];
      const oldestActivity = activities[activities.length - 1];

      await this.syncMetadataCollection.updateOne(
        { type: 'strava_sync' },
        {
          $set: {
            strava_sync_status: 'initial_complete',
            strava_last_sync_check: new Date(),
            strava_newest_activity_date: new Date(newestActivity.start_date),
            strava_oldest_activity_date: new Date(oldestActivity.start_date),
            total_activities_count: syncedCount,
            has_older_activities: hasOlderActivities,
            rate_limit_info: this.rateLimitManager.getRateLimitInfo(),
          }
        }
      );

      console.log(`Initial sync completed: ${syncedCount} activities synced, has older: ${hasOlderActivities}`);

      return {
        success: true,
        syncedCount,
        hasOlderActivities,
        errors
      };

    } catch (error) {
      console.error('Initial sync failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.syncMetadataCollection.updateOne(
        { type: 'strava_sync' },
        {
          $set: {
            strava_sync_status: 'error',
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
        hasOlderActivities: false,
        errors: [{ activityId: 0, error: errorMessage }]
      };
    }
  }

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

  async syncActivities(accessToken: string): Promise<{
    success: boolean;
    syncedCount: number;
    skippedCount: number;
    newActivities: number;
    errors: Array<{ activityId: number; error: string }>;
    completed: boolean;
  }> {
    try {
      // Get sync metadata
      let metadata: SyncMetadataDocument | null = await this.syncMetadataCollection.findOne({ type: 'strava_sync' });
      if (!metadata) {
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
          // Legacy fields
          lastSyncDate: new Date(0),
          lastActivityId: 0,
          fetchedActivityIds: [],
          syncStatus: 'idle',
          stats: {
            totalActivities: 0,
            lastSyncCount: 0,
            failedFetches: 0,
          },
        };
      }

      // Update status to in_progress
      await this.syncMetadataCollection.updateOne(
        { type: 'strava_sync' },
        { $set: { syncStatus: 'in_progress', errorMessage: undefined } }
      );

      let syncedCount = 0;
      let skippedCount = 0;
      let newActivities = 0;
      const errors: Array<{ activityId: number; error: string }> = [];

      // Always perform backward sync starting from the oldest activity in the database
      let currentBefore: number | undefined;

      if (metadata.currentBeforeTimestamp) {
        // Resume from where we left off due to rate limit
        currentBefore = metadata.currentBeforeTimestamp;
        console.log(`Resuming backward sync from timestamp: ${currentBefore}`);
      } else {
        // Start from oldest activity in database to fetch activities before it
        const oldestActivity = await this.activitiesCollection.findOne({}, { sort: { date: 1 } });
        if (oldestActivity) {
          currentBefore = Math.floor(oldestActivity.date.getTime() / 1000);
          console.log(`Starting backward sync from oldest activity: ${oldestActivity.date.toISOString()}`);
        } else {
          // No activities in DB, start from current time and work backwards
          currentBefore = Math.floor(Date.now() / 1000);
          console.log('No activities in DB, starting backward sync from current time');
        }
      }

      const batchSize = 10;
      let hasMoreActivities = true;
      let rateLimitHit = false;

      while (hasMoreActivities && !rateLimitHit) {
        try {
          // Fetch activities before current timestamp (backward in time)
          const activities: any[] = await fetchActivities(accessToken, 1, 30, undefined, currentBefore);

          if (activities.length === 0) {
            hasMoreActivities = false;
            break;
          }

          // Process activities in batches
          for (let i = 0; i < activities.length; i += batchSize) {
            const batch = activities.slice(i, i + batchSize);

            const batchPromises = batch.map(async (activity) => {
              try {
                const shouldFetch = await this.shouldFetchActivity(activity.id);
                if (!shouldFetch) {
                  skippedCount++;
                  return;
                }

                const activityDetail = await fetchActivityDetail(accessToken, activity.id);

                // Skip stream fetching to minimize API calls - streams can be fetched on-demand if needed
                const streams: any = {};

                const activityDoc = this.mapStravaToMongo(activityDetail, streams);

                await this.activitiesCollection.updateOne(
                  { stravaId: activity.id },
                  { $set: activityDoc },
                  { upsert: true }
                );

                syncedCount++;
                newActivities++;

                // Update fetchedActivityIds
                await this.syncMetadataCollection.updateOne(
                  { type: 'strava_sync' },
                  { $addToSet: { fetchedActivityIds: activity.id } }
                );

              } catch (error) {
                console.error(`Failed to process activity ${activity.id}:`, error);
                errors.push({ activityId: activity.id, error: error instanceof Error ? error.message : String(error) });
              }
            });

            await Promise.all(batchPromises);

            // Update current position for rate limit recovery
            const lastActivity = batch[batch.length - 1];
            currentBefore = Math.floor(new Date(lastActivity.start_date).getTime() / 1000);

            // Save current position
            await this.syncMetadataCollection.updateOne(
              { type: 'strava_sync' },
              { $set: { currentBeforeTimestamp: currentBefore } }
            );
          }

          // Move to next batch of activities (backward in time)
          const lastActivity = activities[activities.length - 1];
          currentBefore = Math.floor(new Date(lastActivity.start_date).getTime() / 1000) - 1; // -1 to avoid duplicates

        } catch (error) {
          if (error instanceof RateLimitError) {
            console.log('Rate limit hit, jumping back 50 days to continue backward sync');
            // Jump back 50 days (50 * 24 * 60 * 60 seconds)
            currentBefore = currentBefore! - (50 * 24 * 60 * 60);
            rateLimitHit = true;

            // Save the new position for resumption
            await this.syncMetadataCollection.updateOne(
              { type: 'strava_sync' },
              { $set: { currentBeforeTimestamp: currentBefore } }
            );
          } else {
            throw error;
          }
        }
      }

      // Update sync metadata
      const newLastSyncDate = new Date();
      await this.syncMetadataCollection.updateOne(
        { type: 'strava_sync' },
        {
          $set: {
            lastSyncDate: newLastSyncDate,
            syncStatus: rateLimitHit ? 'rate_limited' : 'idle',
            currentBeforeTimestamp: rateLimitHit ? currentBefore : undefined,
            currentAfterTimestamp: undefined, // No longer used for backward sync
            stats: {
              totalActivities: await this.activitiesCollection.countDocuments(),
              lastSyncCount: syncedCount,
              failedFetches: errors.length,
            },
          },
        }
      );

      return {
        success: !rateLimitHit,
        syncedCount,
        skippedCount,
        newActivities,
        errors,
        completed: !hasMoreActivities,
      };

    } catch (error) {
      console.error('Sync failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.syncMetadataCollection.updateOne(
        { type: 'strava_sync' },
        { $set: { syncStatus: 'error', errorMessage } }
      );
      return {
        success: false,
        syncedCount: 0,
        skippedCount: 0,
        newActivities: 0,
        errors: [{ activityId: 0, error: errorMessage }],
        completed: false,
      };
    }
  }

  private async shouldFetchActivity(activityId: number): Promise<boolean> {
    // Check if activity exists in database - if it does, don't refetch to maximize DB usage
    const existing = await this.activitiesCollection.findOne({ stravaId: activityId });
    if (existing) {
      return false; // Activity already exists in DB, no need to refetch
    }

    // Check if previously fetched successfully (fallback check)
    const metadata = await this.syncMetadataCollection.findOne({ type: 'strava_sync' });
    if (metadata?.fetchedActivityIds?.includes(activityId)) {
      return false; // Previously fetched successfully
    }

    return true; // Activity not in DB, need to fetch
  }

  private async rateLimitDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;
    if (timeSinceLastCall < this.minDelayMs) {
      const delay = this.minDelayMs - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    this.lastApiCall = Date.now();
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    await this.rateLimitDelay();
    return fn();
  }

  private mapStravaToMongo(stravaActivity: StravaActivityDetail, streams: any): ActivityDocument {
    return {
      stravaId: stravaActivity.id,
      name: stravaActivity.name,
      date: new Date(stravaActivity.start_date_local),
      description: stravaActivity.description || stravaActivity.name,
      type: stravaActivity.type,
      distance: stravaActivity.distance,
      total_elevation_gain: stravaActivity.total_elevation_gain,
      averagePace: this.calculatePace(stravaActivity.average_speed),
      maxPace: this.calculatePace(stravaActivity.max_speed),
      movingTime: stravaActivity.moving_time,
      elapsedTime: stravaActivity.elapsed_time,
      avgCadence: stravaActivity.average_cadence,
      avgHR: stravaActivity.average_heartrate,
      maxHR: stravaActivity.max_heartrate,
      laps: stravaActivity.laps || [],
      streams,
      map: stravaActivity.map,
      fetchedAt: new Date(),
      lastUpdated: new Date(),
    };
  }

  private calculatePace(speedMps: number): string {
    if (!speedMps || speedMps === 0) return '00:00';

    // Convert m/s to min/km
    const paceMinKm = 1000 / (speedMps * 60);
    const minutes = Math.floor(paceMinKm);
    const seconds = Math.round((paceMinKm - minutes) * 60);

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  async getActivities(limit: number = 50, offset: number = 0, type?: string, startDate?: Date, endDate?: Date): Promise<{
    activities: ActivityDocument[];
    total: number;
    hasMore: boolean;
  }> {
    const query: any = {};
    if (type) query.type = type;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const total = await this.activitiesCollection.countDocuments(query);
    const activities = await this.activitiesCollection
      .find(query)
      .sort({ date: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    return {
      activities,
      total,
      hasMore: offset + limit < total,
    };
  }

  async getActivity(stravaId: number): Promise<ActivityDocument | null> {
    return await this.activitiesCollection.findOne({ stravaId });
  }

  async getSyncStatus(): Promise<{
    lastSync: Date;
    status: string;
    totalCached: number;
    fetchedActivityIds: number[];
  } | null> {
    const metadata = await this.syncMetadataCollection.findOne({ type: 'strava_sync' });
    if (!metadata) return null;

    const totalCached = await this.activitiesCollection.countDocuments();

    return {
      lastSync: metadata.lastSyncDate || new Date(0),
      status: metadata.syncStatus || 'idle',
      totalCached,
      fetchedActivityIds: metadata.fetchedActivityIds || [],
    };
  }

  async getSyncMetadata(): Promise<SyncMetadataDocument | null> {
    return await this.syncMetadataCollection.findOne({ type: 'strava_sync' });
  }

  async saveAthlete(stravaAthlete: any): Promise<void> {
    const athleteDoc: AthleteDocument = {
      stravaId: stravaAthlete.id,
      username: stravaAthlete.username,
      firstname: stravaAthlete.firstname,
      lastname: stravaAthlete.lastname,
      bio: stravaAthlete.bio,
      city: stravaAthlete.city,
      state: stravaAthlete.state,
      country: stravaAthlete.country,
      sex: stravaAthlete.sex,
      premium: stravaAthlete.premium,
      summit: stravaAthlete.summit,
      created_at: new Date(stravaAthlete.created_at),
      updated_at: new Date(stravaAthlete.updated_at),
      badge_type_id: stravaAthlete.badge_type_id,
      weight: stravaAthlete.weight,
      profile_medium: stravaAthlete.profile_medium,
      profile: stravaAthlete.profile,
      friend: stravaAthlete.friend,
      follower: stravaAthlete.follower,
      measurement_preference: stravaAthlete.measurement_preference,
      ftp: stravaAthlete.ftp,
      clubs: stravaAthlete.clubs || [],
      bikes: stravaAthlete.bikes || [],
      shoes: stravaAthlete.shoes || [],
      stats: stravaAthlete.stats,
      fetchedAt: new Date(),
      lastUpdated: new Date(),
    };

    await this.athletesCollection.updateOne(
      { stravaId: stravaAthlete.id },
      { $set: athleteDoc },
      { upsert: true }
    );
  }

  async getAthlete(stravaId: number): Promise<AthleteDocument | null> {
    return await this.athletesCollection.findOne({ stravaId });
  }

  async getAthleteWithStats(stravaId: number): Promise<{ athlete: AthleteDocument; stats: any } | null> {
    const athlete = await this.getAthlete(stravaId);
    if (!athlete) return null;

    // Get athlete stats from Strava API (since stats are not stored in DB)
    // This would need to be implemented if we want to cache stats too
    // For now, we'll return the athlete and indicate stats need to be fetched separately

    return { athlete, stats: null };
  }

  async pauseContinuousSync(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const metadata = await this.syncMetadataCollection.findOne({ type: 'strava_sync' });
      if (!metadata) {
        return { success: false, message: 'No sync metadata found' };
      }

      if (metadata.continuous_sync_status !== 'syncing') {
        return { success: false, message: 'Continuous sync is not currently running' };
      }

      await this.syncMetadataCollection.updateOne(
        { type: 'strava_sync' },
        { $set: { continuous_sync_status: 'paused' } }
      );

      return { success: true, message: 'Continuous sync paused successfully' };
    } catch (error) {
      console.error('Error pausing sync:', error);
      return { success: false, message: 'Failed to pause sync' };
    }
  }

  async resumeContinuousSync(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const metadata = await this.syncMetadataCollection.findOne({ type: 'strava_sync' });
      if (!metadata) {
        return { success: false, message: 'No sync metadata found' };
      }

      if (metadata.continuous_sync_status !== 'paused') {
        return { success: false, message: 'Continuous sync is not currently paused' };
      }

      await this.syncMetadataCollection.updateOne(
        { type: 'strava_sync' },
        { $set: { continuous_sync_status: 'syncing' } }
      );

      return { success: true, message: 'Continuous sync resumed successfully' };
    } catch (error) {
      console.error('Error resuming sync:', error);
      return { success: false, message: 'Failed to resume sync' };
    }
  }

  async cancelContinuousSync(): Promise<{
    success: boolean;
    message: string;
    activitiesSynced: number;
  }> {
    try {
      const metadata = await this.syncMetadataCollection.findOne({ type: 'strava_sync' });
      if (!metadata) {
        return { success: false, message: 'No sync metadata found', activitiesSynced: 0 };
      }

      const activitiesSynced = metadata.continuous_sync_progress?.activitiesProcessed || 0;

      await this.syncMetadataCollection.updateOne(
        { type: 'strava_sync' },
        {
          $set: {
            continuous_sync_status: 'not_started',
            continuous_sync_started_at: undefined,
            continuous_sync_progress: undefined,
            last_error: undefined
          }
        }
      );

      return {
        success: true,
        message: 'Continuous sync cancelled successfully',
        activitiesSynced
      };
    } catch (error) {
      console.error('Error cancelling sync:', error);
      return { success: false, message: 'Failed to cancel sync', activitiesSynced: 0 };
    }
  }
}
