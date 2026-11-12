import { NextRequest, NextResponse } from 'next/server';
import { isProtectedPath } from '@/app/lib/utils/routes';
import { AUTH_COOKIE, RETURN_TO_COOKIE, RETURN_TO_MAX_AGE_SECONDS, SIGN_IN_REQUIRED_PARAM } from '@/app/lib/constants/auth.constants';

export function proxy(request: NextRequest) {
  // Presence check only: the backend validates the JWT and AuthGate handles an expired one.
  if (isProtectedPath(request.nextUrl.pathname) && !request.cookies.get(AUTH_COOKIE)) {
    // The flag tells the home page to say why the visitor landed there
    const response = NextResponse.redirect(new URL(`/?${SIGN_IN_REQUIRED_PARAM}=required`, request.url));
    // Remembered so /auth/callback can return here after Google sign-in (e.g. an invite link).
    // Not encoded here: cookies.set URL-encodes the value itself, and safeReturnPath decodes it once.
    response.cookies.set(RETURN_TO_COOKIE, request.nextUrl.pathname + request.nextUrl.search, {
      path: '/', maxAge: RETURN_TO_MAX_AGE_SECONDS, sameSite: 'lax',
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
