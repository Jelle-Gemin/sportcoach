import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { RaceService } from '@/services/raceService';
import { transformRaceToResponse } from '../../route';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ raceId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const athleteCookie = cookieStore.get('athlete')?.value;

    if (!athleteCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const athleteData = JSON.parse(athleteCookie);
    const userId = Number(athleteData.id);

    const body = await request.json();
    const { actualFinishTime } = body;

    if (!actualFinishTime || typeof actualFinishTime !== 'number' || actualFinishTime <= 0) {
      return NextResponse.json(
        { error: 'Valid actualFinishTime (in seconds) is required' },
        { status: 400 }
      );
    }

    const resolvedParams = await params;

    // Initialize MongoDB connection
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'strava_data';

    const raceService = new RaceService(mongoUri, dbName);
    await raceService.connect();

    try {
      const race = await raceService.completeRace(userId, resolvedParams.raceId, actualFinishTime);

      if (!race) {
        return NextResponse.json({ error: 'Race not found or already completed' }, { status: 404 });
      }

      // Calculate comparison
      const goalTime = race.goalTime;
      const actualTime = actualFinishTime;
      const difference = goalTime - actualTime; // positive = beat goal
      const percentageDifference = ((goalTime - actualTime) / goalTime) * 100;

      const comparison = {
        goalTime,
        actualTime,
        difference,
        percentageDifference,
      };

      return NextResponse.json({
        success: true,
        race: transformRaceToResponse(race),
        comparison
      });
    } finally {
      await raceService.disconnect();
    }
  } catch (error) {
    console.error('Complete race API error:', error);
    return NextResponse.json(
      { error: 'Failed to complete race', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
