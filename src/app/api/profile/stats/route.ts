import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const accessToken = (await cookieStore).get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First get the athlete ID from the profile endpoint
    const athleteResponse = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!athleteResponse.ok) {
      if (athleteResponse.status === 401) {
        return NextResponse.json({ error: 'Token expired' }, { status: 401 });
      }
      throw new Error('Failed to fetch athlete data');
    }

    const athlete = await athleteResponse.json();

    // Now fetch the stats using the athlete ID
    const statsResponse = await fetch(`https://www.strava.com/api/v3/athletes/${athlete.id}/stats`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!statsResponse.ok) {
      if (statsResponse.status === 401) {
        return NextResponse.json({ error: 'Token expired' }, { status: 401 });
      }
      throw new Error('Failed to fetch athlete stats');
    }

    const stats = await statsResponse.json();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Profile stats API error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile stats' }, { status: 500 });
  }
}
