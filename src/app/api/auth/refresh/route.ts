import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { refreshAccessToken } from '@/services/stravaAuth';


export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID!;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET!;

    const tokenData = await refreshAccessToken(refreshToken, clientId, clientSecret);

    const athleteCookie = cookieStore.get('athlete')?.value;
    const athlete = athleteCookie ? JSON.parse(athleteCookie) : null;

    const response = NextResponse.json({
      accessToken: tokenData.access_token,
      athlete,
    });

    // Update cookies with new tokens
    response.cookies.set('accessToken', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in,
    });

    response.cookies.set('refreshToken', tokenData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    response.cookies.set('expiresAt', tokenData.expires_at.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in,
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
  }
}
