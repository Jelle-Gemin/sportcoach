import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const accessToken = (await cookieStore).get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch athlete data
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

    // Fetch athlete stats
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

    return NextResponse.json({ athlete, stats });
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
