import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const employee = await db.employee.findFirst({
      where: { OR: [{ email: session.email }, { name: session.name }] }
    })

    if (!employee) return NextResponse.json({ payslips: [] })

    const payslips = await db.payslip.findMany({
      where: { employeeId: employee.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    // Add PF field (12% of basic)
    const enriched = payslips.map(p => ({
      ...p,
      pf: Math.round(p.basicSalary * 0.12),
    }))

    return NextResponse.json({ payslips: enriched })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}