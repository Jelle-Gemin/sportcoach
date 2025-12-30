import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { StravaActivity } from '@/services/stravaApi';

// Cache for 5 minutes with stale-while-revalidate
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};

// Projection for list view - exclude heavy fields
const LIST_PROJECTION = {
  streams: 0,
  laps: 0,
  splits_metric: 0,
  splits_standard: 0,
  segment_efforts: 0,
  photos: 0,
};

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    let accessToken = cookieStore.get('accessToken')?.value;
    const expiresAt = cookieStore.get('expiresAt')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if token is expired and refresh if needed
    const now = Date.now() / 1000;
    if (expiresAt && now > parseInt(expiresAt)) {
      const refreshToken = cookieStore.get('refreshToken')?.value;
      if (!refreshToken) {
        return NextResponse.json({ error: 'Token expired and no refresh token available' }, { status: 401 });
      }

      try {
        const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!refreshResponse.ok) {
          return NextResponse.json({ error: 'Failed to refresh token' }, { status: 401 });
        }

        const refreshData = await refreshResponse.json();
        accessToken = refreshData.accessToken;
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
      }
    }

    // Get athlete ID from cookie
    const athleteCookie = cookieStore.get('athlete')?.value;
    if (!athleteCookie) {
      return NextResponse.json({ error: 'Athlete data not found in session' }, { status: 401 });
    }

    const athleteData = JSON.parse(athleteCookie);
    const athleteId = athleteData.id;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    // Use connection pool
    const db = await getDb();
    const activitiesCollection = db.collection('activities');

    // Build query
    const query: Record<string, unknown> = {
      athleteId: { $in: [athleteId, athleteId.toString()] }
    };
    if (type) query.type = type;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) (query.date as Record<string, Date>).$gte = startDate;
      if (endDate) (query.date as Record<string, Date>).$lte = endDate;
    }

    // Use Promise.all for parallel queries
    const [total, activities] = await Promise.all([
      activitiesCollection.countDocuments(query),
      activitiesCollection
        .find(query)
        .project(LIST_PROJECTION)  // Exclude heavy fields
        .sort({ date: -1 })
        .skip(offset)
        .limit(limit)
        .toArray()
    ]);

    // Transform ActivityDocument to StravaActivity format
    const transformedActivities: StravaActivity[] = activities.map(activity => ({
      id: activity.stravaId,
      name: activity.name || `Activity ${activity.stravaId}`,
      distance: activity.distance || 0,
      moving_time: activity.movingTime || activity.moving_time || 0,
      elapsed_time: activity.elapsedTime || activity.elapsed_time || 0,
      total_elevation_gain: activity.total_elevation_gain || 0,
      type: activity.type || 'Workout',
      sport_type: activity.type || 'Workout',
      start_date: activity.date?.toISOString() || activity.start_date,
      start_date_local: activity.date?.toISOString() || activity.start_date_local,
      timezone: activity.timezone || 'UTC',
      average_speed: activity.average_speed || 0,
      max_speed: activity.max_speed || 0,
      has_heartrate: !!(activity.avgHR || activity.maxHR || activity.average_heartrate),
      average_heartrate: activity.avgHR || activity.average_heartrate,
      max_heartrate: activity.maxHR || activity.max_heartrate,
      elev_high: activity.elev_high,
      elev_low: activity.elev_low,
      achievement_count: 0,
      kudos_count: 0,
      comment_count: 0,
      athlete_count: 1,
      photo_count: 0,
      map: {
        id: `map_${activity.stravaId}`,
        summary_polyline: activity.map?.summary_polyline,
        resource_state: 2,
      },
    }));

    return NextResponse.json(
      {
        activities: transformedActivities,
        total,
        hasMore: offset + limit < total,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error('Activities API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
