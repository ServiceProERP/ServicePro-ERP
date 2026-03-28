import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { month, year } = body

    if (!month || !year) {
      return NextResponse.json({ message: 'Month and year are required' }, { status: 400 })
    }

    const yearInt = parseInt(year)

    // Get all active employees with their salary structure
    const employees = await db.employee.findMany({
      where: { isActive: true },
      include: {
        salaryStructure: true,
      },
    })

    if (employees.length === 0) {
      return NextResponse.json({ message: 'No active employees found' }, { status: 400 })
    }

    // Check if payroll already run for this month
    const existingRun = await db.payrollRun.findUnique({
      where: { month_year: { month, year: yearInt } },
    })
    if (existingRun) {
      return NextResponse.json({
        message: `Payroll for ${month} ${year} has already been run. Go to Payslips to view them.`,
      }, { status: 400 })
    }

    let created = 0
    let skipped = 0
    let totalGross = 0
    let totalDeductions = 0
    let totalNet = 0

    for (const emp of employees) {
      // Skip if payslip already exists
      const existing = await db.payslip.findFirst({
        where: { employeeId: emp.id, month, year: yearInt },
      })
      if (existing) { skipped++; continue }

      const ss = emp.salaryStructure

      // Use saved salary structure if available, else fall back to formula
      let basicSalary: number
      let totalAllowances: number
      let totalDeductionsEmp: number

      if (ss && ss.basicPay > 0) {
        // ── Use saved salary structure ──────────────────────────────────────
        basicSalary = ss.basicPay
        totalAllowances = ss.hra + ss.medicalAllowance + ss.conveyanceAllowance + ss.specialAllowance + ss.otherAllowance + ss.bonus
        totalDeductionsEmp = ss.pf + ss.esic + ss.tds + ss.professionalTax + ss.otherDeduction
      } else {
        // ── Fallback formula if no structure set ───────────────────────────
        const gross = emp.salary || 0
        basicSalary = Math.round(gross * 0.40)
        const hra = Math.round(basicSalary * 0.50)
        const medical = 1250
        const conveyance = 1600
        const special = Math.max(0, gross - basicSalary - hra - medical - conveyance)
        totalAllowances = hra + medical + conveyance + special
        const pf = Math.round(basicSalary * 0.12)
        const esic = gross <= 21000 ? Math.round(gross * 0.0075) : 0
        totalDeductionsEmp = pf + esic + 200
      }

      // ── Attendance-based salary calculation ────────────────────────────────
      const attendance = await db.attendance.findUnique({
        where: { employeeId_month_year: { employeeId: emp.id, month, year: yearInt } },
      })

      let grossForMonth = basicSalary + totalAllowances
      if (attendance && attendance.totalDays > 0) {
        const workingDays = attendance.totalDays
        const effectiveDays = attendance.presentDays + (attendance.halfDays * 0.5) + attendance.leaveDays
        const perDaySalary = grossForMonth / workingDays
        grossForMonth = Math.round(perDaySalary * effectiveDays)
        // Recalculate basic proportionally
        basicSalary = Math.round(basicSalary * (effectiveDays / workingDays))
        totalAllowances = Math.max(0, grossForMonth - basicSalary)
        // Recalculate PF on adjusted basic
        if (ss && ss.basicPay > 0) {
          totalDeductionsEmp = Math.round(basicSalary * (ss.pf / (ss.basicPay || 1))) + (ss.esic > 0 ? Math.round(grossForMonth * 0.0075) : 0) + (ss.tds || 0) + (ss.professionalTax || 200) + (ss.otherDeduction || 0)
        } else {
          const adjPf = Math.round(basicSalary * 0.12)
          const adjEsic = grossForMonth <= 21000 ? Math.round(grossForMonth * 0.0075) : 0
          totalDeductionsEmp = adjPf + adjEsic + 200
        }
      }

      // ── Advance recovery this month ────────────────────────────────────────
      const activeAdvances = await db.salaryAdvance.findMany({
        where: { employeeId: emp.id, status: 'active' },
        include: { recoveries: true },
      })

      let advanceRecoveryThisMonth = 0
      for (const adv of activeAdvances) {
        const pending = adv.amount - adv.amountRecovered
        if (pending <= 0) continue
        const recoveryAmt = Math.min(
          pending,
          Math.round(adv.amount / adv.recoveryMonths)
        )
        advanceRecoveryThisMonth += recoveryAmt

        // Record the recovery
        await db.advanceRecovery.create({
          data: {
            advanceId: adv.id,
            month,
            year: yearInt,
            amount: recoveryAmt,
          },
        })

        // Update advance recovered amount
        const newRecovered = adv.amountRecovered + recoveryAmt
        await db.salaryAdvance.update({
          where: { id: adv.id },
          data: {
            amountRecovered: newRecovered,
            status: newRecovered >= adv.amount ? 'closed' : 'active',
          },
        })
      }

      const finalDeductions = totalDeductionsEmp + advanceRecoveryThisMonth
      const netSalary = Math.max(0, grossForMonth - finalDeductions)

      // Create payslip
      await db.payslip.create({
        data: {
          employeeId: emp.id,
          month,
          year: yearInt,
          basicSalary,
          allowances: totalAllowances,
          deductions: finalDeductions,
          netSalary,
          status: 'draft',
        },
      })

      totalGross += grossForMonth
      totalDeductions += finalDeductions
      totalNet += netSalary
      created++
    }

    // Record the payroll run
    await db.payrollRun.create({
      data: {
        month,
        year: yearInt,
        totalEmployees: created,
        totalGross,
        totalDeductions,
        totalNet,
        runBy: 'Admin',
        status: 'completed',
      },
    })

    return NextResponse.json({
      message: `Payroll run complete! ${created} payslips generated${skipped > 0 ? `, ${skipped} skipped` : ''}.`,
      created,
      skipped,
      totalGross,
      totalDeductions,
      totalNet,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}