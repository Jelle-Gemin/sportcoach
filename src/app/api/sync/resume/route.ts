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

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'strava_data';

    const stravaSync = new StravaSync(mongoUri, dbName);
    await stravaSync.connect();

    try {
      const result = await stravaSync.resumeContinuousSync();

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: result.message,
          resumedFrom: new Date().toISOString()
        });
      } else {
        return NextResponse.json(
          { error: result.message },
          { status: 400 }
        );
      }

    } finally {
      await stravaSync.disconnect();
    }

  } catch (error) {
    console.error('Error resuming sync:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
