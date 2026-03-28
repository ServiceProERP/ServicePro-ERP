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
    const summary = searchParams.get('summary') === 'true'

    if (summary) {
      // Return payroll run history from PayrollRun table
      const runs = await db.payrollRun.findMany({
        orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
      })

      const summaryList = runs.map(r => ({
        month: r.month,
        year: r.year,
        totalEmployees: r.totalEmployees,
        totalBasic: r.totalGross,
        totalAllowances: 0,
        totalDeductions: r.totalDeductions,
        totalNet: r.totalNet,
        status: r.status,
      }))

      return NextResponse.json({ summary: summaryList })
    }

    // Normal payslip list
    const where: Record<string, unknown> = {}
    if (month) where.month = month
    if (year) where.year = parseInt(year)
    if (employeeId) where.employeeId = employeeId

    const payslips = await db.payslip.findMany({
      where,
      include: {
        employee: {
          select: {
            name: true,
            empCode: true,
            designation: true,
            department: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ payslips })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}