const STRAVA_BASE_URL = 'https://www.strava.com/api/v3';
const USE_MOCK = process.env.USE_STRAVA_MOCK === 'true';

// Custom error for rate limit hits
export class RateLimitError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Type definitions
export interface StravaAthlete {
  id: number;
  username: string;
  resource_state: number;
  firstname: string;
  lastname: string;
  bio?: string;
  city?: string;
  state?: string;
  country?: string;
  sex?: string;
  premium: boolean;
  summit: boolean;
  created_at: string;
  updated_at: string;
  badge_type_id: number;
  weight?: number;
  profile_medium: string;
  profile: string;
  friend?: string;
  follower?: string;
  follower_count: number;
  friend_count: number;
  mutual_friend_count: number;
  athlete_type: number;
  date_preference: string;
  measurement_preference: string;
  clubs: any[];
  ftp?: number;
  bikes: any[];
  shoes: any[];
}

export interface StatTotals {
  count: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  elevation_gain: number;
  achievement_count?: number;
}

export interface AthleteStats {
  biggest_ride_distance: number;
  biggest_climb_elevation_gain: number;
  recent_ride_totals: StatTotals;
  recent_run_totals: StatTotals;
  recent_swim_totals: StatTotals;
  recent_workout_totals: StatTotals;
  ytd_ride_totals: StatTotals;
  ytd_run_totals: StatTotals;
  ytd_swim_totals: StatTotals;
  ytd_workout_totals: StatTotals;
  all_ride_totals: StatTotals;
  all_run_totals: StatTotals;
  all_swim_totals: StatTotals;
  all_workout_totals: StatTotals;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  timezone: string;
  average_speed: number;
  max_speed: number;
  has_heartrate: boolean;
  average_heartrate?: number;
  max_heartrate?: number;
  elev_high: number;
  elev_low: number;
  achievement_count: number;
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  map: {
    id: string;
    summary_polyline?: string;
    resource_state: number;
  };
}

export interface StravaActivityDetail extends StravaActivity {
  description?: string;
  photos?: any[];
  calories?: number;
  segment_efforts?: any[];
  device_name?: string;
  embed_token?: string;
  splits_metric?: any[];
  splits_standard?: any[];
  laps?: any[];
  average_cadence?: number;
}

export interface StravaStream {
  type: string;
  data: number[] | [number, number][];
  series_type: string;
  original_size: number;
  resolution: string;
}

// RateLimitManager class as specified in the background syncer spec
class RateLimitManager {
  private requestsThisWindow: number = 0;
  private requestsToday: number = 0;
  private currentWindow: Date;
  private dailyResetTime: Date;

  constructor() {
    this.currentWindow = this.getCurrentWindow();
    this.dailyResetTime = this.getNextDailyReset();
  }

  getCurrentWindow(): Date {
    const now = new Date();
    const minutes = now.getMinutes();
    const windowStart = Math.floor(minutes / 15) * 15;
    now.setMinutes(windowStart, 0, 0);
    return now;
  }

  getNextWindowReset(): Date {
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

  getNextDailyReset(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  async checkAndWait(): Promise<void> {
    if (USE_MOCK) return; // No rate limiting in mock mode

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
      const waitTime = this.getNextWindowReset().getTime() - now.getTime();
      if (waitTime > 0) {
        console.log(`Rate limit approaching. Waiting ${Math.ceil(waitTime / 1000)}s until next window.`);
        await this.sleep(waitTime + 1000); // Add 1 second buffer
        this.requestsThisWindow = 0;
        this.currentWindow = this.getCurrentWindow();
      }
    }

    // Check daily limit
    if (this.requestsToday >= 950) {
      const waitTime = this.dailyResetTime.getTime() - now.getTime();
      if (waitTime > 0) {
        console.log(`Daily limit approaching. Waiting ${Math.ceil(waitTime / 1000)}s until tomorrow.`);
        await this.sleep(waitTime + 1000);
        this.requestsToday = 0;
        this.dailyResetTime = this.getNextDailyReset();
      }
    }

    // Increment counters
    this.requestsThisWindow++;
    this.requestsToday++;
  }

  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Method to pause sync strategically (2 minutes before reset)
  shouldPauseBeforeReset(): boolean {
    const now = new Date();
    const nextReset = this.getNextWindowReset();
    const timeUntilReset = nextReset.getTime() - now.getTime();

    // Pause if less than 2 minutes until reset and we're near the limit
    return timeUntilReset < 120000 && this.requestsThisWindow >= 90;
  }

  // Get current rate limit status
  getStatus() {
    return {
      requestsThisWindow: this.requestsThisWindow,
      requestsToday: this.requestsToday,
      currentWindowStart: this.currentWindow,
      nextWindowReset: this.getNextWindowReset(),
      dailyResetTime: this.dailyResetTime,
    };
  }

  async makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    await this.checkAndWait();

    if (USE_MOCK) {
      console.log(`[MOCK] Making request to: ${url}`);
      return this.getMockResponse<T>(url, options);
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': (options.headers as any)?.['Authorization'] || '',
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limit exceeded
        const retryAfter = response.headers.get('Retry-After');
        const retryAfterSeconds = retryAfter ? parseInt(retryAfter) : undefined;
        throw new RateLimitError(`Rate limit exceeded. ${retryAfter ? `Retry after ${retryAfterSeconds} seconds.` : ''}`, retryAfterSeconds);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  private getMockResponse<T>(url: string, options: RequestInit = {}): T {
    // Mock responses for development
    if (url.includes('/athlete')) {
      return {
        id: 12345,
        username: 'testuser',
        firstname: 'Test',
        lastname: 'User',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
        sex: 'M',
        premium: true,
        summit: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        badge_type_id: 4,
        weight: 70,
        profile_medium: 'https://example.com/profile_medium.jpg',
        profile: 'https://example.com/profile.jpg',
        friend: null,
        follower: null,
        follower_count: 10,
        friend_count: 5,
        mutual_friend_count: 2,
        athlete_type: 1,
        date_preference: '%m/%d/%Y',
        measurement_preference: 'meters',
        clubs: [],
        ftp: 250,
        bikes: [],
        shoes: [],
      } as T;
    }

    if (url.includes('/athletes/') && url.includes('/stats')) {
      return {
        biggest_ride_distance: 100000,
        biggest_climb_elevation_gain: 2000,
        recent_ride_totals: { count: 5, distance: 200000, moving_time: 18000, elapsed_time: 20000, elevation_gain: 1000 },
        recent_run_totals: { count: 3, distance: 30000, moving_time: 9000, elapsed_time: 9500, elevation_gain: 200 },
        recent_swim_totals: { count: 0, distance: 0, moving_time: 0, elapsed_time: 0, elevation_gain: 0 },
        ytd_ride_totals: { count: 50, distance: 2000000, moving_time: 180000, elapsed_time: 200000, elevation_gain: 10000 },
        ytd_run_totals: { count: 30, distance: 300000, moving_time: 90000, elapsed_time: 95000, elevation_gain: 2000 },
        ytd_swim_totals: { count: 0, distance: 0, moving_time: 0, elapsed_time: 0, elevation_gain: 0 },
        all_ride_totals: { count: 200, distance: 10000000, moving_time: 900000, elapsed_time: 1000000, elevation_gain: 50000 },
        all_run_totals: { count: 150, distance: 1500000, moving_time: 450000, elapsed_time: 475000, elevation_gain: 10000 },
        all_swim_totals: { count: 0, distance: 0, moving_time: 0, elapsed_time: 0, elevation_gain: 0 },
      } as T;
    }

    if (url.includes('/athlete/activities')) {
      const mockActivities = [];
      for (let i = 1; i <= 30; i++) {
        mockActivities.push({
          id: 1000000 + i,
          name: `Mock Activity ${i}`,
          distance: Math.random() * 50000 + 10000, // 10-60km
          moving_time: Math.random() * 7200 + 1800, // 30min-2.5hrs
          elapsed_time: Math.random() * 8000 + 2000,
          total_elevation_gain: Math.random() * 1000 + 100,
          type: Math.random() > 0.5 ? 'Ride' : 'Run',
          sport_type: Math.random() > 0.5 ? 'Ride' : 'Run',
          start_date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          start_date_local: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          timezone: 'America/New_York',
          average_speed: Math.random() * 10 + 5,
          max_speed: Math.random() * 20 + 10,
          has_heartrate: Math.random() > 0.3,
          average_heartrate: Math.random() * 40 + 120,
          max_heartrate: Math.random() * 40 + 160,
          elev_high: Math.random() * 500 + 200,
          elev_low: Math.random() * 200,
          achievement_count: Math.floor(Math.random() * 5),
          kudos_count: Math.floor(Math.random() * 20),
          comment_count: Math.floor(Math.random() * 5),
          athlete_count: Math.floor(Math.random() * 10) + 1,
          photo_count: 0,
          map: {
            id: `map_${1000000 + i}`,
            summary_polyline: null,
            resource_state: 2,
          },
        });
      }
      return mockActivities as T;
    }

    if (url.includes('/activities/') && !url.includes('/streams')) {
      const activityId = parseInt(url.split('/activities/')[1]);
      return {
        id: activityId,
        name: `Mock Activity Detail ${activityId}`,
        distance: Math.random() * 50000 + 10000,
        moving_time: Math.random() * 7200 + 1800,
        elapsed_time: Math.random() * 8000 + 2000,
        total_elevation_gain: Math.random() * 1000 + 100,
        type: Math.random() > 0.5 ? 'Ride' : 'Run',
        sport_type: Math.random() > 0.5 ? 'Ride' : 'Run',
        start_date: new Date().toISOString(),
        start_date_local: new Date().toISOString(),
        timezone: 'America/New_York',
        average_speed: Math.random() * 10 + 5,
        max_speed: Math.random() * 20 + 10,
        has_heartrate: Math.random() > 0.3,
        average_heartrate: Math.random() * 40 + 120,
        max_heartrate: Math.random() * 40 + 160,
        elev_high: Math.random() * 500 + 200,
        elev_low: Math.random() * 200,
        achievement_count: Math.floor(Math.random() * 5),
        kudos_count: Math.floor(Math.random() * 20),
        comment_count: Math.floor(Math.random() * 5),
        athlete_count: Math.floor(Math.random() * 10) + 1,
        photo_count: 0,
        description: `Mock description for activity ${activityId}`,
        photos: [],
        calories: Math.random() * 1000 + 500,
        segment_efforts: [],
        device_name: 'Mock Device',
        embed_token: 'mock_token',
        splits_metric: [],
        splits_standard: [],
        laps: [],
        map: {
          id: `map_${activityId}`,
          summary_polyline: null,
          resource_state: 3,
        },
      } as T;
    }

    if (url.includes('/streams')) {
      return {
        time: { type: 'time', data: Array.from({ length: 100 }, () => Math.floor(Math.random() * 3600)), series_type: 'time', original_size: 100, resolution: 'high' },
        distance: { type: 'distance', data: Array.from({ length: 100 }, () => Math.random() * 50000), series_type: 'distance', original_size: 100, resolution: 'high' },
        heartrate: { type: 'heartrate', data: Array.from({ length: 100 }, () => Math.floor(Math.random() * 40 + 120)), series_type: 'time', original_size: 100, resolution: 'high' },
        pace: { type: 'pace', data: Array.from({ length: 100 }, () => Math.random() * 5 + 2), series_type: 'time', original_size: 100, resolution: 'high' },
        cadence: { type: 'cadence', data: Array.from({ length: 100 }, () => Math.floor(Math.random() * 20 + 80)), series_type: 'time', original_size: 100, resolution: 'high' },
        watts: { type: 'watts', data: Array.from({ length: 100 }, () => Math.floor(Math.random() * 100 + 150)), series_type: 'time', original_size: 100, resolution: 'high' },
        altitude: { type: 'altitude', data: Array.from({ length: 100 }, () => Math.random() * 500 + 100), series_type: 'distance', original_size: 100, resolution: 'high' },
        latlng: { type: 'latlng', data: Array.from({ length: 100 }, () => [40 + Math.random() * 2, -74 + Math.random() * 2]), series_type: 'distance', original_size: 100, resolution: 'high' },
      } as T;
    }

    // Default mock response
    return {} as T;
  }
}

const rateLimiter = new RateLimitManager();

// API Functions
export async function fetchAthlete(accessToken: string): Promise<StravaAthlete> {
  return rateLimiter.makeRequest<StravaAthlete>(`${STRAVA_BASE_URL}/athlete`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
}

export async function fetchAthleteStats(accessToken: string, athleteId: number): Promise<AthleteStats> {
  return rateLimiter.makeRequest<AthleteStats>(`${STRAVA_BASE_URL}/athletes/${athleteId}/stats`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
}

export async function fetchActivities(accessToken: string, page: number = 1, perPage: number = 30, after?: number, before?: number): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });

  if (after) {
    params.append('after', after.toString());
  }

  if (before) {
    params.append('before', before.toString());
  }

  return rateLimiter.makeRequest<StravaActivity[]>(`${STRAVA_BASE_URL}/athlete/activities?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
}

export async function fetchActivityDetail(accessToken: string, activityId: number): Promise<StravaActivityDetail> {
  return rateLimiter.makeRequest<StravaActivityDetail>(`${STRAVA_BASE_URL}/activities/${activityId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
}

export async function fetchActivityStreams(accessToken: string, activityId: number, streams: string[]): Promise<Record<string, StravaStream>> {
  const streamsParam = streams.join(',');
  return rateLimiter.makeRequest<Record<string, StravaStream>>(`${STRAVA_BASE_URL}/activities/${activityId}/streams?keys=${streamsParam}&key_by_type=true`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
}

export async function fetchAllActivityIds(accessToken: string, before?: number): Promise<number[]> {
  const allActivityIds: number[] = [];
  let page = 1;
  const perPage = 200; // Strava max

  while (true) {
    const activities = await fetchActivities(accessToken, page, perPage, undefined, before);

    if (activities.length === 0) {
      break; // No more activities
    }

    // Extract just the IDs
    allActivityIds.push(...activities.map(activity => activity.id));

    if (activities.length < perPage) {
      break; // Last page
    }

    page++;
  }
  console.log("Total count of activities: ", allActivityIds.length)
  return allActivityIds;
}
