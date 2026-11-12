import { PROTECTED_PATHS, PROTECTED_PATTERNS } from '@/app/lib/constants/routes.constants';

export function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))
    || PROTECTED_PATTERNS.some(pattern => pattern.test(pathname));
}

/** Raw (still URL-encoded) value of cookie `name` in a `document.cookie` / Cookie header string. */
export function readCookie(cookies: string, name: string): string | undefined {
  return cookies.split(/;\s*/).find(c => c.startsWith(`${name}=`))?.slice(name.length + 1);
}

/**
 * Decodes a stored return path (cookies hold it URL-encoded once). Only same-site absolute paths are allowed back
 * after sign-in (no "//host" or "/\host" open redirects).
 */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value) return '/';
  let path: string;
  try {
    path = decodeURIComponent(value);
  } catch {
    return '/';
  }
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\') ? path : '/';
}

/** Whether a sidebar link is the current section: "/" only on the home page, others on their path and below. */
export function isNavItemActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
}
