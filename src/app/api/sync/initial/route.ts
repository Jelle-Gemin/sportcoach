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

    // Initialize MongoDB connection
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'strava_data';

    const stravaSync = new StravaSync(mongoUri, dbName);
    await stravaSync.connect();
    await stravaSync.initializeIndexes();

    try {
      const result = await stravaSync.initialSync(accessToken);

      return NextResponse.json({
        success: result.success,
        syncedCount: result.syncedCount,
        hasOlderActivities: result.hasOlderActivities,
        errors: result.errors,
      });
    } finally {
      await stravaSync.disconnect();
    }
  } catch (error) {
    console.error('Initial sync API error:', error);
    return NextResponse.json(
      { error: 'Failed to perform initial sync', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
