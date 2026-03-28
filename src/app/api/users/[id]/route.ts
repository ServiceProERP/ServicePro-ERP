import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await req.json()

    const updateData: Record<string, unknown> = {}

    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.role !== undefined) updateData.role = body.role
    if (body.name !== undefined) updateData.name = body.name

    // Reset password
    if (body.resetPassword) {
      if (body.resetPassword.length < 6) {
        return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 })
      }
      updateData.password = await bcrypt.hash(body.resetPassword, 10)
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    })

    return NextResponse.json({ user })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}