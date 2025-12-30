import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { RaceService } from '@/services/raceService';
import { UpdateRaceInput } from '@/types/race';
import { transformRaceToResponse } from '../route';

export async function GET(
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
    const userId = Number(athleteData.id);

    const resolvedParams = await params;

    // Initialize MongoDB connection
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'strava_data';

    const raceService = new RaceService(mongoUri, dbName);
    await raceService.connect();

    try {
      const race = await raceService.getRace(userId, resolvedParams.raceId);

      if (!race) {
        return NextResponse.json({ error: 'Race not found' }, { status: 404 });
      }

      return NextResponse.json({ race: transformRaceToResponse(race) });
    } finally {
      await raceService.disconnect();
    }
  } catch (error) {
    console.error('Get race API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch race', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const userId = Number(athleteData.id);

    const body: UpdateRaceInput = await request.json();

    // Validate race date if provided
    if (body.raceDate && new Date(body.raceDate) <= new Date()) {
      return NextResponse.json(
        { error: 'Race date must be in the future' },
        { status: 400 }
      );
    }

    // Validate goal time if provided
    if (body.goalTime !== undefined && (body.goalTime <= 0 || body.goalTime > 86400)) {
      return NextResponse.json(
        { error: 'Goal time must be between 1 second and 24 hours' },
        { status: 400 }
      );
    }

    // Initialize MongoDB connection
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'strava_data';

    const resolvedParams = await params;


    const raceService = new RaceService(mongoUri, dbName);
    await raceService.connect();

    try {
      const race = await raceService.updateRace(userId, resolvedParams.raceId, body);

      if (!race) {
        return NextResponse.json({ error: 'Race not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        race: transformRaceToResponse(race),
        estimatedTime: race.estimatedTime
      });
    } finally {
      await raceService.disconnect();
    }
  } catch (error) {
    console.error('Update race API error:', error);
    return NextResponse.json(
      { error: 'Failed to update race', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const userId = Number(athleteData.id);

    // Initialize MongoDB connection
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'strava_data';

    const resolvedParams = await params;


    const raceService = new RaceService(mongoUri, dbName);
    await raceService.connect();

    try {
      const success = await raceService.deleteRace(userId, resolvedParams.raceId);

      if (!success) {
        return NextResponse.json({ error: 'Race not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Race deleted successfully'
      });
    } finally {
      await raceService.disconnect();
    }
  } catch (error) {
    console.error('Delete race API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete race', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
