import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const expiresAt = cookieStore.get('expiresAt')?.value;

  if (!accessToken || !expiresAt) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Check if token is expired
  const now = Date.now() / 1000;
  if (now > parseInt(expiresAt)) {
    return NextResponse.json({ error: 'Token expired' }, { status: 401 });
  }

  const athleteCookie = cookieStore.get('athlete')?.value;
  const athlete = athleteCookie ? JSON.parse(athleteCookie) : null;

  if (!athlete) {
    return NextResponse.json({ error: 'Athlete data not found' }, { status: 401 });
  }

  return NextResponse.json({
    accessToken,
    athlete
  });
}
