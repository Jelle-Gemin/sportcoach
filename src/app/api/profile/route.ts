import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';

// Profile changes rarely - cache for 30 minutes
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
};

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

    // Use connection pool
    const db = await getDb();
    const athletesCollection = db.collection('athletes');

    // Verify token is still valid by making a minimal API call
    const athleteResponse = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    let stravaAthlete = null;
    let rateLimitHit = false;

    if (!athleteResponse.ok) {
      if (athleteResponse.status === 401) {
        return NextResponse.json({ error: 'Token expired' }, { status: 401 });
      }
      if (athleteResponse.status === 429) {
        console.log('Rate limit hit during token verification, fetching from database');
        rateLimitHit = true;
      } else {
        throw new Error(`Failed to verify token: ${athleteResponse.status} ${athleteResponse.statusText}`);
      }
    } else {
      stravaAthlete = await athleteResponse.json();
      // Save/update athlete in database
      try {
        await athletesCollection.updateOne(
          { stravaId: stravaAthlete.id },
          {
            $set: {
              stravaId: stravaAthlete.id,
              username: stravaAthlete.username,
              firstname: stravaAthlete.firstname,
              lastname: stravaAthlete.lastname,
              bio: stravaAthlete.bio,
              city: stravaAthlete.city,
              state: stravaAthlete.state,
              country: stravaAthlete.country,
              sex: stravaAthlete.sex,
              premium: stravaAthlete.premium,
              summit: stravaAthlete.summit,
              created_at: new Date(stravaAthlete.created_at),
              updated_at: new Date(stravaAthlete.updated_at),
              badge_type_id: stravaAthlete.badge_type_id,
              weight: stravaAthlete.weight,
              profile_medium: stravaAthlete.profile_medium,
              profile: stravaAthlete.profile,
              friend: stravaAthlete.friend,
              follower: stravaAthlete.follower,
              measurement_preference: stravaAthlete.measurement_preference,
              ftp: stravaAthlete.ftp,
              clubs: stravaAthlete.clubs || [],
              bikes: stravaAthlete.bikes || [],
              shoes: stravaAthlete.shoes || [],
              stats: stravaAthlete.stats,
              fetchedAt: new Date(),
              lastUpdated: new Date(),
            }
          },
          { upsert: true }
        );
      } catch (dbError) {
        console.warn('Failed to save athlete to database:', dbError);
      }
    }

    // Get athlete data from database
    let athlete = null;
    let stats = null;

    try {
      const athleteIdToFetch = stravaAthlete?.id || athleteId;
      const dbAthlete = await athletesCollection.findOne({ stravaId: athleteIdToFetch });

      if (dbAthlete) {
        athlete = {
          id: dbAthlete.stravaId,
          username: dbAthlete.username,
          firstname: dbAthlete.firstname,
          lastname: dbAthlete.lastname,
          bio: dbAthlete.bio,
          city: dbAthlete.city,
          state: dbAthlete.state,
          country: dbAthlete.country,
          sex: dbAthlete.sex,
          premium: dbAthlete.premium,
          summit: dbAthlete.summit,
          created_at: dbAthlete.created_at?.toISOString?.() || dbAthlete.created_at,
          updated_at: dbAthlete.updated_at?.toISOString?.() || dbAthlete.updated_at,
          badge_type_id: dbAthlete.badge_type_id,
          weight: dbAthlete.weight,
          profile_medium: dbAthlete.profile_medium,
          profile: dbAthlete.profile,
          friend: dbAthlete.friend,
          follower: dbAthlete.follower,
          measurement_preference: dbAthlete.measurement_preference,
          ftp: dbAthlete.ftp,
          clubs: dbAthlete.clubs,
          bikes: dbAthlete.bikes,
          shoes: dbAthlete.shoes,
        };
        stats = dbAthlete.stats;
      }
    } catch (dbError) {
      console.warn('Failed to get athlete from database:', dbError);
    }

    // Fallback to Strava data if not in database and we have it
    if (!athlete && stravaAthlete) {
      athlete = stravaAthlete;
    }

    // If we still don't have athlete data and rate limit was hit, return an error
    if (!athlete && rateLimitHit) {
      return NextResponse.json(
        { error: 'Rate limit exceeded and no cached data available. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json({ athlete, stats }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
