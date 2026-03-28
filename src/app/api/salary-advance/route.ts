import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employeeId') || ''
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = {}
    if (employeeId) where.employeeId = employeeId
    if (status) where.status = status

    const advances = await db.salaryAdvance.findMany({
      where,
      include: {
        employee: {
          select: { id: true, empCode: true, name: true, designation: true, department: true },
        },
        recoveries: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate pending recovery for each advance
    const advancesWithPending = advances.map(a => ({
      ...a,
      pendingAmount: a.amount - a.amountRecovered,
      recoveryPerMonth: a.recoveryMonths > 0
        ? Math.round((a.amount - a.amountRecovered) / Math.max(1, a.recoveryMonths - a.recoveries.length))
        : 0,
    }))

    const totalOutstanding = advancesWithPending
      .filter(a => a.status === 'active')
      .reduce((s, a) => s + a.pendingAmount, 0)

    return NextResponse.json({ advances: advancesWithPending, totalOutstanding })
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
    const { employeeId, amount, reason, approvedBy, recoveryMonths, disbursedOn } = body

    if (!employeeId || !amount || !reason) {
      return NextResponse.json({ message: 'Employee, amount and reason are required' }, { status: 400 })
    }

    const advance = await db.salaryAdvance.create({
      data: {
        employeeId,
        amount: parseFloat(amount),
        reason,
        approvedBy: approvedBy || null,
        recoveryMonths: parseInt(recoveryMonths) || 1,
        disbursedOn: disbursedOn ? new Date(disbursedOn) : new Date(),
        status: 'active',
      },
    })

    return NextResponse.json({ advance }, { status: 201 })
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
    const { id, status } = body

    if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 })

    const advance = await db.salaryAdvance.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json({ advance })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}