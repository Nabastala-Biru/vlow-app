import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { COOKIE_NAME, verifySessionToken } from '@/lib/auth';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Izinkan akses ke halaman login, halaman publik read-only (/share), dan aset internal
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/share') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const isValid = token ? await verifySessionToken(token) : false;

  if (!isValid) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};