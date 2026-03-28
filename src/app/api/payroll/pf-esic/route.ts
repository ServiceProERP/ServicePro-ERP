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

    const payslips = await db.payslip.findMany({
      where: { month, year: parseInt(year) },
      include: {
        employee: { select: { name: true, empCode: true, salary: true } },
      },
    })

    if (payslips.length === 0) {
      return NextResponse.json({ message: `No payslips found for ${month} ${year}. Run payroll first.` }, { status: 404 })
    }

    // Fetch salary structures separately
    const employeeIds = payslips.map(p => p.employeeId)
    const structures = await db.salaryStructure.findMany({
      where: { employeeId: { in: employeeIds } },
    })
    const structureMap = Object.fromEntries(structures.map(s => [s.employeeId, s]))

    const pfRows: { empCode: string; name: string; uan: string; basicSalary: number; employeePf: number; employerPf: number; totalPf: number }[] = []
    const esicRows: { empCode: string; name: string; esicNo: string; grossSalary: number; employeeEsic: number; employerEsic: number; totalEsic: number }[] = []
    let totalEmployeePf = 0, totalEmployerPf = 0, totalEmployeeEsic = 0, totalEmployerEsic = 0

    for (const p of payslips) {
      const ss = structureMap[p.employeeId] || null
      const basic = ss?.basicPay || p.basicSalary
      const gross = basic + p.allowances
      const emplPf = ss?.pf || Math.round(basic * 0.12)
      const erPf = ss?.pfEmployer || Math.round(basic * 0.12)
      const emplEsic = ss ? ss.esic : (gross <= 21000 ? Math.round(gross * 0.0075) : 0)
      const erEsic = ss ? ss.esicEmployer : (gross <= 21000 ? Math.round(gross * 0.0325) : 0)

      pfRows.push({ empCode: p.employee.empCode, name: p.employee.name, uan: ss?.uanNo || '', basicSalary: basic, employeePf: emplPf, employerPf: erPf, totalPf: emplPf + erPf })
      totalEmployeePf += emplPf
      totalEmployerPf += erPf

      if (gross <= 21000) {
        esicRows.push({ empCode: p.employee.empCode, name: p.employee.name, esicNo: ss?.esicNo || '', grossSalary: gross, employeeEsic: emplEsic, employerEsic: erEsic, totalEsic: emplEsic + erEsic })
        totalEmployeeEsic += emplEsic
        totalEmployerEsic += erEsic
      }
    }

    return NextResponse.json({
      month, year,
      pf: { rows: pfRows, totalEmployeePf, totalEmployerPf, totalPf: totalEmployeePf + totalEmployerPf, dueDate: '15th of next month' },
      esic: { rows: esicRows, totalEmployeeEsic, totalEmployerEsic, totalEsic: totalEmployeeEsic + totalEmployerEsic, dueDate: '15th of next month' },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}