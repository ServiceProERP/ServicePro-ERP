import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') || ''
    const year = searchParams.get('year') || ''
    const employeeId = searchParams.get('employeeId') || ''

    const where: Record<string, unknown> = {}
    if (month) where.month = month
    if (year) where.year = parseInt(year)
    if (employeeId) where.employeeId = employeeId

    const attendance = await db.attendance.findMany({
      where,
      include: {
        employee: {
          select: { id: true, empCode: true, name: true, designation: true, department: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ attendance })
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
    const { employeeId, month, year, totalDays, presentDays, absentDays, halfDays, overtimeHours, leaveDays } = body

    if (!employeeId || !month || !year) {
      return NextResponse.json({ message: 'Employee, month and year are required' }, { status: 400 })
    }

    const attendance = await db.attendance.upsert({
      where: { employeeId_month_year: { employeeId, month, year: parseInt(year) } },
      create: {
        employeeId,
        month,
        year: parseInt(year),
        totalDays: totalDays || 26,
        presentDays: presentDays ?? 26,
        absentDays: absentDays ?? 0,
        halfDays: halfDays ?? 0,
        overtimeHours: overtimeHours ?? 0,
        leaveDays: leaveDays ?? 0,
      },
      update: {
        totalDays: totalDays || 26,
        presentDays: presentDays ?? 26,
        absentDays: absentDays ?? 0,
        halfDays: halfDays ?? 0,
        overtimeHours: overtimeHours ?? 0,
        leaveDays: leaveDays ?? 0,
      },
    })

    return NextResponse.json({ attendance })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}