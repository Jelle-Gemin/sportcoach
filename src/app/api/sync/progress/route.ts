import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { StravaSync } from '@/services/stravaSync';
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

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'strava_data';

    const stravaSync = new StravaSync(mongoUri, dbName);
    await stravaSync.connect();

    try {
      // Get sync metadata for this athlete
      const metadata = await stravaSync.getSyncMetadata(athleteId);

      // Get athlete's total activities from Strava stats
      let totalAthleteActivities = 0;
      try {
        const athleteStats = await fetchAthleteStats(accessToken, athleteId);
        console.log('Athlete stats:', JSON.stringify(athleteStats, null, 2));
        if (athleteStats) {
          totalAthleteActivities = (athleteStats.all_ride_totals?.count || 0) +
                                  (athleteStats.all_run_totals?.count || 0) +
                                  (athleteStats.all_swim_totals?.count || 0) +
                                  (athleteStats.all_workout_totals?.count || 0);
        }
      } catch (statsError) {
        console.warn('Failed to fetch athlete stats:', statsError);
        // Continue without total activities - will use 0
      }

      if (!metadata) {
        return NextResponse.json({
          status: 'not_started',
          totalActivitiesFound: 0,
          activitiesProcessed: 0,
          totalAthleteActivities,
          percentComplete: 0,
          currentBatchStart: null,
          estimatedCompletion: null,
          lastProcessedActivityId: 0,
          rateLimitRequestsThisWindow: 0,
          rateLimitRequestsToday: 0,
          rateLimitNextReset: new Date().toISOString()
        });
      }

      const progress = metadata.continuous_sync_progress || {
        totalActivitiesFound: 0,
        activitiesProcessed: 0,
        currentBatchStart: null,
        estimatedCompletion: null,
        lastProcessedActivityId: 0
      };

      const rateLimitInfo = metadata.rate_limit_info || {
        requestsThisWindow: 0,
        requestsToday: 0,
        currentWindowStart: new Date(),
        nextWindowReset: new Date(),
        lastRequestTime: new Date()
      };

      return NextResponse.json({
        status: metadata.continuous_sync_status || 'not_started',
        totalActivitiesFound: progress.totalActivitiesFound || 0,
        activitiesProcessed: progress.activitiesProcessed || 0,
        totalAthleteActivities,
        percentComplete: totalAthleteActivities > 0
          ? Math.round((progress.activitiesProcessed / totalAthleteActivities) * 100)
          : 0,
        currentBatchStart: progress.currentBatchStart || null,
        estimatedCompletion: progress.estimatedCompletion || null,
        lastProcessedActivityId: progress.lastProcessedActivityId || 0,
        rateLimitRequestsThisWindow: rateLimitInfo.requestsThisWindow || 0,
        rateLimitRequestsToday: rateLimitInfo.requestsToday || 0,
        rateLimitNextReset: rateLimitInfo.nextWindowReset?.toISOString() || new Date().toISOString()
      });

    } finally {
      await stravaSync.disconnect();
    }

  } catch (error) {
    console.error('Error getting sync progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
