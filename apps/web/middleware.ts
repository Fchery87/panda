import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/projects') || 
      request.nextUrl.pathname.startsWith('/settings')) {
    
    const token = request.cookies.get('ConvexAuthToken')?.value
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/projects/:path*', '/settings/:path*'],
}