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

    // Initialize MongoDB connection
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'strava_data';

    const stravaSync = new StravaSync(mongoUri, dbName);
    await stravaSync.connect();

    try {
      // Get athlete data from database only
      // Get athlete ID from cookie (stored during authentication)
      const athleteCookie = cookieStore.get('athlete')?.value;
      if (!athleteCookie) {
        return NextResponse.json({ error: 'Athlete data not found in session' }, { status: 401 });
      }

      const athleteData = JSON.parse(athleteCookie);
      const athleteId = athleteData.id;

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
          // Rate limit hit - proceed to fetch from database instead
          console.log('Rate limit hit during token verification, fetching from database');
          rateLimitHit = true;
        } else {
          throw new Error(`Failed to verify token: ${athleteResponse.status} ${athleteResponse.statusText}`);
        }
      } else {
        // Token verification successful, save/update athlete in database
        stravaAthlete = await athleteResponse.json();
        if (stravaSync) {
          try {
            await stravaSync.saveAthlete(stravaAthlete);
          } catch (dbError) {
            console.warn('Failed to save athlete to database:', dbError);
          }
        }
      }

      // Get athlete data from database
      let athlete = null;
      let stats = null;

      if (stravaSync) {
        try {
          // Use athlete ID from cookie, or from stravaAthlete if available
          const athleteIdToFetch = stravaAthlete?.id || athleteId;
          const dbAthlete = await stravaSync.getAthlete(athleteIdToFetch);
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
              created_at: dbAthlete.created_at.toISOString(),
              updated_at: dbAthlete.updated_at.toISOString(),
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
      }

      // Fallback to Strava data if not in database and we have it
      if (!athlete && stravaAthlete) {
        athlete = stravaAthlete;
      }

      // If we still don't have athlete data and rate limit was hit, return an error
      if (!athlete && rateLimitHit) {
        return NextResponse.json({ error: 'Rate limit exceeded and no cached data available. Please try again later.' }, { status: 429 });
      }



      return NextResponse.json({ athlete, stats });
    } finally {
      if (stravaSync) {
        await stravaSync.disconnect();
      }
    }
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
