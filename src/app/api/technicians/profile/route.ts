import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const technician = await db.technician.findFirst({
      where: { OR: [{ email: session.email }, { name: session.name }] }
    })

    return NextResponse.json({ technician })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    const technician = await db.technician.findFirst({
      where: { OR: [{ email: session.email }, { name: session.name }] }
    })

    if (!technician) return NextResponse.json({ message: 'Profile not found' }, { status: 404 })

    // Technicians can only update phone and email
    const updated = await db.technician.update({
      where: { id: technician.id },
      data: {
        ...(body.phone ? { phone: body.phone } : {}),
        ...(body.email ? { email: body.email } : {}),
      }
    })

    return NextResponse.json({ technician: updated })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}