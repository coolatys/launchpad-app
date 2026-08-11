import { NextResponse } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'LaunchpadAdmin2026!';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid admin password.' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, message: 'Admin authentication successful.' });
    response.cookies.set('admin_session_token', 'admin_authenticated_session_secret_key_2026', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Admin logged out.' });
  response.cookies.set('admin_session_token', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return response;
}
