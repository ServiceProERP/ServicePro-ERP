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

    if (!month || !year) {
      return NextResponse.json({ message: 'Month and year required' }, { status: 400 })
    }

    // Include all payslips (draft, approved, paid) — not just approved
    const payslips = await db.payslip.findMany({
      where: { month, year: parseInt(year) },
      include: { employee: { select: { name: true, empCode: true } } },
      orderBy: { createdAt: 'asc' },
    })

    if (payslips.length === 0) {
      return NextResponse.json({ message: `No payslips found for ${month} ${year}. Run payroll first.` }, { status: 404 })
    }

    const employeeIds = payslips.map(p => p.employeeId)
    const structures = await db.salaryStructure.findMany({
      where: { employeeId: { in: employeeIds } },
    })
    const structureMap = Object.fromEntries(structures.map(s => [s.employeeId, s]))

    const headers = ['Sl No', 'Employee ID', 'Employee Name', 'Bank Name', 'Account Number', 'IFSC Code', 'Amount (INR)', 'Status', 'Remarks']
    const rows = payslips.map((p, i) => {
      const ss = structureMap[p.employeeId] || null
      return [
        String(i + 1),
        p.employee.empCode,
        p.employee.name,
        ss?.bankName || 'NOT SET',
        ss?.accountNo || 'NOT SET',
        ss?.ifscCode || 'NOT SET',
        p.netSalary.toFixed(2),
        p.status.toUpperCase(),
        `Salary ${month} ${year}`,
      ]
    })

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const totalAmount = payslips.reduce((s, p) => s + p.netSalary, 0)

    return NextResponse.json({
      csv,
      filename: `salary_transfer_${month}_${year}.csv`,
      totalAmount,
      totalEmployees: payslips.length,
      month, year,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}