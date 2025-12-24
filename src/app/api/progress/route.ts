import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { StravaSync } from '@/services/stravaSync';

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
    const athleteId = athleteData.id.toString();

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '4weeks';

    // Calculate date range based on timeRange
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '4weeks':
        startDate = new Date(now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000);
        break;
      case '12weeks':
        startDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 52 * 7 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate = new Date(now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000);
    }

    // Initialize MongoDB connection
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'strava_data';

    const stravaSync = new StravaSync(mongoUri, dbName);
    await stravaSync.connect();

    try {
      // Get all activities in the date range
      const result = await stravaSync.getActivities(athleteId ,10000, 0, undefined, startDate, now);
      const activities = result.activities;

      // Group activities by week (Monday to Sunday)
      const weeklyData: { [key: string]: { distance: number; runPace: number[]; rideSpeed: number[] } } = {};

      activities.forEach(activity => {
        if (!activity.distance || !activity.date) return;

        // Get the Monday of the week containing this activity
        const activityDate = new Date(activity.date);
        const dayOfWeek = activityDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const monday = new Date(activityDate);
        monday.setDate(activityDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Adjust to Monday
        monday.setHours(0, 0, 0, 0);

        const weekKey = monday.toISOString().split('T')[0]; // YYYY-MM-DD format

        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { distance: 0, runPace: [], rideSpeed: [] };
        }

        // Add distance (convert from meters to kilometers)
        weeklyData[weekKey].distance += (activity.distance || 0) / 1000;

        // Calculate pace/speed based on activity type
        if (activity.type?.toLowerCase().includes('run') && activity.moving_time && activity.distance) {
          // For running: pace in min/km
          const paceMinKm = (activity.moving_time / 60) / (activity.distance / 1000);
          weeklyData[weekKey].runPace.push(paceMinKm);
        } else if (activity.type?.toLowerCase().includes('ride') && activity.average_speed) {
          // For cycling: speed in km/h
          const speedKmh = activity.average_speed * 3.6;
          weeklyData[weekKey].rideSpeed.push(speedKmh);
        }
      });

      // Convert to chart data format
      const volumeData = Object.keys(weeklyData)
        .sort()
        .map(weekKey => {
          const monday = new Date(weekKey + 'T00:00:00');
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);

          return {
            week: `${monday.getMonth() + 1}/${monday.getDate()}-${sunday.getMonth() + 1}/${sunday.getDate()}`,
            distance: Math.round(weeklyData[weekKey].distance * 10) / 10, // Round to 1 decimal
          };
        });

      const paceData = Object.keys(weeklyData)
        .sort()
        .map(weekKey => {
          const monday = new Date(weekKey + 'T00:00:00');
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);

          // Calculate average pace for runs (min/km)
          const avgRunPace = weeklyData[weekKey].runPace.length > 0
            ? weeklyData[weekKey].runPace.reduce((a, b) => a + b, 0) / weeklyData[weekKey].runPace.length
            : 0;

          // Calculate average speed for rides (km/h)
          const avgRideSpeed = weeklyData[weekKey].rideSpeed.length > 0
            ? weeklyData[weekKey].rideSpeed.reduce((a, b) => a + b, 0) / weeklyData[weekKey].rideSpeed.length
            : 0;

          return {
            week: `${monday.getMonth() + 1}/${monday.getDate()}-${sunday.getMonth() + 1}/${sunday.getDate()}`,
            run: avgRunPace > 0 ? Math.round(avgRunPace * 100) / 100 : null, // Round to 2 decimals
            ride: avgRideSpeed > 0 ? Math.round(avgRideSpeed * 100) / 100 : null, // Round to 2 decimals
          };
        });

      // Calculate summary stats
      const totalDistance = volumeData.reduce((sum, week) => sum + week.distance, 0);
      const avgWeeklyDistance = volumeData.length > 0 ? totalDistance / volumeData.length : 0;
      const maxWeeklyDistance = volumeData.length > 0 ? Math.max(...volumeData.map(w => w.distance)) : 0;

      // Calculate pace improvement (compare first and last weeks with data)
      const validRunWeeks = paceData.filter(w => w.run && w.run > 0);
      const runImprovement = validRunWeeks.length >= 2
        ? validRunWeeks[0].run! - validRunWeeks[validRunWeeks.length - 1].run!
        : 0;

      const validRideWeeks = paceData.filter(w => w.ride && w.ride > 0);
      const rideImprovement = validRideWeeks.length >= 2
        ? validRideWeeks[validRideWeeks.length - 1].ride! - validRideWeeks[0].ride!
        : 0;

      return NextResponse.json({
        volumeData,
        paceData,
        summary: {
          totalDistance: Math.round(totalDistance * 10) / 10,
          avgWeeklyDistance: Math.round(avgWeeklyDistance * 10) / 10,
          maxWeeklyDistance: Math.round(maxWeeklyDistance * 10) / 10,
          runImprovement: runImprovement > 0 ? Math.round(runImprovement * 100) / 100 : 0,
          rideImprovement: rideImprovement > 0 ? Math.round(rideImprovement * 100) / 100 : 0,
        }
      });

    } finally {
      await stravaSync.disconnect();
    }
  } catch (error) {
    console.error('Progress API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
