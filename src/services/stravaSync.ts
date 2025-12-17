import { fetchActivities, fetchActivityDetail, fetchActivityStreams, RateLimitError, StravaActivityDetail } from './stravaApi';
import { MongoClient, Db, Collection } from 'mongodb';

interface ActivityDocument {
  _id?: any;
  stravaId: number;
  date: Date;
  description?: string;
  type: string;
  averagePace?: string;
  maxPace?: string;
  movingTime: number;
  elapsedTime: number;
  avgCadence?: number;
  avgHR?: number;
  maxHR?: number;
  laps?: any[];
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
  lastSyncDate: Date;
  lastActivityId: number;
  fetchedActivityIds: number[];
  syncStatus: string;
  errorMessage?: string;
  currentBeforeTimestamp?: number; // Current sync position for rate limit recovery (backward sync)
  currentAfterTimestamp?: number; // Current sync position for continuous forward sync
  stats: {
    totalActivities: number;
    lastSyncCount: number;
    failedFetches: number;
  };
}

export class StravaSync {
  private client: MongoClient;
  private db: Db;
  private activitiesCollection: Collection<ActivityDocument>;
  private athletesCollection: Collection<AthleteDocument>;
  private syncMetadataCollection: Collection<SyncMetadataDocument>;
  private lastApiCall: number = 0;
  private readonly minDelayMs: number = 1000; // 1 second between API calls

  constructor(mongoUri: string, dbName: string) {
    this.client = new MongoClient(mongoUri);
    this.db = this.client.db(dbName);
    this.activitiesCollection = this.db.collection('activities');
    this.athletesCollection = this.db.collection('athletes');
    this.syncMetadataCollection = this.db.collection('sync_metadata');
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
          lastSyncDate: new Date(0),
          lastActivityId: 0,
          fetchedActivityIds: [],
          syncStatus: 'idle',
          stats: {
            totalActivities: 0,
            lastSyncCount: 0,
            failedFetches: 0,
          },
        } as SyncMetadataDocument;
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
          const activities = await fetchActivities(accessToken, 1, 30, undefined, currentBefore);

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
    if (metadata?.fetchedActivityIds.includes(activityId)) {
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

  private async fetchWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    await this.rateLimitDelay();
    return fn();
  }

  private mapStravaToMongo(stravaActivity: StravaActivityDetail, streams: any): ActivityDocument {
    return {
      stravaId: stravaActivity.id,
      date: new Date(stravaActivity.start_date_local),
      description: stravaActivity.description || stravaActivity.name,
      type: stravaActivity.type,
      averagePace: this.calculatePace(stravaActivity.average_speed),
      maxPace: this.calculatePace(stravaActivity.max_speed),
      movingTime: stravaActivity.moving_time,
      elapsedTime: stravaActivity.elapsed_time,
      avgCadence: stravaActivity.average_cadence,
      avgHR: stravaActivity.average_heartrate,
      maxHR: stravaActivity.max_heartrate,
      laps: stravaActivity.laps || [],
      streams,
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
      lastSync: metadata.lastSyncDate,
      status: metadata.syncStatus,
      totalCached,
      fetchedActivityIds: metadata.fetchedActivityIds,
    };
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
}
