import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// We store payroll actions in the Payslip notes/status fields
// and use a simple approach: find the payslip for the employee+month+year
// and update it with the action data

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

    // Get all payslips for this month with employee info
    const payslips = await db.payslip.findMany({
      where: { month, year: parseInt(year) },
      include: {
        employee: {
          select: { id: true, empCode: true, name: true, designation: true, department: true, salary: true },
        },
      },
    })

    return NextResponse.json({ payslips })
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
    const { employeeId, month, year, actionType, amount, note, salaryStatus } = body

    if (!employeeId || !month || !year) {
      return NextResponse.json({ message: 'Employee, month and year required' }, { status: 400 })
    }

    // Find existing payslip
    let payslip = await db.payslip.findFirst({
      where: { employeeId, month, year: parseInt(year) },
    })

    if (!payslip) {
      return NextResponse.json({ message: 'No payslip found. Run payroll first.' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (actionType === 'status' && salaryStatus) {
      // Map salary status to payslip status
      const statusMap: Record<string, string> = {
        pending: 'draft',
        partially_paid: 'approved',
        paid: 'paid',
        held: 'held',
        fraud: 'held',
      }
      updateData.status = statusMap[salaryStatus] || 'draft'
    }

    if (actionType === 'bonus' && amount) {
      // Add bonus to net salary and allowances
      updateData.allowances = payslip.allowances + parseFloat(amount)
      updateData.netSalary = payslip.netSalary + parseFloat(amount)
    }

    if (actionType === 'deduction' && amount) {
      // Add deduction
      updateData.deductions = payslip.deductions + parseFloat(amount)
      updateData.netSalary = Math.max(0, payslip.netSalary - parseFloat(amount))
    }

    if (actionType === 'fraud') {
      updateData.status = 'held'
      updateData.netSalary = 0
    }

    const updated = await db.payslip.update({
      where: { id: payslip.id },
      data: updateData,
    })

    return NextResponse.json({ payslip: updated, note })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}