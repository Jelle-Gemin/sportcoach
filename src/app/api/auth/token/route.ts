import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '../../../../services/stravaAuth';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID!;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET!;
    const redirectUri = process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI!;

    const tokenData = await exchangeCodeForTokens(code, clientId, clientSecret, redirectUri);

    // Set httpOnly cookies for secure token storage
    const response = NextResponse.json({
      athlete: tokenData.athlete,
      success: true
    });

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

    response.cookies.set('athlete', JSON.stringify(tokenData.athlete), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.json({ error: 'Failed to exchange token' }, { status: 500 });
  }
}
