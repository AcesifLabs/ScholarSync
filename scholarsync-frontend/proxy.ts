import { NextRequest, NextResponse } from 'next/server';
import { PROTECTED_PATHS } from '@/app/lib/providers/AuthProvider.constants';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if the current path starts with any of the protected path prefixes
  const isProtected = PROTECTED_PATHS.some(path => pathname.startsWith(path));

  if (isProtected) {
    // Rely on the presence of the session cookie. 
    // Backend will return 401 if it's invalid, which AuthProvider handles.
    const token = request.cookies.get('JSESSIONID') || request.cookies.get('auth_token');
    
    if (!token) {
      // Redirect to home (which has the Sign In button)
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
      /*
       * Match all request paths except for the ones starting with:
       * - api (API routes)
       * - _next/static (static files)
       * - _next/image (image optimization files)
       * - favicon.ico (favicon file)
       */
      '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
