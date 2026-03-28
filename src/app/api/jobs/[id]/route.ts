import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

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
        technician: true,
        spareParts: true,
        workOrders: true,
        invoices: true,
      },
    })

    if (!job) return NextResponse.json({ message: 'Job not found' }, { status: 404 })

    return NextResponse.json({ job })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    const job = await db.job.update({
      where: { id },
      data: {
        ...(body.jobTitle && { jobTitle: body.jobTitle }),
        ...(body.jobType && { jobType: body.jobType }),
        ...(body.priority && { priority: body.priority }),
        ...(body.status && { status: body.status }),
        ...(body.technicianId !== undefined && { technicianId: body.technicianId }),
        ...(body.siteAddress !== undefined && { siteAddress: body.siteAddress }),
        ...(body.contactPerson !== undefined && { contactPerson: body.contactPerson }),
        ...(body.contactPhone !== undefined && { contactPhone: body.contactPhone }),
        ...(body.billingContact !== undefined && { billingContact: body.billingContact }),
        ...(body.billingPhone !== undefined && { billingPhone: body.billingPhone }),
        ...(body.machineName !== undefined && { machineName: body.machineName }),
        ...(body.machineSerial !== undefined && { machineSerial: body.machineSerial }),
        ...(body.faultDescription !== undefined && { faultDescription: body.faultDescription }),
        ...(body.deadline !== undefined && { deadline: body.deadline ? new Date(body.deadline) : null }),
        ...(body.estimatedAmount !== undefined && { estimatedAmount: body.estimatedAmount ? parseFloat(body.estimatedAmount) : null }),
        ...(body.actualAmount !== undefined && { actualAmount: body.actualAmount ? parseFloat(body.actualAmount) : null }),
        ...(body.remarks !== undefined && { remarks: body.remarks }),
        ...(body.status === 'completed' && { completedAt: new Date() }),
      },
    })

    return NextResponse.json({ job })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    await db.job.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
