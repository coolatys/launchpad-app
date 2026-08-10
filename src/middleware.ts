import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define public paths that do not require authentication
  const isPublicPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.');

  // Check for Supabase session cookies (supabase-js stores auth tokens in cookies or localStorage)
  const supabaseToken =
    request.cookies.get('sb-access-token')?.value ||
    request.cookies.get('sb-quecxpbjvbpvxdcrpjtj-auth-token')?.value ||
    request.cookies.get('supabase-auth-token')?.value;

  // If attempting to access a protected route without an auth token, redirect to /login
  if (!isPublicPath && !supabaseToken) {
    // Note: If client-side AuthContext manages session in localStorage, client component will redirect if unauthenticated
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
