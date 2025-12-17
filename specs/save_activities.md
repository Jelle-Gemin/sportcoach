# Strava Activities to MongoDB - Technical Specification

## Overview

A system to fetch detailed Strava activity data and persist it to MongoDB with intelligent caching to avoid redundant API calls.

## Data Models

### MongoDB Collection: `activities`

```javascript
{
  _id: ObjectId,
  stravaId: Number,          // Unique Strava activity ID (indexed)
  date: Date,                // Activity date
  description: String,       // Activity description
  type: String,              // Activity type (Run, VirtualRide, etc.)
  averagePace: String,       // Average pace (mm:ss/km)
  maxPace: String,           // Max pace (mm:ss/km)
  movingTime: Number,        // Moving time in seconds
  elapsedTime: Number,       // Elapsed time in seconds
  avgCadence: Number,        // Average cadence
  avgHR: Number,             // Average heart rate
  maxHR: Number,             // Max heart rate
  laps: [{
    distance: Number,
    elapsedTime: Number,
    averageSpeed: String,
    averageHeartrate: Number,
    averageWatts: Number,
    averageCadence: Number,
    maxHeartrate: Number
  }],
  streams: {
    time: [Number],          // Time series data (seconds)
    distance: [Number],      // Distance series data (meters)
    heartrate: [Number],     // Heart rate series data (bpm)
    pace: [Number],          // Pace series data (seconds per km)
    cadence: [Number],       // Cadence series data (rpm)
    watts: [Number],         // Power series data (watts)
    altitude: [Number],      // Altitude series data (meters)
    latlng: [[Number, Number]] // GPS coordinates [[lat, lng], ...]
  },
  fetchedAt: Date,           // When this detailed data was fetched
  lastUpdated: Date          // Last time this record was updated
}
```

### MongoDB Collection: `sync_metadata`

```javascript
{
  _id: ObjectId,
  type: String,              // "strava_sync"
  lastSyncDate: Date,        // Last successful sync timestamp
  lastActivityId: Number,    // Last processed activity ID
  fetchedActivityIds: [Number], // Array of activity IDs with fetched details
  syncStatus: String,        // "idle", "in_progress", "error"
  errorMessage: String,      // Last error if any
  stats: {
    totalActivities: Number,
    lastSyncCount: Number,
    failedFetches: Number
  }
}
```

## Core Features

### 1. Initial Sync Strategy

```
On first run:
1. Fetch list of all activities from Strava API (summary data only)
2. For each activity:
   - Check if activity exists in MongoDB by stravaId
   - If not exists, fetch detailed data and insert
   - If exists, skip (already cached)
3. Update sync_metadata with completion status
```

### 2. Incremental Sync Strategy

```
On subsequent runs:
1. Get lastSyncDate from sync_metadata
2. Fetch only activities after lastSyncDate (Strava API supports after parameter)
3. For new activities only:
   - Fetch detailed data
   - Insert into MongoDB
4. Update sync_metadata with new lastSyncDate
```

### 3. Caching Logic

**Fetch Decision Tree:**

```
For each activity ID:
├─ Is stravaId in activities collection?
│  ├─ YES → Skip fetch, use cached data
│  └─ NO → Is stravaId in sync_metadata.fetchedActivityIds?
│     ├─ YES → Previous fetch failed, decide: retry or skip
│     └─ NO → Fetch details from API and cache
```

**Cache Invalidation:**

- Activities older than 24 hours are considered immutable (Strava edits are rare)
- Recent activities (< 24 hours) can be refetched if needed
- Manual refresh option to force refetch specific activities

## API Endpoints Design

### `/api/sync/activities`

**POST** - Trigger sync process

```javascript
Request: {
  mode: "full" | "incremental" | "since",
  sinceDate?: Date,  // For "since" mode
  forceRefresh?: boolean  // Ignore cache
}

Response: {
  success: boolean,
  syncedCount: number,
  skippedCount: number,
  newActivities: number,
  errors: Array<{activityId: number, error: string}>
}
```

### `/api/activities`

**GET** - Retrieve activities from MongoDB

```javascript
Query params:
  - limit: number (default 50)
  - offset: number (default 0)
  - type: string (filter by activity type)
  - startDate: Date
  - endDate: Date

Response: {
  activities: Activity[],
  total: number,
  hasMore: boolean
}
```

### `/api/activities/:stravaId`

**GET** - Get single activity

```javascript
Response: Activity | null;
```

### `/api/sync/status`

**GET** - Get sync status

```javascript
Response: {
  lastSync: Date,
  status: string,
  totalCached: number,
  fetchedActivityIds: number[]
}
```

## Implementation Flow

### Sync Service (`services/stravaSync.js`)

```javascript
class StravaSync {
  async syncActivities(mode = "incremental") {
    // 1. Get sync metadata
    // 2. Determine which activities need fetching
    // 3. Batch fetch details (respect rate limits)
    // 4. Save to MongoDB
    // 5. Update sync metadata
  }

  async fetchActivityDetails(activityId) {
    // Check cache first
    // If not cached, call Strava API
    // Handle rate limiting with exponential backoff
  }

  async shouldFetchActivity(activityId) {
    // Check MongoDB for existing record
    // Check age of cached data
    // Return boolean
  }
}
```

### Database Indexes

```javascript
// activities collection
db.activities.createIndex({ stravaId: 1 }, { unique: true });
db.activities.createIndex({ date: -1 });
db.activities.createIndex({ type: 1 });

// sync_metadata collection
db.sync_metadata.createIndex({ type: 1 }, { unique: true });
```

## Rate Limiting Strategy

Strava API limits:

- 100 requests per 15 minutes
- 1000 requests per day

**Implementation:**

```javascript
const rateLimiter = {
  requests15min: 0,
  requestsDaily: 0,
  resetTime15min: null,
  resetTimeDaily: null,

  async checkLimit() {
    // Wait if approaching limits
    // Use 90 per 15min and 900 daily as safety buffer
  },
};
```

## Error Handling

1. **Network Errors**: Retry with exponential backoff (3 attempts)
2. **Rate Limit Errors**: Wait until reset time
3. **Invalid Activity**: Mark in sync_metadata, don't retry
4. **Database Errors**: Log and continue with next activity

## Configuration

```javascript
const config = {
  strava: {
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    refreshToken: process.env.STRAVA_REFRESH_TOKEN,
  },
  mongodb: {
    uri: process.env.MONGODB_URI,
    dbName: "strava_data",
  },
  sync: {
    batchSize: 10, // Fetch 10 activities at a time
    maxRetries: 3,
    retryDelay: 1000, // ms
    autoSyncInterval: 3600000, // 1 hour
  },
};
```

## Startup Behavior

```javascript
On app startup:
1. Check sync_metadata for last sync status
2. If last sync was > 1 hour ago:
   - Trigger incremental sync in background
3. If syncStatus === "in_progress":
   - Check if process crashed, reset status
4. Load activities from MongoDB for UI display
   - Don't wait for sync to complete
```

## Data Mapping

Transform Strava API response to MongoDB schema:

```javascript
function mapStravaToMongo(stravaActivity, streams = {}) {
  return {
    stravaId: stravaActivity.id,
    date: new Date(stravaActivity.start_date_local),
    description: stravaActivity.description || stravaActivity.name,
    type: stravaActivity.type,
    averagePace: calculatePace(stravaActivity.average_speed),
    maxPace: calculatePace(stravaActivity.max_speed),
    movingTime: stravaActivity.moving_time,
    elapsedTime: stravaActivity.elapsed_time,
    avgCadence: stravaActivity.average_cadence,
    avgHR: stravaActivity.average_heartrate,
    maxHR: stravaActivity.max_heartrate,
    laps: stravaActivity.laps || [],
    streams: {
      time: streams.time?.data || [],
      distance: streams.distance?.data || [],
      heartrate: streams.heartrate?.data || [],
      pace: streams.pace?.data || [],
      cadence: streams.cadence?.data || [],
      watts: streams.watts?.data || [],
      altitude: streams.altitude?.data || [],
      latlng: streams.latlng?.data || [],
    },
    fetchedAt: new Date(),
    lastUpdated: new Date(),
  };
}

function calculatePace(speedMps) {
  if (!speedMps || speedMps === 0) return "00:00";

  // Convert m/s to min/km
  const paceMinKm = 1000 / (speedMps * 60);
  const minutes = Math.floor(paceMinKm);
  const seconds = Math.round((paceMinKm - minutes) * 60);

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}
```

## Testing Strategy

1. **Unit Tests**: Test caching logic, data mapping
2. **Integration Tests**: Test MongoDB operations
3. **E2E Tests**: Test full sync flow with mock Strava API
4. **Load Tests**: Simulate syncing 1000+ activities

## Performance Optimizations

1. Use MongoDB bulk operations for inserts
2. Implement connection pooling
3. Cache Strava OAuth tokens in memory
4. Use indexes for fast lookups
5. Implement background job queue for large syncs

## Monitoring & Logging

Log the following:

- Sync start/completion times
- Number of activities processed
- API errors and retries
- Cache hit/miss ratio
- Database operation times
