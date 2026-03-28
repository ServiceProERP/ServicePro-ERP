import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateCode } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''
    const all = searchParams.get('all') === 'true' // admin: get all requests

    const where: Record<string, unknown> = {}

    // Technicians only see their own requests
    if (!all || session.role === 'technician') {
      const technician = await db.technician.findFirst({
        where: { OR: [{ email: session.email }, { name: session.name }] }
      })
      if (technician) where.technicianId = technician.id
    }

    if (type) where.type = type
    if (status) where.status = status

    const requests = await db.technicianRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ requests })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    const technician = await db.technician.findFirst({
      where: { OR: [{ email: session.email }, { name: session.name }] }
    })

    const request = await db.technicianRequest.create({
      data: {
        requestNo: generateCode('REQ'),
        technicianId: technician?.id || session.id,
        technicianName: session.name,
        empCode: technician?.empCode || body.empCode || null,
        type: body.type,
        status: 'pending',
        priority: body.priority || 'normal',
        subject: body.subject,
        description: body.description,
        reason: body.reason || null,
        // Job transfer
        jobId: body.jobId || null,
        currentJobNo: body.currentJobNo || null,
        transferToTechId: body.transferToTechId || null,
        transferToTechName: body.transferToTechName || null,
        // Leave
        leaveType: body.leaveType || null,
        leaveFrom: body.leaveFrom ? new Date(body.leaveFrom) : null,
        leaveTo: body.leaveTo ? new Date(body.leaveTo) : null,
        leaveDays: body.leaveDays ? parseFloat(body.leaveDays) : null,
        leaveHandoverTo: body.leaveHandoverTo || null,
        // Overtime
        overtimeDate: body.overtimeDate ? new Date(body.overtimeDate) : null,
        overtimeHours: body.overtimeHours ? parseFloat(body.overtimeHours) : null,
        overtimeReason: body.overtimeReason || null,
        // Expense
        expenseAmount: body.expenseAmount ? parseFloat(body.expenseAmount) : null,
        expenseCategory: body.expenseCategory || null,
        expenseDate: body.expenseDate ? new Date(body.expenseDate) : null,
        expenseBillUrl: body.expenseBillUrl || null,
        // Tool
        toolName: body.toolName || null,
        toolQuantity: body.toolQuantity ? parseInt(body.toolQuantity) : null,
        toolNeededBy: body.toolNeededBy ? new Date(body.toolNeededBy) : null,
        // Handover
        handoverJobIds: body.handoverJobIds || null,
        handoverToTechId: body.handoverToTechId || null,
        handoverToTechName: body.handoverToTechName || null,
        handoverNotes: body.handoverNotes || null,
        handoverDate: body.handoverDate ? new Date(body.handoverDate) : null,
        // Training
        trainingTopic: body.trainingTopic || null,
        trainingReason: body.trainingReason || null,
        // Attachment
        attachmentUrl: body.attachmentUrl || null,
      }
    })

    return NextResponse.json({ request }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}