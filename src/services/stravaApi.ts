const STRAVA_BASE_URL = 'https://www.strava.com/api/v3';

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
  ytd_ride_totals: StatTotals;
  ytd_run_totals: StatTotals;
  ytd_swim_totals: StatTotals;
  all_ride_totals: StatTotals;
  all_run_totals: StatTotals;
  all_swim_totals: StatTotals;
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

export async function fetchAthlete(accessToken: string): Promise<StravaAthlete> {
  const response = await fetch(`${STRAVA_BASE_URL}/athlete`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch athlete data');
  }

  return response.json();
}

export async function fetchAthleteStats(accessToken: string, athleteId: number): Promise<AthleteStats> {
  const response = await fetch(`${STRAVA_BASE_URL}/athletes/${athleteId}/stats`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch athlete stats');
  }

  return response.json();
}

export async function fetchActivities(accessToken: string, page: number = 1, perPage: number = 30): Promise<StravaActivity[]> {
  const response = await fetch(`${STRAVA_BASE_URL}/athlete/activities?page=${page}&per_page=${perPage}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch activities');
  }

  return response.json();
}
