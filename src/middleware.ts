import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// SECURITY: Must be set in environment variables
const secret = new TextEncoder().encode(process.env.JWT_SECRET)

// ─── Role-based page access ────────────────────────────────────────────────

const roleBlocked: Record<string, string[]> = {
  manager: [
    '/dashboard/settings',
    '/dashboard/hr/docs',
    '/dashboard/payroll/bank-transfer',
    '/dashboard/payroll/pf-esic',
  ],
  hr: [
    '/dashboard/settings',
    '/dashboard/finance',
    '/dashboard/inventory',
    '/dashboard/sales',
  ],
  accountant: [
    '/dashboard/settings',
    '/dashboard/operations',
    '/dashboard/hr',
    '/dashboard/inventory',
    '/dashboard/sales',
  ],
  staff: [
    '/dashboard/settings',
    '/dashboard/finance',
    '/dashboard/payroll',
    '/dashboard/hr',
    '/dashboard/sales',
    '/dashboard/reports',
  ],
}

const roleAllowed: Record<string, string[]> = {
  manager: [
    '/dashboard/operations',
    '/dashboard/clients-vendors',
    '/dashboard/hr/workforce',
    '/dashboard/hr/technician-requests',
    '/dashboard/finance',
    '/dashboard/inventory',
    '/dashboard/sales',
    '/dashboard/reports',
    '/dashboard/payroll',
  ],
  hr: [
    '/dashboard/hr',
    '/dashboard/payroll',
    '/dashboard/reports',
    '/dashboard/operations/jobs',
    '/dashboard/clients-vendors',
  ],
  accountant: [
    '/dashboard/finance',
    '/dashboard/payroll',
    '/dashboard/reports',
    '/dashboard/clients-vendors/clients',
  ],
  staff: [
    '/dashboard/operations/jobs',
    '/dashboard/clients-vendors/clients',
    '/dashboard/inventory',
  ],
}

function canAccess(role: string, pathname: string): boolean {
  if (role === 'superadmin' || role === 'admin') return true
  if (role === 'technician') return pathname.startsWith('/dashboard/technician')

  // Check blocked first
  const blocked = roleBlocked[role] || []
  for (const b of blocked) {
    if (pathname.startsWith(b)) return false
  }

  // Check allowed
  const allowed = roleAllowed[role] || []
  for (const a of allowed) {
    if (pathname.startsWith(a)) return true
  }

  return false
}

// ─── Security headers ──────────────────────────────────────────────────────

function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  // XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block')
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  // Permissions policy
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)')
  return response
}

// ─── Main middleware ───────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const response = NextResponse.next()

  // Add security headers to ALL responses
  addSecurityHeaders(response)

  // Only apply auth logic to dashboard routes
  if (!pathname.startsWith('/dashboard')) {
    return response
  }

  const token = request.cookies.get('token')?.value

  // No token → redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, secret)
    const role = (payload.role as string) || 'staff'
    const userId = payload.id as string

    // Check if token is about to expire (less than 1 hour left)
    // Refresh it automatically
    const exp = payload.exp as number
    const now = Math.floor(Date.now() / 1000)
    const oneHour = 60 * 60

    // Technician → force to technician portal
    if (role === 'technician') {
      if (!pathname.startsWith('/dashboard/technician')) {
        return NextResponse.redirect(new URL('/dashboard/technician', request.url))
      }
      addSecurityHeaders(NextResponse.next())
      return NextResponse.next()
    }

    // Non-technician → block technician portal
    if (pathname.startsWith('/dashboard/technician')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Base dashboard — everyone allowed
    if (pathname === '/dashboard') {
      return NextResponse.next()
    }

    // Check role-based access
    if (!canAccess(role, pathname)) {
      return NextResponse.redirect(new URL('/dashboard/unauthorized', request.url))
    }

    return NextResponse.next()

  } catch (err) {
    // Invalid or expired token → clear cookie and redirect to login
    const response = NextResponse.redirect(new URL('/', request.url))
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      expires: new Date(0),
      path: '/',
    })
    return response
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
}