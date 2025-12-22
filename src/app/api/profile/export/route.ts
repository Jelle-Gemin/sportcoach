import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { StravaSync } from '@/services/stravaSync';

export async function GET(request: NextRequest) {
  try {
    // Add authentication check using cookies
    const cookieStore = await cookies();
    const athleteCookie = cookieStore.get('athlete')?.value;

    if (!athleteCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const athleteData = JSON.parse(athleteCookie);
    const athleteId = athleteData.id;

    // Initialize MongoDB connection
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'strava_data';

    const stravaSync = new StravaSync(mongoUri, dbName);
    await stravaSync.connect();

    try {
      // Fetch user data from athletes collection
      const athlete = await stravaSync.getAthlete(athleteId);

      // Fetch activities from activities collection
      const activitiesResult = await stravaSync.getActivities(athleteId, 1000); // Get up to 1000 activities
      const activities = activitiesResult.activities.map(activity => ({
        id: activity.stravaId,
        name: activity.name,
        type: activity.type,
        distance: activity.distance,
        duration: activity.moving_time,
        date: activity.date.toISOString(),
        description: activity.description,
        sport_type: activity.sport_type,
        total_elevation_gain: activity.total_elevation_gain,
        average_speed: activity.average_speed,
        max_speed: activity.max_speed,
        has_heartrate: activity.has_heartrate,
        average_heartrate: activity.average_heartrate,
        max_heartrate: activity.max_heartrate,
        average_cadence: activity.average_cadence,
        achievement_count: activity.achievement_count,
        kudos_count: activity.kudos_count,
        comment_count: activity.comment_count,
        athlete_count: activity.athlete_count,
        photo_count: activity.photo_count,
        start_date: activity.start_date,
        start_date_local: activity.start_date_local,
        timezone: activity.timezone,
        calories: activity.calories,
        device_name: activity.device_name,
      }));

      // Fetch settings from settings collection
      const db = stravaSync['db'];
      const settingsCollection = db.collection('settings');
      const userSettings = await settingsCollection.findOne({ athleteId });

      const settings = userSettings ? userSettings.settings : {
        distance: 'kilometers',
        elevation: 'meters',
        temperature: 'celsius',
        dateFormat: 'DD/MM/YYYY',
        workoutReminders: true,
        trainingPlanUpdates: true,
        newStravaActivities: true,
        weeklyProgressSummary: true,
        achievementUnlocked: false,
        autoSync: true,
        syncFrequency: 'Every 6 hours',
        backgroundSync: true,
        aiInsights: true,
        autoAdjustWorkouts: true,
        trainingLoadWarnings: true,
      };

      const exportData = {
        user: athlete ? {
          id: athlete.stravaId,
          username: athlete.username,
          email: athlete.firstname && athlete.lastname ? `${athlete.firstname} ${athlete.lastname}` : athlete.username,
          createdAt: athlete.created_at.toISOString(),
          firstname: athlete.firstname,
          lastname: athlete.lastname,
          bio: athlete.bio,
          city: athlete.city,
          state: athlete.state,
          country: athlete.country,
          sex: athlete.sex,
          premium: athlete.premium,
          summit: athlete.summit,
          weight: athlete.weight,
          profile_medium: athlete.profile_medium,
          profile: athlete.profile,
          measurement_preference: athlete.measurement_preference,
          ftp: athlete.ftp,
        } : null,
        activities,
        settings,
        exportDate: new Date().toISOString(),
        totalActivities: activitiesResult.total,
      };

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="sportcoach-data-export.json"',
        },
      });
    } finally {
      await stravaSync.disconnect();
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
