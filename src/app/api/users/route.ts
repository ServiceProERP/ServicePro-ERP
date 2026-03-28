import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const includePasswords = searchParams.get('includePasswords') === 'true'

    const users = await db.user.findMany({
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, createdAt: true,
        // Only include password hash if explicitly requested by admin
        ...(includePasswords ? { password: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const body = await req.json()

    if (!body.name || !body.email || !body.password) {
      return NextResponse.json({ message: 'Name, email and password are required' }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { email: body.email } })
    if (existing) return NextResponse.json({ message: 'Email already exists' }, { status: 400 })

    const hashed = await bcrypt.hash(body.password, 10)

    const user = await db.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashed,
        role: body.role || 'staff',
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}