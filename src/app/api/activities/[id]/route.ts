import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

// Activity detail is immutable - cache for 1 hour
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const activityId = parseInt(id);

    if (isNaN(activityId)) {
      return NextResponse.json(
        { error: 'Invalid activity ID' },
        { status: 400 }
      );
    }

    // Use connection pool
    const db = await getDb();
    const activitiesCollection = db.collection('activities');

    // Fetch activity from database
    const activityDoc = await activitiesCollection.findOne({ stravaId: activityId });

    if (!activityDoc) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Transform the database document to match the expected API response format
    const activity = {
      id: activityDoc.stravaId,
      name: activityDoc.name,
      distance: activityDoc.distance,
      moving_time: activityDoc.moving_time || activityDoc.movingTime,
      elapsed_time: activityDoc.elapsed_time || activityDoc.elapsedTime,
      total_elevation_gain: activityDoc.total_elevation_gain,
      type: activityDoc.type,
      sport_type: activityDoc.sport_type,
      start_date: activityDoc.start_date,
      start_date_local: activityDoc.start_date_local,
      timezone: activityDoc.timezone,
      average_speed: activityDoc.average_speed,
      max_speed: activityDoc.max_speed,
      has_heartrate: activityDoc.has_heartrate,
      average_heartrate: activityDoc.average_heartrate || activityDoc.avgHR,
      max_heartrate: activityDoc.max_heartrate || activityDoc.maxHR,
      average_cadence: activityDoc.average_cadence,
      achievement_count: activityDoc.achievement_count,
      kudos_count: activityDoc.kudos_count,
      comment_count: activityDoc.comment_count,
      athlete_count: activityDoc.athlete_count,
      photo_count: activityDoc.photo_count,
      description: activityDoc.description,
      photos: activityDoc.photos,
      calories: activityDoc.calories,
      segment_efforts: activityDoc.segment_efforts,
      device_name: activityDoc.device_name,
      embed_token: activityDoc.embed_token,
      splits_metric: activityDoc.splits_metric,
      splits_standard: activityDoc.splits_standard,
      laps: activityDoc.laps,
      map: activityDoc.map,
      elev_high: activityDoc.elev_high,
      elev_low: activityDoc.elev_low,
    };

    // Extract streams from the stored data
    const streams = activityDoc.streams || {};

    return NextResponse.json(
      { activity, streams },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error('Error fetching activity details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity details' },
      { status: 500 }
    );
  }
}
