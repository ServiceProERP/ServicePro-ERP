import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    // Check if already checked in (no checkout yet)
    const existing = await db.checkIn.findFirst({
      where: { jobId: id, technicianId: session.id, checkOutTime: null },
      orderBy: { checkInTime: 'desc' },
    })

    if (existing && body.type !== 'out') {
      // Already checked in — return existing check-in
      return NextResponse.json({ checkIn: existing, alreadyCheckedIn: true })
    }

    if (body.type === 'out' && existing) {
      // Check out
      const updated = await db.checkIn.update({
        where: { id: existing.id },
        data: {
          checkOutTime: new Date(),
          checkOutLat: body.lat || null,
          checkOutLng: body.lng || null,
        }
      })
      return NextResponse.json({ checkIn: updated, type: 'out' })
    }

    // New check-in
    const checkIn = await db.checkIn.create({
      data: {
        jobId: id,
        technicianId: session.id,
        checkInTime: new Date(),
        checkInLat: body.lat || null,
        checkInLng: body.lng || null,
        notes: body.notes || null,
      }
    })

    // Also update job status to in_progress if still open
    const job = await db.job.findUnique({ where: { id } })
    if (job && job.status === 'open') {
      await db.job.update({ where: { id }, data: { status: 'in_progress' } })
    }

    return NextResponse.json({ checkIn, type: 'in' }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const checkIns = await db.checkIn.findMany({
      where: { jobId: id },
      orderBy: { checkInTime: 'desc' },
    })

    return NextResponse.json({ checkIns })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}