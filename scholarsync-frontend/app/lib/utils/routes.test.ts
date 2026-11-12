import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';
import { RETURN_TO_COOKIE } from '@/app/lib/constants/auth.constants';
import { isNavItemActive, isProtectedPath, readCookie, safeReturnPath } from './routes';

describe('isProtectedPath', () => {
  it.each(['/library', '/library/', '/collection/abc', '/groups/1/members', '/archive', '/notifications', '/paper/123/read', '/paper/123/read/'])(
    'protects %s', path => expect(isProtectedPath(path)).toBe(true),
  );

  it.each(['/', '/search', '/paper/123', '/paper/123/graph', '/researchers/9', '/librarything', '/groupsx', '/paper/read', '/auth/callback'])(
    'leaves %s public', path => expect(isProtectedPath(path)).toBe(false),
  );
});

describe('safeReturnPath', () => {
  it.each([
    ['/groups/join/abc', '/groups/join/abc'],
    [encodeURIComponent('/library?status=DONE'), '/library?status=DONE'],
    [null, '/'],
    ['', '/'],
    ['https://evil.example', '/'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['%E0%A4%A', '/'],
    ['javascript:alert(1)', '/'],
  ])('%s → %s', (input, expected) => {
    expect(safeReturnPath(input)).toBe(expected);
  });
});

describe('return-to cookie round trip', () => {
  it.each(['/groups/join/abc', '/library?status=DONE', '/paper/W1%2F2/read'])('proxy stores %s and the callback reads it back', path => {
    const response = proxy(new NextRequest(new URL(path, 'http://localhost')));
    // The Set-Cookie header holds the value exactly as the browser will later expose it in document.cookie
    const stored = response.headers.get('set-cookie')!.split(';')[0];
    expect(safeReturnPath(readCookie(stored, RETURN_TO_COOKIE))).toBe(path);
    expect(new URL(response.headers.get('location')!).search).toBe('?signin=required');
  });
});

describe('readCookie', () => {
  it.each([
    ['a=1; post_login_redirect=%2Fx; b=2', '%2Fx'],
    ['post_login_redirect=%2Fx', '%2Fx'],
    ['a=1', undefined],
    ['', undefined],
    ['xpost_login_redirect=%2Fy; post_login_redirect=%2Fz', '%2Fz'],
  ])('%j → %j', (cookies, expected) => {
    expect(readCookie(cookies, RETURN_TO_COOKIE)).toBe(expected);
  });
});

describe('isNavItemActive', () => {
  it.each([
    ['/', '/', true],
    ['/search', '/', false],
    ['/groups', '/groups', true],
    ['/groups/1/members', '/groups', true],
    ['/groupsx', '/groups', false],
    ['/collection', '/library', false],
  ])('%s with %s → %s', (pathname, href, expected) => {
    expect(isNavItemActive(pathname, href)).toBe(expected);
  });
});
