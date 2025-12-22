import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { StravaSync } from '@/services/stravaSync';

interface SettingsDocument {
  _id?: any;
  athleteId: number;
  settings: {
    // Units & Preferences
    distance: 'miles' | 'kilometers';
    elevation: 'feet' | 'meters';
    temperature: 'fahrenheit' | 'celsius';
    dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';

    // Notifications
    workoutReminders: boolean;
    trainingPlanUpdates: boolean;
    newStravaActivities: boolean;
    weeklyProgressSummary: boolean;
    achievementUnlocked: boolean;

    // Sync Settings
    autoSync: boolean;
    syncFrequency: 'Every hour' | 'Every 6 hours' | 'Every 12 hours' | 'Daily';
    backgroundSync: boolean;

    // AI Settings
    aiInsights: boolean;
    autoAdjustWorkouts: boolean;
    trainingLoadWarnings: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(request: NextRequest) {
  try {
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
      // Get settings from database
      const db = stravaSync['db'];
      const settingsCollection = db.collection('settings');

      const userSettings = await settingsCollection.findOne({ athleteId });

      if (userSettings) {
        return NextResponse.json(userSettings.settings);
      } else {
        // Return default settings if none exist
        const defaultSettings = {
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
        return NextResponse.json(defaultSettings);
      }
    } finally {
      await stravaSync.disconnect();
    }
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const athleteCookie = cookieStore.get('athlete')?.value;

    if (!athleteCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const athleteData = JSON.parse(athleteCookie);
    const athleteId = athleteData.id;

    const settings = await request.json();

    // Initialize MongoDB connection
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'strava_data';

    const stravaSync = new StravaSync(mongoUri, dbName);
    await stravaSync.connect();

    try {
      // Save settings to database
      const db = stravaSync['db'];
      const settingsCollection = db.collection('settings');

      const settingsDoc: SettingsDocument = {
        athleteId,
        settings,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await settingsCollection.updateOne(
        { athleteId },
        { $set: settingsDoc },
        { upsert: true }
      );

      return NextResponse.json({ success: true });
    } finally {
      await stravaSync.disconnect();
    }
  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
