import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { StravaSync } from '@/services/stravaSync';
import { StravaActivity } from '@/services/stravaApi';

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
      // Token is expired, try to refresh
      const refreshToken = cookieStore.get('refreshToken')?.value;
      if (!refreshToken) {
        return NextResponse.json({ error: 'Token expired and no refresh token available' }, { status: 401 });
      }

      try {
        const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    // Initialize MongoDB connection
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'strava_data';

    const stravaSync = new StravaSync(mongoUri, dbName);
    await stravaSync.connect();

    try {
      // Immediately return activities from database
      const result = await stravaSync.getActivities(limit, offset, type, startDate, endDate);

      // Transform ActivityDocument to StravaActivity format
      const transformedActivities: StravaActivity[] = result.activities.map(activity => ({
        id: activity.stravaId,
        name: activity.description || `Activity ${activity.stravaId}`,
        distance: activity.distance || 0,
        moving_time: activity.movingTime || 0,
        elapsed_time: activity.elapsedTime || 0,
        total_elevation_gain: activity.total_elevation_gain || 0,
        type: activity.type || 'Workout',
        sport_type: activity.type || 'Workout',
        start_date: activity.date.toISOString(),
        start_date_local: activity.date.toISOString(),
        timezone: 'UTC',
        average_speed: 0, // Not stored in DB
        max_speed: 0, // Not stored in DB
        has_heartrate: !!(activity.avgHR || activity.maxHR),
        average_heartrate: activity.avgHR,
        max_heartrate: activity.maxHR,
        elev_high: 0, // Not stored in DB
        elev_low: 0, // Not stored in DB
        achievement_count: 0, // Not stored in DB
        kudos_count: 0, // Not stored in DB
        comment_count: 0, // Not stored in DB
        athlete_count: 1, // Not stored in DB
        photo_count: 0, // Not stored in DB
        map: {
          id: `map_${activity.stravaId}`,
          summary_polyline: undefined,
          resource_state: 2,
        },
      }));

      return NextResponse.json({
        activities: transformedActivities,
        total: result.total,
        hasMore: result.hasMore
      });
    } finally {
      await stravaSync.disconnect();
    }
  } catch (error) {
    console.error('Activities API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}


