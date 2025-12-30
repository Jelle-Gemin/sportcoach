import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { RaceService } from '@/services/raceService';

export async function GET(request: NextRequest) {
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
      const race = await raceService.checkPostRacePopup(userId);

      return NextResponse.json({
        hasPostRacePopup: !!race,
        race: race || undefined
      });
    } finally {
      await raceService.disconnect();
    }
  } catch (error) {
    console.error('Check post-race API error:', error);
    return NextResponse.json(
      { error: 'Failed to check post-race popup', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
