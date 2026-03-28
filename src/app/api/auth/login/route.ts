import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// ─── In-memory rate limiter ────────────────────────────────────────────────
// Tracks failed login attempts per IP
// In production with multiple servers, use Redis instead
const loginAttempts = new Map<string, { count: number; firstAttempt: number; lockedUntil?: number }>()

const MAX_ATTEMPTS = 5          // Max failed attempts
const WINDOW_MS = 15 * 60 * 1000  // 15 minute window
const LOCKOUT_MS = 30 * 60 * 1000 // 30 minute lockout after max attempts

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

function checkRateLimit(ip: string): { allowed: boolean; remainingAttempts: number; lockedUntil?: number } {
  const now = Date.now()
  const record = loginAttempts.get(ip)

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS }
  }

  // Check if currently locked out
  if (record.lockedUntil && now < record.lockedUntil) {
    return { allowed: false, remainingAttempts: 0, lockedUntil: record.lockedUntil }
  }

  // Reset if window has passed
  if (now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(ip)
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS }
  }

  const remaining = MAX_ATTEMPTS - record.count
  return { allowed: remaining > 0, remainingAttempts: Math.max(0, remaining) }
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now()
  const record = loginAttempts.get(ip)

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now })
    return
  }

  const newCount = record.count + 1
  if (newCount >= MAX_ATTEMPTS) {
    loginAttempts.set(ip, { ...record, count: newCount, lockedUntil: now + LOCKOUT_MS })
  } else {
    loginAttempts.set(ip, { ...record, count: newCount })
  }
}

function clearAttempts(ip: string): void {
  loginAttempts.delete(ip)
}

// ─── Login handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req)

    // Check rate limit BEFORE doing anything else
    const rateLimit = checkRateLimit(ip)
    if (!rateLimit.allowed) {
      const minutesLeft = rateLimit.lockedUntil
        ? Math.ceil((rateLimit.lockedUntil - Date.now()) / 60000)
        : 30
      return NextResponse.json(
        {
          message: `Too many failed attempts. Account locked for ${minutesLeft} more minute${minutesLeft !== 1 ? 's' : ''}.`,
          locked: true,
          lockedUntil: rateLimit.lockedUntil,
        },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Find user
    const user = await db.user.findUnique({ where: { email: normalizedEmail } })

    // SECURITY: Same error message for wrong email OR wrong password
    // Never tell attacker which one is wrong
    if (!user || !user.isActive) {
      recordFailedAttempt(ip)
      const remaining = MAX_ATTEMPTS - (loginAttempts.get(ip)?.count || 0)
      return NextResponse.json(
        {
          message: 'Invalid email or password',
          remainingAttempts: Math.max(0, remaining),
        },
        { status: 401 }
      )
    }

    const valid = await bcrypt.compare(password, user.password)

    if (!valid) {
      recordFailedAttempt(ip)
      const record = loginAttempts.get(ip)
      const remaining = MAX_ATTEMPTS - (record?.count || 0)

      if (remaining <= 0) {
        return NextResponse.json(
          {
            message: 'Too many failed attempts. Account locked for 30 minutes.',
            locked: true,
          },
          { status: 429 }
        )
      }

      return NextResponse.json(
        {
          message: `Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
          remainingAttempts: remaining,
        },
        { status: 401 }
      )
    }

    // Login successful — clear failed attempts
    clearAttempts(ip)

    // Create JWT token
    const token = await createToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })

    // SECURITY: httpOnly prevents JS access, secure=true forces HTTPS in prod
    // sameSite=lax provides CSRF protection
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours (reduced from 7 days)
      path: '/',
    })

    return response
  } catch (err) {
    // SECURITY: Never expose error details in production
    console.error('[Login Error]', err)
    return NextResponse.json(
      { message: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}