import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { fetchActivityDetail, fetchActivityStreams } from '@/services/stravaApi';
import { ActivityAnalysisInput, aiAnalysisService } from '@/services/aiAnalysisService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stravaId = parseInt(id);
    if (isNaN(stravaId)) {
      return NextResponse.json({ error: 'Invalid activity ID' }, { status: 400 });
    }

    // Try to get cached analysis
    const cachedAnalysis = await aiAnalysisService.getAnalysis(stravaId);

    if (cachedAnalysis) {
      return NextResponse.json({
        exists: true,
        analysis: cachedAnalysis
      });
    } else {
      return NextResponse.json({
        exists: false,
        analysis: null
      });
    }

  } catch (error) {
    console.error('Error retrieving cached analysis:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve analysis', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    let accessToken = cookieStore.get('accessToken')?.value;
    const expiresAt = cookieStore.get('expiresAt')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if token is expired and refresh if needed
    const now = Date.now() / 1000;
    if (expiresAt && now > parseInt(expiresAt)) {
      // Token is expired, try to refresh
      const refreshToken = cookieStore.get('refreshToken')?.value;
      if (!refreshToken) {
        return NextResponse.json({ error: 'Token expired and no refresh token available' }, { status: 401 });
      }

      try {
        const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!refreshResponse.ok) {
          return NextResponse.json({ error: 'Failed to refresh token' }, { status: 401 });
        }

        const refreshData = await refreshResponse.json();
        accessToken = refreshData.accessToken;
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
      }
    }

    const { id } = await params;
    const stravaId = parseInt(id);
    if (isNaN(stravaId)) {
      return NextResponse.json({ error: 'Invalid activity ID' }, { status: 400 });
    }

    const { sections, forceRegenerate } = await request.json().catch(() => ({}));

    // Fetch activity details
    const activity = await fetchActivityDetail(accessToken!, stravaId);

    // Fetch streams for detailed analysis
    const streamTypes = ['time', 'distance', 'heartrate', 'pace', 'cadence', 'altitude', 'watts'];
    let streams: Record<string, any> = {};
    try {
      streams = await fetchActivityStreams(accessToken!, stravaId, streamTypes);
    } catch (error) {
      console.warn('Could not fetch streams:', error);
    }

    // Convert to analysis input format
    const analysisInput: ActivityAnalysisInput = {
      stravaId: activity.id,
      name: activity.name,
      type: activity.type,
      date: new Date(activity.start_date_local),
      distance: activity.distance,
      movingTime: activity.moving_time,
      elapsedTime: activity.elapsed_time,
      total_elevation_gain: activity.total_elevation_gain,
      averagePace: activity.average_speed ? `${Math.floor(1000 / activity.average_speed / 60)}:${((1000 / activity.average_speed % 60)).toFixed(0).padStart(2, '0')}/km` : 'N/A',
      maxPace: activity.max_speed ? `${Math.floor(1000 / activity.max_speed / 60)}:${((1000 / activity.max_speed % 60)).toFixed(0).padStart(2, '0')}/km` : 'N/A',
      avgHR: activity.average_heartrate || 0,
      maxHR: activity.max_heartrate || 0,
      avgCadence: activity.average_cadence,
      laps: (activity.splits_metric || []).map((split: any, index: number) => ({
        distance: split.distance,
        elapsedTime: split.elapsed_time,
        averageSpeed: split.average_speed,
        averageHeartrate: split.average_heartrate,
        averageCadence: split.average_cadence,
        maxHeartrate: split.max_heartrate
      })),
      streams: {
        time: streams.time?.data || [],
        distance: streams.distance?.data || [],
        heartrate: streams.heartrate?.data,
        pace: streams.pace?.data,
        cadence: streams.cadence?.data,
        altitude: streams.altitude?.data,
        watts: streams.watts?.data
      }
    };

    // Generate analysis
    const analysis = await aiAnalysisService.generateAnalysis(
      analysisInput,
      sections || ['performance_summary', 'pace_analysis', 'heart_rate', 'consistency']
    );

    return NextResponse.json({
      success: true,
      analysis,
      metadata: {
        cached: false, // For now, we'll implement caching later
        generation_time_ms: Date.now() - Date.now() // Placeholder
      }
    });

  } catch (error) {
    console.error('Error generating analysis:', error);
    return NextResponse.json(
      { error: 'Failed to generate analysis', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
