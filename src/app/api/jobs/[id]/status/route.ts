import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    const updateData: Record<string, unknown> = {}

    if (body.status) updateData.status = body.status
    if (body.completionNotes) updateData.completionNotes = body.completionNotes
    if (body.status === 'completed') updateData.completedAt = new Date()
    if (body.status === 'in_progress' && !body.startedAt) updateData.startedAt = new Date()

    const job = await db.job.update({
      where: { id },
      data: updateData,
    })

    // Add a note if provided
    if (body.note && body.updatedByName) {
      await db.jobNote.create({
        data: {
          jobId: id,
          note: body.note,
          addedBy: session.id,
          addedByName: body.updatedByName,
        }
      })
    }

    return NextResponse.json({ job })
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

    const job = await db.job.findUnique({
      where: { id },
      include: {
        client: true,
        technician: { select: { id: true, name: true, skill: true, phone: true } },
        spareParts: { orderBy: { createdAt: 'desc' } },
        siteVisitLogs: { orderBy: { createdAt: 'desc' } },
        photos: { orderBy: { createdAt: 'desc' } },
        notes: { orderBy: { createdAt: 'desc' } },
        checkIns: { orderBy: { checkInTime: 'desc' } },
        invoices: { select: { id: true, invoiceNo: true, status: true, totalAmount: true } },
      },
    })

    if (!job) return NextResponse.json({ message: 'Job not found' }, { status: 404 })

    return NextResponse.json({ job })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}