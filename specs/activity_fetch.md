# Strava Activities & Webhooks Specification

## Overview

This document specifies how to fetch Strava activities and implement webhook subscriptions to receive real-time notifications when athletes upload new activities. This enables the app to display the latest activities immediately without polling.

## Architecture Overview

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Strava     │ ──────> │   Backend    │ ──────> │   Database   │
│     API      │ Webhook │   Server     │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
                                │                         │
                                │                         │
                                └────────> WebSocket ─────┘
                                          Real-time          │
                                          Updates            │
                                                            ▼
                                                   ┌──────────────┐
                                                   │   Frontend   │
                                                   │   React App  │
                                                   └──────────────┘
```

## Part 1: Fetching Activities

### List Athlete Activities

Retrieve paginated list of athlete activities.

**Endpoint:** `GET https://www.strava.com/api/v3/athlete/activities`

**Headers:**

```
Authorization: Bearer ACCESS_TOKEN
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `before` | integer | No | - | Epoch timestamp to use for filtering activities before |
| `after` | integer | No | - | Epoch timestamp to use for filtering activities after |
| `page` | integer | No | 1 | Page number |
| `per_page` | integer | No | 30 | Number of items per page (max 200) |

**Example Request:**

```bash
GET https://www.strava.com/api/v3/athlete/activities?page=1&per_page=30
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response:**

```json
[
  {
    "resource_state": 2,
    "athlete": {
      "id": 123456,
      "resource_state": 1
    },
    "name": "Morning Ride",
    "distance": 20540.3,
    "moving_time": 3682,
    "elapsed_time": 3920,
    "total_elevation_gain": 234.5,
    "type": "Ride",
    "sport_type": "Ride",
    "workout_type": null,
    "id": 987654321,
    "start_date": "2024-12-14T08:30:00Z",
    "start_date_local": "2024-12-14T09:30:00+01:00",
    "timezone": "(GMT+01:00) Europe/Brussels",
    "utc_offset": 3600.0,
    "location_city": null,
    "location_state": null,
    "location_country": "Belgium",
    "achievement_count": 2,
    "kudos_count": 12,
    "comment_count": 3,
    "athlete_count": 1,
    "photo_count": 0,
    "map": {
      "id": "a12345678",
      "summary_polyline": "encoded_polyline_string",
      "resource_state": 2
    },
    "trainer": false,
    "commute": false,
    "manual": false,
    "private": false,
    "visibility": "everyone",
    "flagged": false,
    "gear_id": "b12345678",
    "start_latlng": [37.8, -122.4],
    "end_latlng": [37.8, -122.4],
    "average_speed": 5.58,
    "max_speed": 12.4,
    "average_cadence": 85.5,
    "average_temp": 18,
    "has_heartrate": true,
    "average_heartrate": 145.2,
    "max_heartrate": 178.0,
    "heartrate_opt_out": false,
    "display_hide_heartrate_option": true,
    "elev_high": 234.5,
    "elev_low": 12.3,
    "upload_id": 1234567890,
    "upload_id_str": "1234567890",
    "external_id": "garmin_push_1234567890",
    "from_accepted_tag": false,
    "pr_count": 1,
    "total_photo_count": 0,
    "has_kudoed": false
  }
]
```

### Get Detailed Activity

Retrieve detailed information about a specific activity.

**Endpoint:** `GET https://www.strava.com/api/v3/activities/{id}`

**Headers:**

```
Authorization: Bearer ACCESS_TOKEN
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `include_all_efforts` | boolean | No | Include all segment efforts |

**Response:** (Includes all fields from list endpoint plus)

```json
{
  "description": "Beautiful morning ride through the countryside",
  "calories": 456.2,
  "device_name": "Garmin Edge 530",
  "embed_token": "abc123def456",
  "splits_metric": [
    {
      "distance": 1000.5,
      "elapsed_time": 180,
      "elevation_difference": 12.3,
      "moving_time": 178,
      "split": 1,
      "average_speed": 5.61,
      "pace_zone": 0
    }
  ],
  "laps": [
    {
      "id": 1234567890,
      "name": "Lap 1",
      "elapsed_time": 3920,
      "moving_time": 3682,
      "start_date": "2024-12-14T08:30:00Z",
      "distance": 20540.3,
      "average_speed": 5.58,
      "max_speed": 12.4
    }
  ],
  "segment_efforts": [],
  "best_efforts": []
}
```

### Activity Streams

Get detailed streams of data for an activity (GPS, heartrate, power, etc).

**Endpoint:** `GET https://www.strava.com/api/v3/activities/{id}/streams`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `keys` | string | Yes | Comma-separated list of stream types |
| `key_by_type` | boolean | No | Return data organized by type |

**Stream Types:**

- `time` - Time in seconds
- `latlng` - Latitude/longitude coordinates
- `distance` - Distance in meters
- `altitude` - Altitude in meters
- `velocity_smooth` - Smoothed velocity in m/s
- `heartrate` - Heart rate in BPM
- `cadence` - Cadence in RPM
- `watts` - Power in watts
- `temp` - Temperature in celsius
- `moving` - Boolean for moving vs stopped
- `grade_smooth` - Smoothed grade percentage

**Example Request:**

```bash
GET https://www.strava.com/api/v3/activities/987654321/streams?keys=latlng,heartrate,watts&key_by_type=true
```

## Part 2: Webhook Event Subscriptions

### Webhook Overview

Strava's webhook system sends HTTP POST requests to your server when certain events occur (activity created, updated, deleted). This eliminates the need for polling.

### Webhook Event Types

| Event Type | Object Type | Aspect Type | Description               |
| ---------- | ----------- | ----------- | ------------------------- |
| `activity` | `activity`  | `create`    | New activity uploaded     |
| `activity` | `activity`  | `update`    | Existing activity updated |
| `activity` | `activity`  | `delete`    | Activity deleted          |
| `athlete`  | `athlete`   | `update`    | Athlete profile updated   |
| `athlete`  | `athlete`   | `delete`    | Athlete deauthorized app  |

### Webhook Subscription Setup

#### Step 1: Create Webhook Subscription

**Endpoint:** `POST https://www.strava.com/api/v3/push_subscriptions`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `client_id` | string | Yes | Your application's ID |
| `client_secret` | string | Yes | Your application's secret |
| `callback_url` | string | Yes | HTTPS URL to receive events |
| `verify_token` | string | Yes | Token of your choice for verification |

**Example Request:**

```bash
POST https://www.strava.com/api/v3/push_subscriptions
Content-Type: application/json

{
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "callback_url": "https://your-domain.com/api/webhooks/strava",
  "verify_token": "YOUR_VERIFY_TOKEN"
}
```

**Response:**

```json
{
  "id": 123456,
  "application_id": 789012,
  "callback_url": "https://your-domain.com/api/webhooks/strava",
  "created_at": "2024-12-14T10:00:00Z",
  "updated_at": "2024-12-14T10:00:00Z"
}
```

#### Step 2: Handle Subscription Validation

When creating a subscription, Strava sends a GET request to verify your callback URL.

**Validation Request:**

```
GET https://your-domain.com/api/webhooks/strava?hub.mode=subscribe&hub.challenge=CHALLENGE_STRING&hub.verify_token=YOUR_VERIFY_TOKEN
```

**Your Response:**

```json
{
  "hub.challenge": "CHALLENGE_STRING"
}
```

**Backend Implementation Example:**

```javascript
// Express.js example
app.get("/api/webhooks/strava", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // Verify the token matches
  if (mode === "subscribe" && token === process.env.STRAVA_VERIFY_TOKEN) {
    console.log("Webhook verified");
    res.json({ "hub.challenge": challenge });
  } else {
    res.sendStatus(403);
  }
});
```

### Webhook Event Processing

#### Receiving Events

Strava sends POST requests to your callback URL when events occur.

**Event Payload:**

```json
{
  "object_type": "activity",
  "object_id": 987654321,
  "aspect_type": "create",
  "owner_id": 123456,
  "subscription_id": 123456,
  "event_time": 1702550400,
  "updates": {}
}
```

**Event Payload for Updates:**

```json
{
  "object_type": "activity",
  "object_id": 987654321,
  "aspect_type": "update",
  "owner_id": 123456,
  "subscription_id": 123456,
  "event_time": 1702550400,
  "updates": {
    "title": "Updated Activity Title",
    "type": "Run",
    "private": "true"
  }
}
```

**Event Payload for Athlete Deauthorization:**

```json
{
  "object_type": "athlete",
  "object_id": 123456,
  "aspect_type": "delete",
  "owner_id": 123456,
  "subscription_id": 123456,
  "event_time": 1702550400,
  "updates": {
    "authorized": "false"
  }
}
```

#### Event Handler Implementation

```javascript
// Express.js example
app.post("/api/webhooks/strava", async (req, res) => {
  // Acknowledge receipt immediately (must respond within 2 seconds)
  res.sendStatus(200);

  const event = req.body;

  // Process event asynchronously
  processWebhookEvent(event).catch((err) => {
    console.error("Error processing webhook:", err);
  });
});

async function processWebhookEvent(event) {
  const { object_type, aspect_type, object_id, owner_id } = event;

  if (object_type === "activity") {
    if (aspect_type === "create") {
      await handleActivityCreated(object_id, owner_id);
    } else if (aspect_type === "update") {
      await handleActivityUpdated(object_id, owner_id, event.updates);
    } else if (aspect_type === "delete") {
      await handleActivityDeleted(object_id, owner_id);
    }
  } else if (object_type === "athlete" && aspect_type === "delete") {
    await handleAthleteDeauthorized(owner_id);
  }
}

async function handleActivityCreated(activityId, athleteId) {
  // 1. Get athlete's access token from database
  const athlete = await db.athletes.findById(athleteId);

  // 2. Fetch full activity details from Strava
  const activity = await stravaApi.getActivity(activityId, athlete.accessToken);

  // 3. Store activity in database
  await db.activities.create({
    stravaId: activityId,
    athleteId: athleteId,
    data: activity,
    createdAt: new Date(),
  });

  // 4. Notify frontend via WebSocket
  websocket.emit(`athlete:${athleteId}:activity:created`, activity);

  // 5. Optionally trigger other workflows (notifications, analysis, etc)
  await triggerActivityAnalysis(activityId);
}

async function handleActivityUpdated(activityId, athleteId, updates) {
  // 1. Get athlete's access token
  const athlete = await db.athletes.findById(athleteId);

  // 2. Fetch updated activity details
  const activity = await stravaApi.getActivity(activityId, athlete.accessToken);

  // 3. Update database
  await db.activities.update(
    { stravaId: activityId },
    { data: activity, updatedAt: new Date() }
  );

  // 4. Notify frontend
  websocket.emit(`athlete:${athleteId}:activity:updated`, activity);
}

async function handleActivityDeleted(activityId, athleteId) {
  // 1. Delete from database
  await db.activities.delete({ stravaId: activityId });

  // 2. Notify frontend
  websocket.emit(`athlete:${athleteId}:activity:deleted`, { id: activityId });
}

async function handleAthleteDeauthorized(athleteId) {
  // 1. Remove athlete's tokens
  await db.athletes.update(
    { id: athleteId },
    { accessToken: null, refreshToken: null, deauthorizedAt: new Date() }
  );

  // 2. Notify frontend to log user out
  websocket.emit(`athlete:${athleteId}:deauthorized`);
}
```

### Managing Webhook Subscriptions

#### View Existing Subscriptions

**Endpoint:** `GET https://www.strava.com/api/v3/push_subscriptions`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `client_id` | string | Yes | Your application's ID |
| `client_secret` | string | Yes | Your application's secret |

**Response:**

```json
[
  {
    "id": 123456,
    "application_id": 789012,
    "callback_url": "https://your-domain.com/api/webhooks/strava",
    "created_at": "2024-12-14T10:00:00Z",
    "updated_at": "2024-12-14T10:00:00Z"
  }
]
```

#### Delete Subscription

**Endpoint:** `DELETE https://www.strava.com/api/v3/push_subscriptions/{id}`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `client_id` | string | Yes | Your application's ID |
| `client_secret` | string | Yes | Your application's secret |

**Response:** `204 No Content`

## Part 3: Real-Time Frontend Updates

### WebSocket Implementation

#### Backend WebSocket Server

```javascript
// Using Socket.io
const io = require("socket.io")(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

// Authenticate socket connections
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.athleteId = decoded.athleteId;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log(`Athlete ${socket.athleteId} connected`);

  // Join room for athlete-specific events
  socket.join(`athlete:${socket.athleteId}`);

  socket.on("disconnect", () => {
    console.log(`Athlete ${socket.athleteId} disconnected`);
  });
});

// Emit events to specific athlete
function notifyAthlete(athleteId, event, data) {
  io.to(`athlete:${athleteId}`).emit(event, data);
}
```

#### Frontend WebSocket Client

```typescript
// hooks/useActivityUpdates.ts
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./useAuth";

interface Activity {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  start_date: string;
}

export function useActivityUpdates() {
  const { accessToken, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [latestActivity, setLatestActivity] = useState<Activity | null>(null);

  useEffect(() => {
    if (!accessToken || !user) return;

    // Connect to WebSocket server
    const newSocket = io(process.env.REACT_APP_WEBSOCKET_URL, {
      auth: { token: accessToken },
    });

    newSocket.on("connect", () => {
      console.log("Connected to activity updates");
    });

    newSocket.on("activity:created", (activity: Activity) => {
      console.log("New activity created:", activity);
      setLatestActivity(activity);

      // Show notification
      showNotification("New Activity", `${activity.name} uploaded!`);
    });

    newSocket.on("activity:updated", (activity: Activity) => {
      console.log("Activity updated:", activity);
      setLatestActivity(activity);
    });

    newSocket.on("activity:deleted", ({ id }: { id: number }) => {
      console.log("Activity deleted:", id);
      // Handle activity deletion
    });

    newSocket.on("deauthorized", () => {
      console.log("Athlete deauthorized");
      // Log user out
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from activity updates");
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [accessToken, user]);

  return { latestActivity, isConnected: socket?.connected || false };
}
```

### React Component Integration

```typescript
// components/ActivityFeed.tsx
import { useEffect, useState } from "react";
import { useActivityUpdates } from "../hooks/useActivityUpdates";
import { stravaApi } from "../services/stravaApi";

export function ActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const { latestActivity, isConnected } = useActivityUpdates();

  // Fetch initial activities
  useEffect(() => {
    async function fetchActivities() {
      try {
        const data = await stravaApi.getActivities({ page: 1, per_page: 30 });
        setActivities(data);
      } catch (error) {
        console.error("Error fetching activities:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchActivities();
  }, []);

  // Add new activity to feed when received via WebSocket
  useEffect(() => {
    if (latestActivity) {
      setActivities((prev) => [latestActivity, ...prev]);
    }
  }, [latestActivity]);

  if (loading) return <div>Loading activities...</div>;

  return (
    <div>
      <div className="connection-status">
        {isConnected ? "🟢 Live updates enabled" : "🔴 Reconnecting..."}
      </div>

      <div className="activity-list">
        {activities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}
```

## Database Schema

### Activities Table

```sql
CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  strava_id BIGINT UNIQUE NOT NULL,
  athlete_id BIGINT NOT NULL,
  name VARCHAR(255),
  type VARCHAR(50),
  sport_type VARCHAR(50),
  distance DECIMAL(10, 2),
  moving_time INTEGER,
  elapsed_time INTEGER,
  total_elevation_gain DECIMAL(10, 2),
  start_date TIMESTAMP,
  start_date_local TIMESTAMP,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,

  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
  INDEX idx_athlete_id (athlete_id),
  INDEX idx_start_date (start_date),
  INDEX idx_deleted_at (deleted_at)
);
```

### Webhook Events Table (for debugging/logging)

```sql
CREATE TABLE webhook_events (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER,
  object_type VARCHAR(50),
  object_id BIGINT,
  aspect_type VARCHAR(50),
  owner_id BIGINT,
  event_time TIMESTAMP,
  updates JSONB,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_owner_id (owner_id),
  INDEX idx_processed (processed),
  INDEX idx_created_at (created_at)
);
```

## Error Handling & Retry Logic

### Webhook Event Processing

```javascript
async function processWebhookEvent(event, retryCount = 0) {
  const MAX_RETRIES = 3;

  try {
    // Log event to database
    await db.webhookEvents.create({
      subscriptionId: event.subscription_id,
      objectType: event.object_type,
      objectId: event.object_id,
      aspectType: event.aspect_type,
      ownerId: event.owner_id,
      eventTime: new Date(event.event_time * 1000),
      updates: event.updates,
    });

    // Process event based on type
    await handleEvent(event);

    // Mark as processed
    await db.webhookEvents.update(
      { objectId: event.object_id, objectType: event.object_type },
      { processed: true, processedAt: new Date() }
    );
  } catch (error) {
    console.error(
      `Error processing webhook event (attempt ${retryCount + 1}):`,
      error
    );

    // Log error
    await db.webhookEvents.update(
      { objectId: event.object_id, objectType: event.object_type },
      { error: error.message }
    );

    // Retry with exponential backoff
    if (retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      setTimeout(() => {
        processWebhookEvent(event, retryCount + 1);
      }, delay);
    } else {
      // Send alert for failed event processing
      await sendAlert(
        `Failed to process webhook event after ${MAX_RETRIES} attempts`,
        event
      );
    }
  }
}
```

### API Rate Limit Handling

```javascript
async function fetchActivityWithRetry(activityId, accessToken, retryCount = 0) {
  const MAX_RETRIES = 3;

  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (response.status === 429) {
      // Rate limited
      const retryAfter = response.headers.get("Retry-After") || 60;

      if (retryCount < MAX_RETRIES) {
        console.log(`Rate limited, retrying after ${retryAfter}s`);
        await sleep(parseInt(retryAfter) * 1000);
        return fetchActivityWithRetry(activityId, accessToken, retryCount + 1);
      }

      throw new Error("Rate limit exceeded");
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 1000;
      await sleep(delay);
      return fetchActivityWithRetry(activityId, accessToken, retryCount + 1);
    }
    throw error;
  }
}
```

## Security Considerations

### Webhook Security

1. **Verify Source**: Validate that requests come from Strava's servers
2. **Use HTTPS**: Callback URL must use HTTPS
3. **Token Verification**: Verify the subscription token
4. **Rate Limiting**: Implement rate limiting on webhook endpoint
5. **Idempotency**: Handle duplicate events gracefully

### Access Token Security

1. **Never expose tokens**: Store access tokens server-side only
2. **Encrypt at rest**: Encrypt tokens in database
3. **Refresh proactively**: Refresh tokens before expiration
4. **Revocation handling**: Handle athlete deauthorization events

## Monitoring & Observability

### Key Metrics to Track

- Webhook events received per minute
- Event processing success rate
- Event processing latency
- WebSocket connection count
- API rate limit usage
- Failed webhook deliveries

### Logging Strategy

```javascript
// Structured logging example
logger.info("Webhook event received", {
  eventType: event.object_type,
  aspectType: event.aspect_type,
  objectId: event.object_id,
  ownerId: event.owner_id,
  subscriptionId: event.subscription_id,
});

logger.info("Activity fetched from Strava", {
  activityId: activityId,
  athleteId: athleteId,
  duration: Date.now() - startTime,
});

logger.error("Failed to process webhook event", {
  error: error.message,
  stack: error.stack,
  event: event,
  retryCount: retryCount,
});
```

## Testing

### Testing Webhook Integration

1. **Manual Testing**: Use Postman or curl to simulate webhook events
2. **ngrok/localtunnel**: Expose local server for testing
3. **Strava Webhook Tester**: Use Strava's webhook testing tools

**Example Test Event:**

```bash
curl -X POST https://your-domain.com/api/webhooks/strava \
  -H "Content-Type: application/json" \
  -d '{
    "object_type": "activity",
    "object_id": 987654321,
    "aspect_type": "create",
    "owner_id": 123456,
    "subscription_id": 123456,
    "event_time": 1702550400,
    "updates": {}
  }'
```

### Testing WebSocket Integration

```javascript
// Test WebSocket connection
const socket = io("http://localhost:3001", {
  auth: { token: "test-token" },
});

socket.on("connect", () => {
  console.log("Connected");
});

socket.on("activity:created", (data) => {
  console.log("Received activity:", data);
});

// Simulate event
socket.emit("test:activity:created", {
  id: 123,
  name: "Test Activity",
  type: "Ride",
});
```

## Deployment Checklist

- [ ] Callback URL is publicly accessible via HTTPS
- [ ] Environment variables configured (client ID, secret, verify token)
- [ ] Webhook subscription created in Strava
- [ ] Database tables created
- [ ] WebSocket server configured
- [ ] Error logging and monitoring set up
- [ ] Rate limit handling implemented
- [ ] Security measures in place (encryption, validation)
- [ ] Retry logic tested
- [ ] Frontend WebSocket integration tested
- [ ] Deauthorization handling implemented

## Troubleshooting

### Common Issues

**Webhook validation fails:**

- Ensure callback URL is HTTPS
- Verify token matches exactly
- Check that response format is correct

**Events not received:**

- Verify subscription is active (GET /push_subscriptions)
- Check server logs for incoming requests
- Ensure callback URL is publicly accessible
- Verify firewall/security group settings

**Activity fetch fails after webhook:**

- Check access token validity
- Verify token hasn't expired
- Handle 401 errors with token refresh
- Check rate limits

**WebSocket disconnections:**

- Implement reconnection logic with exponential backoff
- Handle authentication token refresh
- Monitor server logs for connection errors

## Future Enhancements

- Batch activity processing for efficiency
- Activity data caching strategy
- Advanced analytics triggers on new activities
- Social features (notify followers of new activities)
- Activity comparison and insights
- Training plan integration
- Achievement/goal tracking based on webhooks
