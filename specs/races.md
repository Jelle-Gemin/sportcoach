# Profile Page with Race Management Specification

## Overview

This document specifies the enhanced profile page that allows users to manage planned races, track completed races, and receive post-race feedback prompts. The system automatically handles race lifecycle (planned → completed/skipped) and integrates with training plan generation.

## Route

```
/profile
```

## Access Control

- **Protected Route**: Yes
- **Authentication Required**: Yes
- **Redirect if Unauthenticated**: `/login`

## Database Schema

### Collection: `races`

```javascript
{
  _id: ObjectId,
  userId: ObjectId,                    // Reference to user

  // Race details
  raceName: String,                    // e.g., "Chicago Marathon 2024"
  raceType: String,                    // Enum: see race types below
  raceDate: Date,                      // Race date
  location: String,                    // Optional: "Chicago, IL"

  // Goals and estimates
  goalTime: Number,                    // Goal finish time in seconds
  estimatedTime: Number,               // AI-calculated estimated time based on fitness

  // Status tracking
  status: String,                      // "planned", "completed", "skipped"

  // Completion data (only for completed races)
  actualFinishTime: Number,            // Actual finish time in seconds (if completed)
  completedAt: Date,                   // When user logged the completion

  // Skip data (only for skipped races)
  skipReason: String,                  // Optional reason for skipping
  skippedAt: Date,                     // When user marked as skipped

  // Post-race popup tracking
  postRacePopupShown: Boolean,         // Has popup been shown?
  postRacePopupShownAt: Date,          // When was popup shown?

  // Metadata
  createdAt: Date,
  updatedAt: Date,

  // Training plan integration
  linkedTrainingPlanId: ObjectId,      // Optional: link to training plan
  isTargetRace: Boolean,               // Is this the primary race for current training?
}
```

### Race Type Enum

```javascript
const RACE_TYPES = {
  // Running
  "5K": { distance: 5, unit: "km", sport: "run" },
  "10K": { distance: 10, unit: "km", sport: "run" },
  HALF_MARATHON: { distance: 21.0975, unit: "km", sport: "run" },
  MARATHON: { distance: 42.195, unit: "km", sport: "run" },
  ULTRA_50K: { distance: 50, unit: "km", sport: "run" },
  ULTRA_100K: { distance: 100, unit: "km", sport: "run" },

  // Triathlon
  TRIATHLON_SPRINT: {
    swim: 0.75,
    bike: 20,
    run: 5,
    sport: "triathlon",
  },
  TRIATHLON_OLYMPIC: {
    swim: 1.5,
    bike: 40,
    run: 10,
    sport: "triathlon",
  },
  TRIATHLON_HALF: {
    swim: 1.9,
    bike: 90,
    run: 21.0975,
    sport: "triathlon",
  },
  TRIATHLON_FULL: {
    swim: 3.8,
    bike: 180,
    run: 42.195,
    sport: "triathlon",
  },

  // Cycling
  CENTURY_RIDE: { distance: 100, unit: "mi", sport: "ride" },
  GRAN_FONDO: { distance: 120, unit: "km", sport: "ride" },

  // Other
  CUSTOM: { distance: null, unit: null, sport: "custom" },
};
```

### Indexes

```javascript
// races collection
db.races.createIndex({ userId: 1, raceDate: 1 });
db.races.createIndex({ userId: 1, status: 1 });
db.races.createIndex({ userId: 1, raceDate: 1, postRacePopupShown: 1 });
```

## Component Structure

```
src/
├── pages/
│   └── ProfilePage.tsx
├── components/
│   ├── profile/
│   │   ├── ProfileHeader.tsx
│   │   ├── ProfileStats.tsx
│   │   ├── RaceManagement.tsx
│   │   ├── PlannedRaces.tsx
│   │   ├── CompletedRaces.tsx
│   │   ├── AddRaceModal.tsx
│   │   ├── EditRaceModal.tsx
│   │   └── PostRacePopup.tsx
├── hooks/
│   ├── useProfile.ts
│   ├── useRaces.ts
│   └── usePostRaceCheck.ts
└── services/
    └── raceService.ts
```

## Page Layout

### Desktop Layout (≥1024px)

```
┌───────────────────────────────────────────────────────────┐
│  [← Back to Dashboard]                                    │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  ┌────────┐  John Doe                               │ │
│  │  │ Avatar │  @johndoe_runs                          │ │
│  │  │  Photo │  San Francisco, CA                      │ │
│  │  └────────┘  Runner & Triathlete                    │ │
│  │              Member since Jan 2020                  │ │
│  │              42 Followers • 38 Following            │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  🎯 Planned Races                        [+ Add Race]│ │
│  │  ─────────────────────────────────────────────────  │ │
│  │                                                      │ │
│  │  ┌────────────────────────────────────────────────┐ │ │
│  │  │ 🏃 Chicago Marathon 2024            [Edit] [×] │ │ │
│  │  │ ──────────────────────────────────────────────│ │ │
│  │  │ 📅 October 13, 2024 (in 289 days)            │ │ │
│  │  │ 🎯 Goal: 3:30:00                              │ │ │
│  │  │ 📊 Estimated: 3:42:15 (based on fitness)      │ │ │
│  │  │ 📍 Chicago, IL                                │ │ │
│  │  │ ⭐ Target race for current training plan      │ │ │
│  │  └────────────────────────────────────────────────┘ │ │
│  │                                                      │ │
│  │  ┌────────────────────────────────────────────────┐ │ │
│  │  │ 🏊 Olympic Triathlon                 [Edit] [×]│ │ │
│  │  │ ──────────────────────────────────────────────│ │ │
│  │  │ 📅 May 15, 2024 (in 139 days)                │ │ │
│  │  │ 🎯 Goal: 2:15:00                              │ │ │
│  │  │ 📊 Estimated: 2:28:30                         │ │ │
│  │  │ 📍 San Francisco, CA                          │ │ │
│  │  └────────────────────────────────────────────────┘ │ │
│  │                                                      │ │
│  │  💡 Tip: Add races to help AI generate training    │ │
│  │     plans tailored to your goals                    │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  🏆 Completed Races                                 │ │
│  │  ─────────────────────────────────────────────────  │ │
│  │                                                      │ │
│  │  ┌────────────────────────────────────────────────┐ │ │
│  │  │ 🏃 New York Half Marathon                     │ │ │
│  │  │ ──────────────────────────────────────────────│ │ │
│  │  │ 📅 November 15, 2023                          │ │ │
│  │  │ 🎯 Goal: 1:35:00 • Actual: 1:32:45            │ │ │
│  │  │ ✅ Beat goal by 2:15!                         │ │ │
│  │  │ [View Activity]                               │ │ │
│  │  └────────────────────────────────────────────────┘ │ │
│  │                                                      │ │
│  │  ┌────────────────────────────────────────────────┐ │ │
│  │  │ 🏃 Boston Marathon                            │ │ │
│  │  │ ──────────────────────────────────────────────│ │ │
│  │  │ 📅 April 17, 2023                             │ │ │
│  │  │ 🎯 Goal: 3:15:00 • Actual: 3:18:22            │ │ │
│  │  │ [View Activity]                               │ │ │
│  │  └────────────────────────────────────────────────┘ │ │
│  │                                                      │ │
│  │  [View All Completed Races (8 total)]               │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  🔄 Strava Sync Status                              │ │
│  │  ─────────────────────────────────────────────────  │ │
│  │  ✓ All activities synced                            │ │
│  │  Last synced: 2 hours ago                           │ │
│  │  Total activities: 1,234                            │ │
│  │  [Sync Now] [Sync Settings]                        │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  📊 All-Time Statistics                             │ │
│  │  ─────────────────────────────────────────────────  │ │
│  │  🏃 Runs: 624 activities • 2,532 km • 752 hours     │ │
│  │  🚴 Rides: 312 activities • 5,354 km • 1,113 hours  │ │
│  │  🏊 Swims: 156 activities • 234 km • 187 hours      │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  [Edit Profile] [Settings] [Disconnect Strava] [Logout] │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Mobile Layout (<768px)

```
┌──────────────────────┐
│  [←] Profile         │
├──────────────────────┤
│                      │
│  ┌────────┐          │
│  │ Avatar │          │
│  └────────┘          │
│  John Doe            │
│  @johndoe_runs       │
│  San Francisco, CA   │
│                      │
│  42 • 38             │
│  Followers Following │
│                      │
├──────────────────────┤
│  🎯 Planned Races    │
│  [+ Add Race]        │
│                      │
│  ┌────────────────┐  │
│  │ Chicago        │  │
│  │ Marathon       │  │
│  │ Oct 13, 2024   │  │
│  │ Goal: 3:30:00  │  │
│  │ Est: 3:42:15   │  │
│  │ [Edit] [×]     │  │
│  └────────────────┘  │
│                      │
│  ┌────────────────┐  │
│  │ Olympic Tri    │  │
│  │ May 15, 2024   │  │
│  │ Goal: 2:15:00  │  │
│  │ [Edit] [×]     │  │
│  └────────────────┘  │
│                      │
├──────────────────────┤
│  🏆 Completed (8)    │
│  [View All]          │
│                      │
├──────────────────────┤
│  🔄 Strava Sync      │
│  ✓ Synced 2h ago     │
│  [Sync Now]          │
│                      │
└──────────────────────┘
```

## Add Race Modal

### Layout

```
┌─────────────────────────────────────────────────┐
│  Add Planned Race                          [×]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Race Name *                                    │
│  ┌─────────────────────────────────────────┐   │
│  │ Chicago Marathon 2024                   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Race Type *                                    │
│  ┌─────────────────────────────────────────┐   │
│  │ Marathon                            [▼] │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Race Date *                                    │
│  ┌─────────────────────────────────────────┐   │
│  │ 10/13/2024                          [📅]│   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Location (Optional)                            │
│  ┌─────────────────────────────────────────┐   │
│  │ Chicago, IL                             │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Goal Finish Time *                             │
│  ┌────┐  ┌────┐  ┌────┐                        │
│  │ 3h │: │30m │: │00s │                        │
│  └────┘  └────┘  └────┘                        │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 📊 Based on your current fitness:       │   │
│  │    Estimated finish time: 3:42:15       │   │
│  │    Your goal is achievable with         │   │
│  │    consistent training!                 │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ☐ Set as target race for training plan        │
│                                                 │
│  [Cancel]                    [Add Race]         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Race Type Dropdown Options

```
┌─────────────────────────────────┐
│ 🏃 Running                      │
│   • 5K                          │
│   • 10K                         │
│   • Half Marathon               │
│   • Marathon                    │
│   • Ultra 50K                   │
│   • Ultra 100K                  │
│                                 │
│ 🏊 Triathlon                    │
│   • Sprint Distance             │
│   • Olympic Distance            │
│   • Half Ironman (70.3)         │
│   • Full Ironman (140.6)        │
│                                 │
│ 🚴 Cycling                      │
│   • Century Ride (100mi)        │
│   • Gran Fondo (120km)          │
│                                 │
│ 📝 Custom                       │
└─────────────────────────────────┘
```

### Validation Rules

```javascript
{
  raceName: {
    required: true,
    minLength: 3,
    maxLength: 100
  },
  raceType: {
    required: true,
    enum: Object.keys(RACE_TYPES)
  },
  raceDate: {
    required: true,
    validate: (date) => {
      // Must be in the future
      return new Date(date) > new Date();
    },
    errorMessage: "Race date must be in the future"
  },
  location: {
    required: false,
    maxLength: 200
  },
  goalTime: {
    required: true,
    validate: (seconds) => {
      return seconds > 0 && seconds < 86400; // Max 24 hours
    }
  }
}
```

## Edit Race Modal

Same layout as Add Race Modal, but:

- Pre-populated with existing race data
- Title: "Edit Race"
- Button: "Save Changes"
- Additional option: [Delete Race] button at bottom (with confirmation)

## Post-Race Popup

### Congratulations Popup (Race Completed)

```
┌─────────────────────────────────────────────────┐
│                                                 │
│                     🎉                          │
│                                                 │
│           Congratulations on your race!         │
│                                                 │
│           Chicago Marathon 2024                 │
│           October 13, 2024                      │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  How did it go?                                 │
│                                                 │
│  Your goal was: 3:30:00                         │
│                                                 │
│  What was your finish time?                     │
│                                                 │
│  ┌────┐  ┌────┐  ┌────┐                        │
│  │ 3h │: │28m │: │45s │                        │
│  └────┘  └────┘  └────┘                        │
│                                                 │
│  🎯 You beat your goal by 1:15! Amazing work!  │
│                                                 │
│  [I didn't compete in this race]               │
│                                                 │
│  [Cancel]                    [Save Result]      │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Didn't Compete Confirmation

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Confirm Race Skip                              │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Are you sure you didn't compete in:            │
│                                                 │
│  Chicago Marathon 2024                          │
│  October 13, 2024                               │
│                                                 │
│  This race will be marked as skipped and        │
│  moved to your race history.                    │
│                                                 │
│  [Go Back]              [Confirm Skip]          │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Trigger Logic

The popup should appear when:

1. User logs in for the first time after race date has passed
2. Race status is still "planned"
3. `postRacePopupShown` is `false`
4. Race date is within the last 7 days (grace period)

## API Endpoints

### POST `/api/races`

Create a new planned race.

```typescript
Request Body: {
  raceName: string;
  raceType: string;
  raceDate: string; // ISO 8601
  location?: string;
  goalTime: number; // seconds
  isTargetRace?: boolean;
}

Response: {
  success: boolean;
  race: Race;
  estimatedTime: number; // AI-calculated
}
```

### GET `/api/races`

Get all races for authenticated user.

```typescript
Query Params:
  - status?: "planned" | "completed" | "skipped"
  - includeEstimates?: boolean

Response: {
  races: Race[];
  stats: {
    totalPlanned: number;
    totalCompleted: number;
    totalSkipped: number;
    upcomingRace?: Race; // Next race by date
  }
}
```

### GET `/api/races/:raceId`

Get single race details.

```typescript
Response: {
  race: Race;
}
```

### PATCH `/api/races/:raceId`

Update race details.

```typescript
Request Body: {
  raceName?: string;
  raceType?: string;
  raceDate?: string;
  location?: string;
  goalTime?: number;
  isTargetRace?: boolean;
}

Response: {
  success: boolean;
  race: Race;
  estimatedTime?: number; // Recalculated if relevant fields changed
}
```

### DELETE `/api/races/:raceId`

Delete a race.

```typescript
Response: {
  success: boolean;
  message: string;
}
```

### POST `/api/races/:raceId/complete`

Mark race as completed with actual finish time.

```typescript
Request Body: {
  actualFinishTime: number; // seconds
}

Response: {
  success: boolean;
  race: Race;
  comparison: {
    goalTime: number;
    actualTime: number;
    difference: number; // positive = beat goal, negative = missed goal
    percentageDifference: number;
  }
}
```

### POST `/api/races/:raceId/skip`

Mark race as skipped.

```typescript
Request Body: {
  skipReason?: string;
}

Response: {
  success: boolean;
  race: Race;
}
```

### GET `/api/races/check-post-race`

Check if there are races requiring post-race popup.

```typescript
Response: {
  hasPostRacePopup: boolean;
  race?: Race; // Race that needs popup
}
```

### POST `/api/races/:raceId/dismiss-popup`

Mark post-race popup as shown (if user closes without action).

```typescript
Response: {
  success: boolean;
}
```

## Race Service Implementation

### `services/raceService.ts`

```typescript
interface EstimatedTimeParams {
  raceType: string;
  userId: string;
  targetDate: Date;
}

class RaceService {
  /**
   * Calculate estimated finish time based on current fitness
   */
  async calculateEstimatedTime(params: EstimatedTimeParams): Promise<number> {
    const { raceType, userId, targetDate } = params;

    // Get user's recent activities
    const recentActivities = await this.getRecentActivities(userId, 30); // Last 30 days

    // Get race distance
    const raceConfig = RACE_TYPES[raceType];

    if (raceConfig.sport === "run") {
      return this.estimateRunTime(recentActivities, raceConfig.distance);
    } else if (raceConfig.sport === "triathlon") {
      return this.estimateTriathlonTime(recentActivities, raceConfig);
    } else if (raceConfig.sport === "ride") {
      return this.estimateRideTime(recentActivities, raceConfig.distance);
    }

    return 0; // Custom or unknown type
  }

  /**
   * Estimate run finish time using recent pace data
   */
  private estimateRunTime(activities: Activity[], distanceKm: number): number {
    // Filter running activities
    const runs = activities.filter((a) => a.type === "Run");

    if (runs.length === 0) {
      // No data, return conservative estimate
      return this.getConservativeEstimate("run", distanceKm);
    }

    // Calculate average pace from recent runs
    const totalDistance = runs.reduce((sum, r) => sum + r.distance, 0);
    const totalTime = runs.reduce((sum, r) => sum + r.movingTime, 0);
    const avgPaceSecondsPerKm = totalTime / (totalDistance / 1000);

    // Apply race day factor (people usually run faster in races)
    const raceDayFactor = 0.95; // 5% faster
    const estimatedPace = avgPaceSecondsPerKm * raceDayFactor;

    // Calculate estimated time for race distance
    return Math.round(estimatedPace * distanceKm);
  }

  /**
   * Estimate triathlon finish time
   */
  private estimateTriathlonTime(activities: Activity[], config: any): number {
    // Get activities by sport type
    const swims = activities.filter((a) => a.type === "Swim");
    const bikes = activities.filter(
      (a) => a.type === "Ride" || a.type === "VirtualRide"
    );
    const runs = activities.filter((a) => a.type === "Run");

    // Calculate estimates for each leg
    const swimTime = this.estimateSwimTime(swims, config.swim);
    const bikeTime = this.estimateRideTime(bikes, config.bike);
    const runTime = this.estimateRunTime(runs, config.run);

    // Add transition times (estimates)
    const t1 = 180; // 3 minutes
    const t2 = 120; // 2 minutes

    return swimTime + t1 + bikeTime + t2 + runTime;
  }

  /**
   * Check for races that need post-race popup
   */
  async checkPostRacePopup(userId: string): Promise<Race | null> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Find planned races where:
    // - Race date has passed
    // - Race date is within last 7 days
    // - Popup hasn't been shown yet
    const race = await db.collection("races").findOne({
      userId: new ObjectId(userId),
      status: "planned",
      raceDate: {
        $lt: now,
        $gte: sevenDaysAgo,
      },
      postRacePopupShown: false,
    });

    return race;
  }

  /**
   * Auto-cleanup: Move expired races older than 7 days to skipped
   */
  async autoCleanupExpiredRaces(userId: string): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    await db.collection("races").updateMany(
      {
        userId: new ObjectId(userId),
        status: "planned",
        raceDate: { $lt: sevenDaysAgo },
        postRacePopupShown: true, // Only cleanup if popup was shown
      },
      {
        $set: {
          status: "skipped",
          skipReason: "Auto-archived (no response to post-race popup)",
          skippedAt: new Date(),
        },
      }
    );
  }
}
```

## React Hooks

### `useRaces.ts`

```typescript
interface UseRacesReturn {
  races: Race[];
  plannedRaces: Race[];
  completedRaces: Race[];
  loading: boolean;
  error: string | null;
  addRace: (race: CreateRaceInput) => Promise<Race>;
  updateRace: (id: string, updates: UpdateRaceInput) => Promise<Race>;
  deleteRace: (id: string) => Promise<void>;
  completeRace: (id: string, finishTime: number) => Promise<void>;
  skipRace: (id: string, reason?: string) => Promise<void>;
  refreshRaces: () => Promise<void>;
}

export function useRaces(): UseRacesReturn {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch races on mount
  useEffect(() => {
    fetchRaces();
  }, []);

  const fetchRaces = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/races?includeEstimates=true");
      const data = await response.json();
      setRaces(data.races);
    } catch (err) {
      setError("Failed to load races");
    } finally {
      setLoading(false);
    }
  };

  const addRace = async (input: CreateRaceInput) => {
    const response = await fetch("/api/races", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const data = await response.json();
    setRaces([...races, data.race]);
    return data.race;
  };

  const completeRace = async (id: string, finishTime: number) => {
    const response = await fetch(`/api/races/${id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actualFinishTime: finishTime }),
    });

    const data = await response.json();

    // Update local state
    setRaces(races.map((r) => (r._id === id ? data.race : r)));
  };

  // ... other methods

  return {
    races,
    plannedRaces: races.filter((r) => r.status === "planned"),
    completedRaces: races.filter((r) => r.status === "completed"),
    loading,
    error,
    addRace,
    updateRace,
    deleteRace,
    completeRace,
    skipRace,
    refreshRaces: fetchRaces,
  };
}
```

### `usePostRaceCheck.ts`

```typescript
interface UsePostRaceCheckReturn {
  hasPostRacePopup: boolean;
  postRaceData: Race | null;
return {
    hasPostRacePopup,
    postRaceData,
    dismissPopup,
    completeRace,
    skipRace
  };
}
```

## React Components

### `PostRacePopup.tsx`

```typescript
import { useState } from "react";
import { Race } from "@/types";
import { formatDuration, calculateTimeDifference } from "@/utils/timeUtils";

interface PostRacePopupProps {
  race: Race;
  onComplete: (finishTime: number) => Promise<void>;
  onSkip: () => Promise<void>;
  onDismiss: () => Promise<void>;
}

export function PostRacePopup({
  race,
  onComplete,
  onSkip,
  onDismiss,
}: PostRacePopupProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const finishTimeSeconds = hours * 3600 + minutes * 60 + seconds;
  const goalTimeSeconds = race.goalTime;
  const timeDifference = goalTimeSeconds - finishTimeSeconds;
  const beatGoal = timeDifference > 0;

  const handleComplete = async () => {
    if (finishTimeSeconds === 0) return;

    setLoading(true);
    try {
      await onComplete(finishTimeSeconds);
    } catch (error) {
      console.error("Failed to complete race:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipConfirm = async () => {
    setLoading(true);
    try {
      await onSkip();
    } catch (error) {
      console.error("Failed to skip race:", error);
    } finally {
      setLoading(false);
    }
  };

  if (showSkipConfirmation) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
          <h2 className="text-xl font-bold mb-4">Confirm Race Skip</h2>

          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Are you sure you didn't compete in:
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="font-semibold">{race.raceName}</p>
              <p className="text-sm text-gray-600">
                {new Date(race.raceDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            <p className="text-sm text-gray-600">
              This race will be marked as skipped and moved to your race
              history.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowSkipConfirmation(false)}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={handleSkipConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Processing..." : "Confirm Skip"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-2">
            Congratulations on your race!
          </h2>
          <p className="font-semibold text-lg">{race.raceName}</p>
          <p className="text-gray-600">
            {new Date(race.raceDate).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <p className="font-semibold mb-4">How did it go?</p>

          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-600">Your goal was:</p>
            <p className="text-lg font-semibold text-blue-600">
              {formatDuration(goalTimeSeconds)}
            </p>
          </div>

          <p className="text-sm font-medium mb-2">What was your finish time?</p>

          {/* Time Input */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">Hours</label>
              <input
                type="number"
                min="0"
                max="24"
                value={hours}
                onChange={(e) =>
                  setHours(Math.max(0, parseInt(e.target.value) || 0))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end pb-2 text-2xl font-bold text-gray-400">
              :
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">
                Minutes
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) =>
                  setMinutes(
                    Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end pb-2 text-2xl font-bold text-gray-400">
              :
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">
                Seconds
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={seconds}
                onChange={(e) =>
                  setSeconds(
                    Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Goal Comparison */}
          {finishTimeSeconds > 0 && (
            <div
              className={`rounded-lg p-3 mb-4 ${
                beatGoal ? "bg-green-50" : "bg-yellow-50"
              }`}
            >
              <p
                className={`font-semibold ${
                  beatGoal ? "text-green-700" : "text-yellow-700"
                }`}
              >
                {beatGoal ? "🎯 You beat your goal by " : "⏱️ Goal missed by "}
                {formatDuration(Math.abs(timeDifference))}
                {beatGoal ? "! Amazing work!" : ". Still a great achievement!"}
              </p>
            </div>
          )}

          {/* Didn't Compete Button */}
          <button
            onClick={() => setShowSkipConfirmation(true)}
            disabled={loading}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors mb-4"
          >
            I didn't compete in this race
          </button>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onDismiss}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleComplete}
              disabled={finishTimeSeconds === 0 || loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Result"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### `PlannedRaces.tsx`

```typescript
import { Race } from "@/types";
import { formatDuration, getDaysUntil } from "@/utils/timeUtils";
import { Pencil, X, Star } from "lucide-react";

interface PlannedRacesProps {
  races: Race[];
  onEdit: (race: Race) => void;
  onDelete: (raceId: string) => void;
  onAdd: () => void;
}

export function PlannedRaces({
  races,
  onEdit,
  onDelete,
  onAdd,
}: PlannedRacesProps) {
  if (races.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-xl font-semibold mb-2">No Planned Races</h3>
          <p className="text-gray-600 mb-4">
            Add your upcoming races to help AI generate personalized training
            plans
          </p>
          <button
            onClick={onAdd}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Race
          </button>
        </div>
      </div>
    );
  }

  // Sort races by date (earliest first)
  const sortedRaces = [...races].sort(
    (a, b) => new Date(a.raceDate).getTime() - new Date(b.raceDate).getTime()
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          🎯 Planned Races
        </h2>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + Add Race
        </button>
      </div>

      <div className="space-y-4">
        {sortedRaces.map((race) => {
          const daysUntil = getDaysUntil(race.raceDate);
          const goalTime = formatDuration(race.goalTime);
          const estimatedTime = formatDuration(race.estimatedTime);
          const timeDiff = race.goalTime - race.estimatedTime;
          const isGoalRealistic = timeDiff >= 0;

          return (
            <div
              key={race._id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{race.raceName}</h3>
                    {race.isTargetRace && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                        <Star className="w-3 h-3" />
                        Target Race
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{race.raceType}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(race)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    aria-label="Edit race"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(race._id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Delete race"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">📅</span>
                  <span>
                    {new Date(race.raceDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-gray-500">
                    ({daysUntil > 0 ? `in ${daysUntil} days` : "today"})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-600">🎯</span>
                  <span>
                    Goal: <span className="font-semibold">{goalTime}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-600">📊</span>
                  <span>
                    Estimated:{" "}
                    <span className="font-semibold">{estimatedTime}</span>
                    <span className="text-gray-500 ml-1">
                      (based on current fitness)
                    </span>
                  </span>
                </div>

                {!isGoalRealistic && (
                  <div className="flex items-start gap-2 mt-2 p-2 bg-yellow-50 rounded">
                    <span className="text-yellow-600">⚠️</span>
                    <span className="text-xs text-yellow-700">
                      Your goal is ambitious! Consider adjusting your training
                      plan or goal time.
                    </span>
                  </div>
                )}

                {race.location && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">📍</span>
                    <span>{race.location}</span>
                  </div>
                )}

                {race.isTargetRace && (
                  <div className="flex items-start gap-2 mt-2 p-2 bg-blue-50 rounded">
                    <span>⭐</span>
                    <span className="text-xs text-blue-700">
                      Target race for current training plan
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          💡 <strong>Tip:</strong> Add races to help AI generate training plans
          tailored to your goals
        </p>
      </div>
    </div>
  );
}
```

### `CompletedRaces.tsx`

```typescript
import { Race } from '@/types';
import { formatDuration } from '@/utils/timeUtils';
import { ExternalLink } from 'lucide-react';

interface Complete# Profile Page with Race Management Specification

## Overview

This document specifies the enhanced profile page that allows users to manage planned races, track completed races, and receive post-race feedback prompts. The system automatically handles race lifecycle (planned → completed/skipped) and integrates with training plan generation.

## Route

```

/profile

````

## Access Control

- **Protected Route**: Yes
- **Authentication Required**: Yes
- **Redirect if Unauthenticated**: `/login`

## Database Schema

### Collection: `races`

```javascript
{
  _id: ObjectId,
  userId: ObjectId,                    // Reference to user

  // Race details
  raceName: String,                    // e.g., "Chicago Marathon 2024"
  raceType: String,                    // Enum: see race types below
  raceDate: Date,                      // Race date
  location: String,                    // Optional: "Chicago, IL"

  // Goals and estimates
  goalTime: Number,                    // Goal finish time in seconds
  estimatedTime: Number,               // AI-calculated estimated time based on fitness

  // Status tracking
  status: String,                      // "planned", "completed", "skipped"

  // Completion data (only for completed races)
  actualFinishTime: Number,            // Actual finish time in seconds (if completed)
  completedAt: Date,                   // When user logged the completion

  // Skip data (only for skipped races)
  skipReason: String,                  // Optional reason for skipping
  skippedAt: Date,                     // When user marked as skipped

  // Post-race popup tracking
  postRacePopupShown: Boolean,         // Has popup been shown?
  postRacePopupShownAt: Date,          // When was popup shown?

  // Metadata
  createdAt: Date,
  updatedAt: Date,

  // Training plan integration
  linkedTrainingPlanId: ObjectId,      // Optional: link to training plan
  isTargetRace: Boolean,               // Is this the primary race for current training?
}
````

### Race Type Enum

```javascript
const RACE_TYPES = {
  // Running
  "5K": { distance: 5, unit: "km", sport: "run" },
  "10K": { distance: 10, unit: "km", sport: "run" },
  HALF_MARATHON: { distance: 21.0975, unit: "km", sport: "run" },
  MARATHON: { distance: 42.195, unit: "km", sport: "run" },
  ULTRA_50K: { distance: 50, unit: "km", sport: "run" },
  ULTRA_100K: { distance: 100, unit: "km", sport: "run" },

  // Triathlon
  TRIATHLON_SPRINT: {
    swim: 0.75,
    bike: 20,
    run: 5,
    sport: "triathlon",
  },
  TRIATHLON_OLYMPIC: {
    swim: 1.5,
    bike: 40,
    run: 10,
    sport: "triathlon",
  },
  TRIATHLON_HALF: {
    swim: 1.9,
    bike: 90,
    run: 21.0975,
    sport: "triathlon",
  },
  TRIATHLON_FULL: {
    swim: 3.8,
    bike: 180,
    run: 42.195,
    sport: "triathlon",
  },

  // Cycling
  CENTURY_RIDE: { distance: 100, unit: "mi", sport: "ride" },
  GRAN_FONDO: { distance: 120, unit: "km", sport: "ride" },

  // Other
  CUSTOM: { distance: null, unit: null, sport: "custom" },
};
```

### Indexes

```javascript
// races collection
db.races.createIndex({ userId: 1, raceDate: 1 });
db.races.createIndex({ userId: 1, status: 1 });
db.races.createIndex({ userId: 1, raceDate: 1, postRacePopupShown: 1 });
```

## Component Structure

```
src/
├── pages/
│   └── ProfilePage.tsx
├── components/
│   ├── profile/
│   │   ├── ProfileHeader.tsx
│   │   ├── ProfileStats.tsx
│   │   ├── RaceManagement.tsx
│   │   ├── PlannedRaces.tsx
│   │   ├── CompletedRaces.tsx
│   │   ├── AddRaceModal.tsx
│   │   ├── EditRaceModal.tsx
│   │   └── PostRacePopup.tsx
├── hooks/
│   ├── useProfile.ts
│   ├── useRaces.ts
│   └── usePostRaceCheck.ts
└── services/
    └── raceService.ts
```

## Page Layout

### Desktop Layout (≥1024px)

```
┌───────────────────────────────────────────────────────────┐
│  [← Back to Dashboard]                                    │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  ┌────────┐  John Doe                               │ │
│  │  │ Avatar │  @johndoe_runs                          │ │
│  │  │  Photo │  San Francisco, CA                      │ │
│  │  └────────┘  Runner & Triathlete                    │ │
│  │              Member since Jan 2020                  │ │
│  │              42 Followers • 38 Following            │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  🎯 Planned Races                        [+ Add Race]│ │
│  │  ─────────────────────────────────────────────────  │ │
│  │                                                      │ │
│  │  ┌────────────────────────────────────────────────┐ │ │
│  │  │ 🏃 Chicago Marathon 2024            [Edit] [×] │ │ │
│  │  │ ──────────────────────────────────────────────│ │ │
│  │  │ 📅 October 13, 2024 (in 289 days)            │ │ │
│  │  │ 🎯 Goal: 3:30:00                              │ │ │
│  │  │ 📊 Estimated: 3:42:15 (based on fitness)      │ │ │
│  │  │ 📍 Chicago, IL                                │ │ │
│  │  │ ⭐ Target race for current training plan      │ │ │
│  │  └────────────────────────────────────────────────┘ │ │
│  │                                                      │ │
│  │  ┌────────────────────────────────────────────────┐ │ │
│  │  │ 🏊 Olympic Triathlon                 [Edit] [×]│ │ │
│  │  │ ──────────────────────────────────────────────│ │ │
│  │  │ 📅 May 15, 2024 (in 139 days)                │ │ │
│  │  │ 🎯 Goal: 2:15:00                              │ │ │
│  │  │ 📊 Estimated: 2:28:30                         │ │ │
│  │  │ 📍 San Francisco, CA                          │ │ │
│  │  └────────────────────────────────────────────────┘ │ │
│  │                                                      │ │
│  │  💡 Tip: Add races to help AI generate training    │ │
│  │     plans tailored to your goals                    │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  🏆 Completed Races                                 │ │
│  │  ─────────────────────────────────────────────────  │ │
│  │                                                      │ │
│  │  ┌────────────────────────────────────────────────┐ │ │
│  │  │ 🏃 New York Half Marathon                     │ │ │
│  │  │ ──────────────────────────────────────────────│ │ │
│  │  │ 📅 November 15, 2023                          │ │ │
│  │  │ 🎯 Goal: 1:35:00 • Actual: 1:32:45            │ │ │
│  │  │ ✅ Beat goal by 2:15!                         │ │ │
│  │  │ [View Activity]                               │ │ │
│  │  └────────────────────────────────────────────────┘ │ │
│  │                                                      │ │
│  │  ┌────────────────────────────────────────────────┐ │ │
│  │  │ 🏃 Boston Marathon                            │ │ │
│  │  │ ──────────────────────────────────────────────│ │ │
│  │  │ 📅 April 17, 2023                             │ │ │
│  │  │ 🎯 Goal: 3:15:00 • Actual: 3:18:22            │ │ │
│  │  │ [View Activity]                               │ │ │
│  │  └────────────────────────────────────────────────┘ │ │
│  │                                                      │ │
│  │  [View All Completed Races (8 total)]               │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  🔄 Strava Sync Status                              │ │
│  │  ─────────────────────────────────────────────────  │ │
│  │  ✓ All activities synced                            │ │
│  │  Last synced: 2 hours ago                           │ │
│  │  Total activities: 1,234                            │ │
│  │  [Sync Now] [Sync Settings]                        │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  📊 All-Time Statistics                             │ │
│  │  ─────────────────────────────────────────────────  │ │
│  │  🏃 Runs: 624 activities • 2,532 km • 752 hours     │ │
│  │  🚴 Rides: 312 activities • 5,354 km • 1,113 hours  │ │
│  │  🏊 Swims: 156 activities • 234 km • 187 hours      │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  [Edit Profile] [Settings] [Disconnect Strava] [Logout] │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Mobile Layout (<768px)

```
┌──────────────────────┐
│  [←] Profile         │
├──────────────────────┤
│                      │
│  ┌────────┐          │
│  │ Avatar │          │
│  └────────┘          │
│  John Doe            │
│  @johndoe_runs       │
│  San Francisco, CA   │
│                      │
│  42 • 38             │
│  Followers Following │
│                      │
├──────────────────────┤
│  🎯 Planned Races    │
│  [+ Add Race]        │
│                      │
│  ┌────────────────┐  │
│  │ Chicago        │  │
│  │ Marathon       │  │
│  │ Oct 13, 2024   │  │
│  │ Goal: 3:30:00  │  │
│  │ Est: 3:42:15   │  │
│  │ [Edit] [×]     │  │
│  └────────────────┘  │
│                      │
│  ┌────────────────┐  │
│  │ Olympic Tri    │  │
│  │ May 15, 2024   │  │
│  │ Goal: 2:15:00  │  │
│  │ [Edit] [×]     │  │
│  └────────────────┘  │
│                      │
├──────────────────────┤
│  🏆 Completed (8)    │
│  [View All]          │
│                      │
├──────────────────────┤
│  🔄 Strava Sync      │
│  ✓ Synced 2h ago     │
│  [Sync Now]          │
│                      │
└──────────────────────┘
```

## Add Race Modal

### Layout

```
┌─────────────────────────────────────────────────┐
│  Add Planned Race                          [×]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Race Name *                                    │
│  ┌─────────────────────────────────────────┐   │
│  │ Chicago Marathon 2024                   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Race Type *                                    │
│  ┌─────────────────────────────────────────┐   │
│  │ Marathon                            [▼] │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Race Date *                                    │
│  ┌─────────────────────────────────────────┐   │
│  │ 10/13/2024                          [📅]│   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Location (Optional)                            │
│  ┌─────────────────────────────────────────┐   │
│  │ Chicago, IL                             │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Goal Finish Time *                             │
│  ┌────┐  ┌────┐  ┌────┐                        │
│  │ 3h │: │30m │: │00s │                        │
│  └────┘  └────┘  └────┘                        │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 📊 Based on your current fitness:       │   │
│  │    Estimated finish time: 3:42:15       │   │
│  │    Your goal is achievable with         │   │
│  │    consistent training!                 │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ☐ Set as target race for training plan        │
│                                                 │
│  [Cancel]                    [Add Race]         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Race Type Dropdown Options

```
┌─────────────────────────────────┐
│ 🏃 Running                      │
│   • 5K                          │
│   • 10K                         │
│   • Half Marathon               │
│   • Marathon                    │
│   • Ultra 50K                   │
│   • Ultra 100K                  │
│                                 │
│ 🏊 Triathlon                    │
│   • Sprint Distance             │
│   • Olympic Distance            │
│   • Half Ironman (70.3)         │
│   • Full Ironman (140.6)        │
│                                 │
│ 🚴 Cycling                      │
│   • Century Ride (100mi)        │
│   • Gran Fondo (120km)          │
│                                 │
│ 📝 Custom                       │
└─────────────────────────────────┘
```

### Validation Rules

```javascript
{
  raceName: {
    required: true,
    minLength: 3,
    maxLength: 100
  },
  raceType: {
    required: true,
    enum: Object.keys(RACE_TYPES)
  },
  raceDate: {
    required: true,
    validate: (date) => {
      // Must be in the future
      return new Date(date) > new Date();
    },
    errorMessage: "Race date must be in the future"
  },
  location: {
    required: false,
    maxLength: 200
  },
  goalTime: {
    required: true,
    validate: (seconds) => {
      return seconds > 0 && seconds < 86400; // Max 24 hours
    }
  }
}
```

## Edit Race Modal

Same layout as Add Race Modal, but:

- Pre-populated with existing race data
- Title: "Edit Race"
- Button: "Save Changes"
- Additional option: [Delete Race] button at bottom (with confirmation)

## Post-Race Popup

### Congratulations Popup (Race Completed)

```
┌─────────────────────────────────────────────────┐
│                                                 │
│                     🎉                          │
│                                                 │
│           Congratulations on your race!         │
│                                                 │
│           Chicago Marathon 2024                 │
│           October 13, 2024                      │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  How did it go?                                 │
│                                                 │
│  Your goal was: 3:30:00                         │
│                                                 │
│  What was your finish time?                     │
│                                                 │
│  ┌────┐  ┌────┐  ┌────┐                        │
│  │ 3h │: │28m │: │45s │                        │
│  └────┘  └────┘  └────┘                        │
│                                                 │
│  🎯 You beat your goal by 1:15! Amazing work!  │
│                                                 │
│  [I didn't compete in this race]               │
│                                                 │
│  [Cancel]                    [Save Result]      │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Didn't Compete Confirmation

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Confirm Race Skip                              │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Are you sure you didn't compete in:            │
│                                                 │
│  Chicago Marathon 2024                          │
│  October 13, 2024                               │
│                                                 │
│  This race will be marked as skipped and        │
│  moved to your race history.                    │
│                                                 │
│  [Go Back]              [Confirm Skip]          │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Trigger Logic

The popup should appear when:

1. User logs in for the first time after race date has passed
2. Race status is still "planned"
3. `postRacePopupShown` is `false`
4. Race date is within the last 7 days (grace period)

## API Endpoints

### POST `/api/races`

Create a new planned race.

```typescript
Request Body: {
  raceName: string;
  raceType: string;
  raceDate: string; // ISO 8601
  location?: string;
  goalTime: number; // seconds
  isTargetRace?: boolean;
}

Response: {
  success: boolean;
  race: Race;
  estimatedTime: number; // AI-calculated
}
```

### GET `/api/races`

Get all races for authenticated user.

```typescript
Query Params:
  - status?: "planned" | "completed" | "skipped"
  - includeEstimates?: boolean

Response: {
  races: Race[];
  stats: {
    totalPlanned: number;
    totalCompleted: number;
    totalSkipped: number;
    upcomingRace?: Race; // Next race by date
  }
}
```

### GET `/api/races/:raceId`

Get single race details.

```typescript
Response: {
  race: Race;
}
```

### PATCH `/api/races/:raceId`

Update race details.

```typescript
Request Body: {
  raceName?: string;
  raceType?: string;
  raceDate?: string;
  location?: string;
  goalTime?: number;
  isTargetRace?: boolean;
}

Response: {
  success: boolean;
  race: Race;
  estimatedTime?: number; // Recalculated if relevant fields changed
}
```

### DELETE `/api/races/:raceId`

Delete a race.

```typescript
Response: {
  success: boolean;
  message: string;
}
```

### POST `/api/races/:raceId/complete`

Mark race as completed with actual finish time.

```typescript
Request Body: {
  actualFinishTime: number; // seconds
}

Response: {
  success: boolean;
  race: Race;
  comparison: {
    goalTime: number;
    actualTime: number;
    difference: number; // positive = beat goal, negative = missed goal
    percentageDifference: number;
  }
}
```

### POST `/api/races/:raceId/skip`

Mark race as skipped.

```typescript
Request Body: {
  skipReason?: string;
}

Response: {
  success: boolean;
  race: Race;
}
```

### GET `/api/races/check-post-race`

Check if there are races requiring post-race popup.

```typescript
Response: {
  hasPostRacePopup: boolean;
  race?: Race; // Race that needs popup
}
```

### POST `/api/races/:raceId/dismiss-popup`

Mark post-race popup as shown (if user closes without action).

```typescript
Response: {
  success: boolean;
}
```

## Race Service Implementation

### `services/raceService.ts`

```typescript
interface EstimatedTimeParams {
  raceType: string;
  userId: string;
  targetDate: Date;
}

class RaceService {
  /**
   * Calculate estimated finish time using AI analysis
   * This provides more accurate, context-aware predictions than simple calculations
   */
  async calculateEstimatedTime(params: EstimatedTimeParams): Promise<number> {
    const { raceType, userId, targetDate } = params;

    // Get user's recent activities (last 90 days for better analysis)
    const recentActivities = await this.getRecentActivities(userId, 90);

    // Get race distance and configuration
    const raceConfig = RACE_TYPES[raceType];

    // Prepare data for AI analysis
    const analysisData = this.prepareAnalysisData(
      recentActivities,
      raceConfig,
      targetDate
    );

    // Use AI to generate realistic estimate
    const aiEstimate = await this.getAIEstimate(analysisData);

    return aiEstimate;
  }

  /**
   * Prepare comprehensive data for AI analysis
   */
  private prepareAnalysisData(
    activities: Activity[],
    raceConfig: any,
    targetDate: Date
  ) {
    // Calculate time until race
    const daysUntilRace = Math.floor(
      (targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Get sport-specific activities
    const relevantActivities = activities.filter((a) => {
      if (raceConfig.sport === "run") return a.type === "Run";
      if (raceConfig.sport === "ride")
        return a.type === "Ride" || a.type === "VirtualRide";
      if (raceConfig.sport === "triathlon")
        return ["Run", "Ride", "VirtualRide", "Swim"].includes(a.type);
      return false;
    });

    // Calculate training metrics
    const metrics = {
      // Volume metrics
      totalDistance:
        relevantActivities.reduce((sum, a) => sum + (a.distance || 0), 0) /
        1000, // km
      totalTime:
        relevantActivities.reduce((sum, a) => sum + a.movingTime, 0) / 3600, // hours
      averageWeeklyDistance: this.calculateWeeklyAverage(
        relevantActivities,
        "distance"
      ),

      // Pace/speed metrics
      averagePace: this.calculateAveragePace(
        relevantActivities.filter((a) => a.type === "Run")
      ),
      bestRecentPace: this.getBestPace(
        relevantActivities.filter((a) => a.type === "Run"),
        30
      ),

      // Consistency metrics
      activitiesCount: relevantActivities.length,
      averageActivitiesPerWeek: relevantActivities.length / 12, // last ~90 days = ~12 weeks

      // Performance metrics
      longestDistance: Math.max(
        ...relevantActivities.map((a) => (a.distance || 0) / 1000)
      ),
      recentPRs: this.findRecentPRs(relevantActivities),

      // Heart rate metrics (if available)
      averageHR: this.calculateAverageHR(relevantActivities),
      hrTrend: this.calculateHRTrend(relevantActivities),
    };

    return {
      raceType: raceConfig,
      daysUntilRace,
      trainingMetrics: metrics,
      activityCount: relevantActivities.length,
    };
  }

  /**
   * Get AI-powered estimate using GPT-4o via Puter.js
   */
  private async getAIEstimate(data: any): Promise<number> {
    const prompt = `You are an expert running and triathlon coach. Analyze this athlete's training data and provide a realistic race time estimate.

Race Details:
- Type: ${
      data.raceType.sport === "run"
        ? `${data.raceType.distance}km run`
        : data.raceType.sport
    }
- Days until race: ${data.daysUntilRace}

Athlete's Training Data (last 90 days):
- Total distance: ${data.trainingMetrics.totalDistance.toFixed(1)}km
- Total training time: ${data.trainingMetrics.totalTime.toFixed(1)} hours
- Weekly average distance: ${data.trainingMetrics.averageWeeklyDistance.toFixed(
      1
    )}km
- Average pace: ${data.trainingMetrics.averagePace || "N/A"}
- Best recent pace (30 days): ${data.trainingMetrics.bestRecentPace || "N/A"}
- Longest single distance: ${data.trainingMetrics.longestDistance.toFixed(1)}km
- Activities per week: ${data.trainingMetrics.averageActivitiesPerWeek.toFixed(
      1
    )}
- Activity count: ${data.activityCount}

Provide ONLY a realistic finish time estimate in seconds as a single integer. Consider:
1. Current fitness level based on recent training
2. Time available for additional training before race
3. Race day performance typically being 3-5% better than training
4. Proper pacing strategy for the distance
5. Whether they have adequate training volume for this race

Response format: Just the number of seconds (e.g., "12600" for 3:30:00)`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 100,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      const result = await response.json();
      const estimateText = result.content[0].text.trim();
      const estimateSeconds = parseInt(estimateText);

      // Validate the estimate is reasonable
      if (
        isNaN(estimateSeconds) ||
        estimateSeconds < 0 ||
        estimateSeconds > 86400
      ) {
        // Fallback to calculation-based estimate
        console.warn("AI estimate invalid, using fallback calculation");
        return this.fallbackEstimate(data);
      }

      return estimateSeconds;
    } catch (error) {
      console.error("AI estimate failed, using fallback:", error);
      return this.fallbackEstimate(data);
    }
  }

  /**
   * Fallback calculation-based estimate if AI fails
   */
  private fallbackEstimate(data: any): number {
    const { raceType, trainingMetrics } = data;

    if (raceType.sport === "run") {
      // Use simple pace extrapolation
      const avgPaceSecondsPerKm = this.parsePace(trainingMetrics.averagePace);
      const raceDayFactor = 0.97; // Assume 3% improvement on race day
      return Math.round(
        avgPaceSecondsPerKm * raceType.distance * raceDayFactor
      );
    }

    // For other sports, provide conservative estimates
    return this.getConservativeEstimate(raceType);
  }

  /**
   * Helper: Parse pace string to seconds per km
   */
  private parsePace(paceString: string): number {
    if (!paceString) return 360; // Default 6:00/km
    const [min, sec] = paceString.split(":").map(Number);
    return min * 60 + sec;
  }

  /**
   * Helper: Conservative estimate based on race type
   */
  private getConservativeEstimate(raceType: any): number {
    const conservativePaces = {
      5: 1800, // 5K: 30:00 (6:00/km)
      10: 3900, // 10K: 65:00 (6:30/km)
      21.0975: 9000, // Half: 2:30:00 (7:06/km)
      42.195: 19800, // Marathon: 5:30:00 (7:50/km)
    };

    return conservativePaces[raceType.distance] || 7200; // Default 2 hours
  }

  /**
   * Check for races that need post-race popup
   */
  async checkPostRacePopup(userId: string): Promise<Race | null> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Find planned races where:
    // - Race date has passed
    // - Race date is within last 7 days
    // - Popup hasn't been shown yet
    const race = await db.collection("races").findOne({
      userId: new ObjectId(userId),
      status: "planned",
      raceDate: {
        $lt: now,
        $gte: sevenDaysAgo,
      },
      postRacePopupShown: false,
    });

    return race;
  }

  /**
   * Auto-cleanup: Move expired races older than 7 days to skipped
   */
  async autoCleanupExpiredRaces(userId: string): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    await db.collection("races").updateMany(
      {
        userId: new ObjectId(userId),
        status: "planned",
        raceDate: { $lt: sevenDaysAgo },
        postRacePopupShown: true, // Only cleanup if popup was shown
      },
      {
        $set: {
          status: "skipped",
          skipReason: "Auto-archived (no response to post-race popup)",
          skippedAt: new Date(),
        },
      }
    );
  }
}
```

## React Hooks

### `useRaces.ts`

```typescript
interface UseRacesReturn {
  races: Race[];
  plannedRaces: Race[];
  completedRaces: Race[];
  loading: boolean;
  error: string | null;
  addRace: (race: CreateRaceInput) => Promise<Race>;
  updateRace: (id: string, updates: UpdateRaceInput) => Promise<Race>;
  deleteRace: (id: string) => Promise<void>;
  completeRace: (id: string, finishTime: number) => Promise<void>;
  skipRace: (id: string, reason?: string) => Promise<void>;
  refreshRaces: () => Promise<void>;
}

export function useRaces(): UseRacesReturn {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch races on mount
  useEffect(() => {
    fetchRaces();
  }, []);

  const fetchRaces = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/races?includeEstimates=true");
      const data = await response.json();
      setRaces(data.races);
    } catch (err) {
      setError("Failed to load races");
    } finally {
      setLoading(false);
    }
  };

  const addRace = async (input: CreateRaceInput) => {
    const response = await fetch("/api/races", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const data = await response.json();
    setRaces([...races, data.race]);
    return data.race;
  };

  const completeRace = async (id: string, finishTime: number) => {
    const response = await fetch(`/api/races/${id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actualFinishTime: finishTime }),
    });

    const data = await response.json();

    // Update local state
    setRaces(races.map((r) => (r._id === id ? data.race : r)));
  };

  // ... other methods

  return {
    races,
    plannedRaces: races.filter((r) => r.status === "planned"),
    completedRaces: races.filter((r) => r.status === "completed"),
    loading,
    error,
    addRace,
    updateRace,
    deleteRace,
    completeRace,
    skipRace,
    refreshRaces: fetchRaces,
  };
}
```

### `usePostRaceCheck.ts`

```typescript
interface UsePostRaceCheckReturn {
  hasPostRacePopup: boolean;
  postRaceData: Race | null;
  dismissPopup: () => Promise<void>;
  completeRace: (finishTime: number) => Promise<void>;
  skipRace: () => Promise<void>;
}

export function usePostRaceCheck(): UsePostRaceCheckReturn {
  const [hasPostRacePopup, setHasPostRacePopup] = useState(false);
  const [postRaceData, setPostRaceData] = useState<Race | null>(null);

  useEffect(() => {
    checkForPostRacePopup();
  }, []);

  const checkForPostRacePopup = async () => {
    try {
      const response = await fetch("/api/races/check-post-race");
      const data = await response.json();

      if (data.hasPostRacePopup && data.race) {
        setHasPostRacePopup(true);
        setPostRaceData(data.race);
      }
    } catch (error) {
      console.error("Failed to check post-race popup:", error);
    }
  };

  const dismissPopup = async () => {
    if (!postRaceData) return;

    await fetch(`/api/races/${postRaceData._id}/dismiss-popup`, {
      method: "POST",
    });

    setHasPostRacePopup(false);
    setPostRaceData(null);
  };

  const completeRace = async (finishTime: number) => {
    if (!postRaceData) return;

    await fetch(`/api/races/${postRaceData._id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actualFinishTime: finishTime }),
    });

    setHasPostRacePopup(false);
    setPostRaceData(null);
  };

  const skipRace = async () => {
    if (!postRaceData) return;

    await fetch(`/api/races/${postRaceData._id}/skip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skipReason: "Did not compete" }),
    });

    setHasPostRacePopup(false);
    setPostRaceData(null);
  };

  return {
    hasPostRacePopup,
    postRaceData,
    dismissPopup,
    completeRace,
    skipRace,
  };
}
```
