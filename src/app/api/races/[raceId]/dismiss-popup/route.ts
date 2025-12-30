import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { RaceService } from '@/services/raceService';

export async function POST(
  request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  try {
    const cookieStore = await cookies();
    const athleteCookie = cookieStore.get('athlete')?.value;

    if (!athleteCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const athleteData = JSON.parse(athleteCookie);
    const userId = athleteData.id.toString();

    // Initialize MongoDB connection
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'strava_data';

    const raceService = new RaceService(mongoUri, dbName);
    await raceService.connect();

    try {
      const success = await raceService.dismissPostRacePopup(userId, params.raceId);

      if (!success) {
        return NextResponse.json({ error: 'Race not found or popup already dismissed' }, { status: 404 });
      }

      return NextResponse.json({
        success: true
      });
    } finally {
      await raceService.disconnect();
    }
  } catch (error) {
    console.error('Dismiss popup API error:', error);
    return NextResponse.json(
      { error: 'Failed to dismiss popup', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
