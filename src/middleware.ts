import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Paths that don't require authentication
const publicPaths = ['/login', '/password-reset', '/register'];

// Paths that require specific roles
const roleBasedPaths = {
  '/admin/users': ['SUPERADMIN', 'ADMIN'],
  '/admin/stations': ['SUPERADMIN', 'ADMIN', 'EDITOR'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect to login if not authenticated
  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(url);
  }

  // Check role-based access for admin routes
  if (pathname.startsWith('/admin')) {
    const userType = token.userType as string;
    const staffRole = token.staffRole as string;

    // Only staff users can access admin routes
    if (userType !== 'STAFF') {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    // Check specific path permissions
    for (const [path, allowedRoles] of Object.entries(roleBasedPaths)) {
      if (pathname.startsWith(path) && !allowedRoles.includes(staffRole)) {
        return new NextResponse('Unauthorized', { status: 403 });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}; 