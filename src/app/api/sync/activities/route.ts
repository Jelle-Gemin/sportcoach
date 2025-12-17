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
      let totalSynced = 0;
      let totalSkipped = 0;
      let totalNew = 0;
      const allErrors: Array<{ activityId: number; error: string }> = [];
      let completed = false;
      let iterations = 0;
      const maxIterations = 100; // Safety limit to prevent infinite loops

      // Loop until sync is completed or rate limited
      while (!completed && iterations < maxIterations) {
        iterations++;
        console.log(`Starting sync iteration ${iterations}`);

        const result = await stravaSync.syncActivities(accessToken);

        totalSynced += result.syncedCount;
        totalSkipped += result.skippedCount;
        totalNew += result.newActivities;
        allErrors.push(...result.errors);
        completed = result.completed;

        console.log(`Iteration ${iterations} completed:`, {
          synced: result.syncedCount,
          skipped: result.skippedCount,
          new: result.newActivities,
          completed: result.completed,
          success: result.success
        });

        // If rate limited, stop the loop
        if (!result.success) {
          console.log('Rate limit hit, stopping sync loop');
          break;
        }

        // If no activities were synced in this iteration, we're done
        if (result.syncedCount === 0 && result.completed) {
          break;
        }
      }

      if (iterations >= maxIterations) {
        console.warn('Reached maximum iterations limit');
      }

      return NextResponse.json({
        success: completed,
        syncedCount: totalSynced,
        skippedCount: totalSkipped,
        newActivities: totalNew,
        errors: allErrors,
        completed,
        iterations
      });
    } finally {
      await stravaSync.disconnect();
    }
  } catch (error) {
    console.error('Sync activities API error:', error);
    return NextResponse.json(
      { error: 'Failed to sync activities', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
