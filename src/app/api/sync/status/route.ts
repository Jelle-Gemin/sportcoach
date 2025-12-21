import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { StravaSync } from '@/services/stravaSync';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'strava_data';

    const stravaSync = new StravaSync(mongoUri, dbName);
    await stravaSync.connect();

    try {
      // Get sync metadata
      const metadata = await stravaSync.getSyncMetadata();

      // Get actual count of activities in database
      const actualActivityCount = await stravaSync.getActivities(1, 0).then(result => result.total);

      return NextResponse.json({
        initialSyncStatus: metadata?.strava_sync_status || 'not_started',
        continuousSyncStatus: metadata?.continuous_sync_status || 'not_started',
        totalActivities: actualActivityCount,
        hasOlderActivities: metadata?.has_older_activities || false,
        lastSyncCheck: metadata?.strava_last_sync_check,
        continuousSyncStartedAt: metadata?.continuous_sync_started_at,
        progress: metadata?.continuous_sync_progress,
        lastError: metadata?.last_error
      });

    } finally {
      await stravaSync.disconnect();
    }

  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
