import { NextRequest, NextResponse } from 'next/server';

// ── The Hub's single auth boundary ────────────────────────────────────────────
// Next.js 16 renamed `middleware` to `proxy`; this root-level file is the ONE
// place the whole app is gated. Every request must carry the httpOnly `hub_auth`
// cookie (value 'true', set by /api/auth on successful login) EXCEPT:
//   - /login and /api/auth  (the login page and the endpoint that sets the cookie)
//   - /api/oldoaktown/webhook (a server-to-server call from the oldoaktown repo's
//     own approve.js — it can't carry the Hub's browser cookie, so it checks a
//     shared secret itself; see the comment at the top of that route)
//   - Next's own static assets (excluded by the matcher below)
//
// Unauthenticated PAGE requests redirect to /login; unauthenticated API requests
// return 401 JSON (the frontend fetch calls expect JSON, not an HTML redirect).
//
// Do NOT add per-route cookie checks elsewhere — they drift out of sync with this
// file. This proxy is the auth boundary for the entire Hub. Any new exemption
// here must authenticate itself some other way (like the webhook's secret) —
// never add a path here that's left fully open.

const PUBLIC_PATHS = ['/login', '/api/auth', '/api/oldoaktown/webhook'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Login page and the auth endpoint are always reachable.
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Same gate as the (now-removed) inline check in the push route.
  const authed = request.cookies.get('hub_auth')?.value === 'true';
  if (authed) {
    return NextResponse.next();
  }

  // Unauthenticated: APIs get JSON 401, pages get redirected to /login.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
