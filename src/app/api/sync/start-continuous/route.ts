import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { StravaSync } from '@/services/stravaSync';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get athlete ID from cookie
    const athleteCookie = cookieStore.get('athlete')?.value;
    if (!athleteCookie) {
      return NextResponse.json({ error: 'Athlete data not found in session' }, { status: 401 });
    }

    const athleteData = JSON.parse(athleteCookie);
    const userId = athleteData.id.toString();

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'strava_data';

    const stravaSync = new StravaSync(mongoUri, dbName);
    await stravaSync.connect();

    try {
      // Start the continuous historical sync
      const result = await stravaSync.continuousHistoricalSync(accessToken, userId);

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Continuous historical sync completed',
          syncedCount: result.syncedCount,
          completed: result.completed,
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Continuous sync failed',
          syncedCount: result.syncedCount,
          errors: result.errors,
        }, { status: 500 });
      }
    } finally {
      await stravaSync.disconnect();
    }
  } catch (error) {
    console.error('Start continuous sync API error:', error);
    return NextResponse.json(
      { error: 'Failed to start continuous sync', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
