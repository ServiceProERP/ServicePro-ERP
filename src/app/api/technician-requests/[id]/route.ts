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
    if (body.adminNotes) updateData.adminNotes = body.adminNotes
    if (body.rejectionReason) updateData.rejectionReason = body.rejectionReason

    if (body.status === 'approved' || body.status === 'rejected') {
      updateData.approvedBy = session.name
      updateData.approvedAt = new Date()
    }

    const request = await db.technicianRequest.update({
      where: { id },
      data: updateData,
    })

    // If job transfer approved, reassign the job
    if (body.status === 'approved' && request.type === 'job_transfer' && request.jobId && request.transferToTechId) {
      await db.job.update({
        where: { id: request.jobId },
        data: { technicianId: request.transferToTechId }
      })
    }

    return NextResponse.json({ request })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}