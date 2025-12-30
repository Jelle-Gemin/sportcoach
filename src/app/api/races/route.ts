import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { RaceService } from '@/services/raceService';
import { CreateRaceInput, Race, RaceResponse } from '@/types/race';

export function transformRaceToResponse(race: Race): RaceResponse {
  return {
    _id: race._id?.toString() || '',
    userId: race.userId,
    raceName: race.raceName,
    raceType: race.raceType,
    raceDate: race.raceDate,
    location: race.location,
    goalTime: race.goalTime,
    estimatedTime: race.estimatedTime,
    status: race.status,
    actualFinishTime: race.actualFinishTime,
    completedAt: race.completedAt,
    skipReason: race.skipReason,
    skippedAt: race.skippedAt,
    postRacePopupShown: race.postRacePopupShown,
    postRacePopupShownAt: race.postRacePopupShownAt,
    createdAt: race.createdAt,
    updatedAt: race.updatedAt,
    linkedTrainingPlanId: race.linkedTrainingPlanId,
    isTargetRace: race.isTargetRace,
  };
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const athleteCookie = cookieStore.get('athlete')?.value;

    if (!athleteCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const athleteData = JSON.parse(athleteCookie);
    const userId = Number(athleteData.id);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const includeEstimates = searchParams.get('includeEstimates') === 'true';

    // Initialize MongoDB connection
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'strava_data';

    const raceService = new RaceService(mongoUri, dbName);
    await raceService.connect();

    try {
      // Get races for the user
      const races = await raceService.getRaces(userId, status, includeEstimates);

      // Transform races to response format
      const transformedRaces = races.map(transformRaceToResponse);

      // Calculate stats
      const plannedRaces = transformedRaces.filter(r => r.status === 'planned');
      const completedRaces = transformedRaces.filter(r => r.status === 'completed');
      const skippedRaces = transformedRaces.filter(r => r.status === 'skipped');

      // Find next upcoming race
      const now = new Date();
      const upcomingRace = plannedRaces
        .filter(r => new Date(r.raceDate) > now)
        .sort((a, b) => new Date(a.raceDate).getTime() - new Date(b.raceDate).getTime())[0];

      const stats = {
        totalPlanned: plannedRaces.length,
        totalCompleted: completedRaces.length,
        totalSkipped: skippedRaces.length,
        upcomingRace: upcomingRace || undefined,
      };

      return NextResponse.json({
        races: transformedRaces,
        stats
      });
    } finally {
      await raceService.disconnect();
    }
  } catch (error) {
    console.error('Races API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch races', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const athleteCookie = cookieStore.get('athlete')?.value;

    if (!athleteCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const athleteData = JSON.parse(athleteCookie);
    const userId = Number(athleteData.id);

    const body: CreateRaceInput = await request.json();

    // Basic validation
    if (!body.raceName || !body.raceType || !body.raceDate || !body.goalTime) {
      return NextResponse.json(
        { error: 'Missing required fields: raceName, raceType, raceDate, goalTime' },
        { status: 400 }
      );
    }

    // Validate race date is in the future
    if (new Date(body.raceDate) <= new Date()) {
      return NextResponse.json(
        { error: 'Race date must be in the future' },
        { status: 400 }
      );
    }

    // Validate goal time
    if (body.goalTime <= 0 || body.goalTime > 86400) { // Max 24 hours
      return NextResponse.json(
        { error: 'Goal time must be between 1 second and 24 hours' },
        { status: 400 }
      );
    }

    // Initialize MongoDB connection
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'strava_data';

    const raceService = new RaceService(mongoUri, dbName);
    await raceService.connect();

    try {
      const race = await raceService.createRace(userId, body);

      return NextResponse.json({
        success: true,
        race: transformRaceToResponse(race),
        estimatedTime: race.estimatedTime
      });
    } finally {
      await raceService.disconnect();
    }
  } catch (error) {
    console.error('Create race API error:', error);
    return NextResponse.json(
      { error: 'Failed to create race', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
