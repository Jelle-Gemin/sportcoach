import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { fetchAthleteStats } from '@/services/stravaApi';

export async function GET(request: NextRequest) {
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
    const athleteId = athleteData.id;

    // Fetch athlete stats from Strava
    const stats = await fetchAthleteStats(accessToken, athleteId);

    // Calculate total activities across all sports
    const totalActivities = stats.all_ride_totals.count +
                           stats.all_run_totals.count +
                           stats.all_swim_totals.count +
                           stats.all_workout_totals.count;

    return NextResponse.json({
      totalActivities,
      rideCount: stats.all_ride_totals.count,
      runCount: stats.all_run_totals.count,
      swimCount: stats.all_swim_totals.count,
      workoutCount: stats.all_workout_totals.count,
      stats
    });

  } catch (error) {
    console.error('Error fetching athlete stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch athlete stats' },
      { status: 500 }
    );
  }
}
