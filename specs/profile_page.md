# Profile Page Specification

## Overview

This document specifies the profile page component that displays authenticated Strava user information and activity statistics. The page should be accessible only to authenticated users and display data fetched from the Strava API.

## Route

```
/profile
```

## Access Control

- **Protected Route**: Yes
- **Authentication Required**: Yes
- **Redirect if Unauthenticated**: `/login`

## Component Structure

```
src/
├── pages/
│   └── ProfilePage.tsx
├── components/
│   ├── profile/
│   │   ├── ProfileHeader.tsx
│   │   ├── ProfileStats.tsx
│   │   ├── ActivityList.tsx
│   │   ├── ActivityCard.tsx
│   │   └── ProfileSkeleton.tsx
├── hooks/
│   ├── useProfile.ts
│   └── useActivities.ts
└── services/
    └── stravaApi.ts
```

## Data Requirements

### Athlete Profile Data

Fetch detailed athlete information from Strava API.

**Endpoint:** `GET https://www.strava.com/api/v3/athlete`

**Headers:**

```
Authorization: Bearer ACCESS_TOKEN
```

**Response:**

```json
{
  "id": 123456,
  "username": "athlete_username",
  "resource_state": 3,
  "firstname": "John",
  "lastname": "Doe",
  "bio": "Cyclist and runner",
  "city": "San Francisco",
  "state": "California",
  "country": "United States",
  "sex": "M",
  "premium": false,
  "summit": false,
  "created_at": "2020-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z",
  "badge_type_id": 0,
  "weight": 75.0,
  "profile_medium": "https://dgalywyr863hv.cloudfront.net/pictures/athletes/123456/123456/2/medium.jpg",
  "profile": "https://dgalywyr863hv.cloudfront.net/pictures/athletes/123456/123456/2/large.jpg",
  "friend": null,
  "follower": null,
  "follower_count": 42,
  "friend_count": 38,
  "mutual_friend_count": 0,
  "athlete_type": 1,
  "date_preference": "%m/%d/%Y",
  "measurement_preference": "feet",
  "clubs": [],
  "ftp": null,
  "bikes": [],
  "shoes": []
}
```

### Athlete Statistics

Fetch aggregate statistics for the athlete.

**Endpoint:** `GET https://www.strava.com/api/v3/athletes/{id}/stats`

**Headers:**

```
Authorization: Bearer ACCESS_TOKEN
```

**Response:**

```json
{
  "biggest_ride_distance": 153850.0,
  "biggest_climb_elevation_gain": 2130.5,
  "recent_ride_totals": {
    "count": 5,
    "distance": 82560.4,
    "moving_time": 18532,
    "elapsed_time": 20234,
    "elevation_gain": 1534.2,
    "achievement_count": 3
  },
  "recent_run_totals": {
    "count": 8,
    "distance": 42195.0,
    "moving_time": 12532,
    "elapsed_time": 13234,
    "elevation_gain": 423.5,
    "achievement_count": 5
  },
  "recent_swim_totals": {
    "count": 2,
    "distance": 3000.0,
    "moving_time": 2400,
    "elapsed_time": 2500,
    "elevation_gain": 0,
    "achievement_count": 0
  },
  "ytd_ride_totals": {
    "count": 52,
    "distance": 892560.4,
    "moving_time": 185320,
    "elapsed_time": 202340,
    "elevation_gain": 15342.8
  },
  "ytd_run_totals": {
    "count": 104,
    "distance": 421950.0,
    "moving_time": 125320,
    "elapsed_time": 132340,
    "elevation_gain": 4235.2
  },
  "ytd_swim_totals": {
    "count": 26,
    "distance": 39000.0,
    "moving_time": 31200,
    "elapsed_time": 32500,
    "elevation_gain": 0
  },
  "all_ride_totals": {
    "count": 312,
    "distance": 5353560.4,
    "moving_time": 1112532,
    "elapsed_time": 1213234,
    "elevation_gain": 92068.4
  },
  "all_run_totals": {
    "count": 624,
    "distance": 2531730.0,
    "moving_time": 751920,
    "elapsed_time": 792804,
    "elevation_gain": 25411.2
  },
  "all_swim_totals": {
    "count": 156,
    "distance": 234000.0,
    "moving_time": 187200,
    "elapsed_time": 195000,
    "elevation_gain": 0
  }
}
```

### Recent Activities

Fetch the athlete's recent activities (optional for profile page).

**Endpoint:** `GET https://www.strava.com/api/v3/athlete/activities`

**Query Parameters:**

- `page`: Page number (default: 1)
- `per_page`: Number of items per page (default: 30, max: 200)

**Headers:**

```
Authorization: Bearer ACCESS_TOKEN
```

**Response:**

```json
[
  {
    "id": 987654321,
    "name": "Morning Ride",
    "distance": 20540.3,
    "moving_time": 3682,
    "elapsed_time": 3920,
    "total_elevation_gain": 234.5,
    "type": "Ride",
    "sport_type": "Ride",
    "start_date": "2024-12-14T08:30:00Z",
    "start_date_local": "2024-12-14T09:30:00+01:00",
    "timezone": "(GMT+01:00) Europe/Brussels",
    "average_speed": 5.58,
    "max_speed": 12.4,
    "has_heartrate": true,
    "average_heartrate": 145.2,
    "max_heartrate": 178.0,
    "elev_high": 234.5,
    "elev_low": 12.3,
    "achievement_count": 2,
    "kudos_count": 12,
    "comment_count": 3,
    "athlete_count": 1,
    "photo_count": 0,
    "map": {
      "id": "a12345678",
      "summary_polyline": "encoded_polyline_string",
      "resource_state": 2
    }
  }
]
```

## Page Layout Specification

### Desktop Layout (≥1024px)

```
┌─────────────────────────────────────────────────────┐
│  Header Navigation                                   │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌───────────────────────────────────────────────┐  │
│  │  Profile Header                                │  │
│  │  ┌────────┐  John Doe                         │  │
│  │  │ Avatar │  @athlete_username                 │  │
│  │  │  Photo │  San Francisco, CA                 │  │
│  │  └────────┘  Cyclist and runner                │  │
│  │              Member since Jan 2020             │  │
│  │              42 Followers • 38 Following       │  │
│  └───────────────────────────────────────────────┘  │
│                                                       │
│  ┌───────────────────────────────────────────────┐  │
│  │  Statistics Summary                            │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐      │  │
│  │  │  Recent  │ │   YTD    │ │ All Time │      │  │
│  │  │  4 Weeks │ │   2024   │ │  Total   │      │  │
│  │  └──────────┘ └──────────┘ └──────────┘      │  │
│  │                                                 │  │
│  │  Rides: 5 • 82.6km • 5h 9m                    │  │
│  │  Runs: 8 • 42.2km • 3h 29m                    │  │
│  │  Elevation: 1,958m                             │  │
│  └───────────────────────────────────────────────┘  │
│                                                       │
│  ┌───────────────────────────────────────────────┐  │
│  │  Recent Activities (Optional)                  │  │
│  │  ┌────────────────────────────────────────┐   │  │
│  │  │ 🚴 Morning Ride      Dec 14, 2024      │   │  │
│  │  │ 20.5km • 1h 1m • ↑234m                 │   │  │
│  │  └────────────────────────────────────────┘   │  │
│  │  ┌────────────────────────────────────────┐   │  │
│  │  │ 🏃 Evening Run       Dec 13, 2024      │   │  │
│  │  │ 10.2km • 52m • ↑125m                   │   │  │
│  │  └────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────┘  │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Mobile Layout (<768px)

```
┌──────────────────────┐
│  Header              │
├──────────────────────┤
│                      │
│  ┌────────┐          │
│  │ Avatar │          │
│  └────────┘          │
│  John Doe            │
│  @athlete_username   │
│  San Francisco, CA   │
│                      │
│  42 • 38             │
│  Followers Following │
│                      │
├──────────────────────┤
│  [Recent] [YTD] [All]│
│                      │
│  🚴 Rides            │
│  5 rides • 82.6km    │
│                      │
│  🏃 Runs             │
│  8 runs • 42.2km     │
│                      │
│  ⛰️ Elevation        │
│  1,958m gained       │
│                      │
├──────────────────────┤
│  Recent Activities   │
│  ┌────────────────┐  │
│  │ Morning Ride   │  │
│  │ 20.5km • 1h 1m │  │
│  └────────────────┘  │
│                      │
└──────────────────────┘
```

## Component Specifications

### ProfileHeader Component

**Props:**

```typescript
interface ProfileHeaderProps {
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
    username: string;
    profile: string;
    bio?: string;
    city?: string;
    state?: string;
    country?: string;
    created_at: string;
    follower_count: number;
    friend_count: number;
  };
}
```

**Features:**

- Display large avatar image (150x150px desktop, 100x100px mobile)
- Show full name and username
- Display location (city, state)
- Show bio if available
- Display "Member since" date
- Show follower and following counts
- Fallback avatar if profile image fails to load

### ProfileStats Component

**Props:**

```typescript
interface ProfileStatsProps {
  stats: {
    recent_ride_totals: StatTotals;
    recent_run_totals: StatTotals;
    recent_swim_totals: StatTotals;
    ytd_ride_totals: StatTotals;
    ytd_run_totals: StatTotals;
    ytd_swim_totals: StatTotals;
    all_ride_totals: StatTotals;
    all_run_totals: StatTotals;
    all_swim_totals: StatTotals;
  };
}

interface StatTotals {
  count: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  elevation_gain: number;
}
```

**Features:**

- Tab navigation for Recent (4 weeks), YTD, All Time
- Display statistics for each activity type (Ride, Run, Swim)
- Format distances in km or miles based on user preference
- Format time as hours and minutes
- Format elevation with appropriate units
- Show activity counts
- Responsive grid layout
- Empty state if no activities exist

### ActivityCard Component (Optional)

**Props:**

```typescript
interface ActivityCardProps {
  activity: {
    id: number;
    name: string;
    type: string;
    sport_type: string;
    distance: number;
    moving_time: number;
    total_elevation_gain: number;
    start_date: string;
    kudos_count: number;
    comment_count: number;
  };
  onClick?: (id: number) => void;
}
```

**Features:**

- Activity type icon (🚴 Ride, 🏃 Run, 🏊 Swim)
- Activity name
- Date (formatted as "Dec 14, 2024")
- Distance, duration, elevation
- Kudos and comment counts
- Clickable to view activity details
- Hover effect

## Data Formatting Utilities

### Distance Formatting

```typescript
function formatDistance(meters: number, unit: "metric" | "imperial"): string {
  if (unit === "imperial") {
    const miles = meters * 0.000621371;
    return `${miles.toFixed(1)}mi`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)}km`;
}
```

### Time Formatting

```typescript
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
```

### Elevation Formatting

```typescript
function formatElevation(meters: number, unit: "metric" | "imperial"): string {
  if (unit === "imperial") {
    const feet = meters * 3.28084;
    return `${Math.round(feet)}ft`;
  }
  return `${Math.round(meters)}m`;
}
```

### Date Formatting

```typescript
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
```

## Loading States

### Initial Load

Display skeleton screens for all sections:

- Profile header skeleton (avatar placeholder, text lines)
- Statistics skeleton (card placeholders)
- Activity list skeleton (card placeholders)

### Error States

Handle various error scenarios:

- **Network Error**: "Unable to load profile. Please check your connection."
- **API Error**: "Unable to fetch data from Strava. Please try again."
- **No Data**: "No activities found. Start tracking your workouts!"
- **Token Expired**: Automatically refresh token and retry

## Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 767px) {
  - Single column layout
  - Stacked statistics
  - Smaller avatar (100px)
  - Compact activity cards
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  - Two column layout for stats
  - Medium avatar (125px)
}

/* Desktop */
@media (min-width: 1024px) {
  - Multi-column layout
  - Large avatar (150px)
  - Full activity details
  - Max width: 1200px centered
}
```

## Accessibility Requirements

- **Semantic HTML**: Use appropriate heading hierarchy (h1, h2, h3)
- **Alt Text**: Provide descriptive alt text for avatar images
- **Keyboard Navigation**: All interactive elements must be keyboard accessible
- **ARIA Labels**: Add labels for icon-only buttons
- **Focus Indicators**: Visible focus states for all interactive elements
- **Color Contrast**: Minimum WCAG AA contrast ratios
- **Screen Reader**: Announce loading and error states

## Performance Considerations

- **Image Optimization**: Lazy load avatar images
- **Data Caching**: Cache profile and stats data (TTL: 5 minutes)
- **Pagination**: Implement infinite scroll or pagination for activities
- **Debouncing**: Debounce tab switches to prevent excessive API calls
- **Skeleton Loading**: Show content progressively as data loads

## User Preferences

Fetch and respect user preferences from Strava athlete data:

- **Date Format**: Use `date_preference` field
- **Measurement Units**: Use `measurement_preference` (feet/meters)
- **Timezone**: Use athlete's timezone for date display

## Testing Checklist

- [ ] Profile data loads correctly
- [ ] Statistics display for all time periods (Recent, YTD, All Time)
- [ ] Proper unit conversion (metric/imperial)
- [ ] Tab switching works smoothly
- [ ] Loading states display correctly
- [ ] Error states handle gracefully
- [ ] Responsive on all screen sizes
- [ ] Accessibility requirements met
- [ ] Images load with fallbacks
- [ ] Token refresh on 401 errors
- [ ] Empty states for users with no activities

## Future Enhancements

- Edit profile functionality
- Activity filtering and search
- Personal records section
- Achievement badges display
- Gear (bikes/shoes) management
- Training calendar integration
- Social features (followers list)

## API Rate Limit Handling

Monitor rate limits and implement appropriate strategies:

- Cache responses to minimize API calls
- Display cached data with "last updated" timestamp
- Show warning when approaching rate limits
- Queue requests during high usage
- Exponential backoff for failed requests
