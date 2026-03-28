import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employeeId') || ''

    if (employeeId) {
      const structure = await db.salaryStructure.findUnique({
        where: { employeeId },
      })
      return NextResponse.json({ structure })
    }

    // Return all salary structures with employee info
    const structures = await db.salaryStructure.findMany({
      include: {
        employee: {
          select: {
            id: true, empCode: true, name: true,
            designation: true, department: true, status: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ structures })
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
    const { employeeId, ...data } = body

    if (!employeeId) {
      return NextResponse.json({ message: 'Employee ID required' }, { status: 400 })
    }

    // Calculate gross and net from components
    const gross =
      (data.basicPay || 0) +
      (data.hra || 0) +
      (data.medicalAllowance || 0) +
      (data.conveyanceAllowance || 0) +
      (data.specialAllowance || 0) +
      (data.otherAllowance || 0) +
      (data.bonus || 0)

    const totalDeductions =
      (data.pf || 0) +
      (data.esic || 0) +
      (data.tds || 0) +
      (data.professionalTax || 0) +
      (data.otherDeduction || 0)

    const netSalary = gross - totalDeductions

    // Upsert salary structure
    const structure = await db.salaryStructure.upsert({
      where: { employeeId },
      create: {
        employeeId,
        basicPay: data.basicPay || 0,
        hra: data.hra || 0,
        medicalAllowance: data.medicalAllowance || 0,
        conveyanceAllowance: data.conveyanceAllowance || 0,
        specialAllowance: data.specialAllowance || 0,
        otherAllowance: data.otherAllowance || 0,
        bonus: data.bonus || 0,
        pf: data.pf || 0,
        pfEmployer: data.pfEmployer || 0,
        esic: data.esic || 0,
        esicEmployer: data.esicEmployer || 0,
        tds: data.tds || 0,
        professionalTax: data.professionalTax || 200,
        otherDeduction: data.otherDeduction || 0,
        bankName: data.bankName || null,
        accountNo: data.accountNo || null,
        ifscCode: data.ifscCode || null,
        bankBranch: data.bankBranch || null,
        aadhaar: data.aadhaar || null,
        panCard: data.panCard || null,
        uanNo: data.uanNo || null,
        esicNo: data.esicNo || null,
      },
      update: {
        basicPay: data.basicPay || 0,
        hra: data.hra || 0,
        medicalAllowance: data.medicalAllowance || 0,
        conveyanceAllowance: data.conveyanceAllowance || 0,
        specialAllowance: data.specialAllowance || 0,
        otherAllowance: data.otherAllowance || 0,
        bonus: data.bonus || 0,
        pf: data.pf || 0,
        pfEmployer: data.pfEmployer || 0,
        esic: data.esic || 0,
        esicEmployer: data.esicEmployer || 0,
        tds: data.tds || 0,
        professionalTax: data.professionalTax || 200,
        otherDeduction: data.otherDeduction || 0,
        bankName: data.bankName || null,
        accountNo: data.accountNo || null,
        ifscCode: data.ifscCode || null,
        bankBranch: data.bankBranch || null,
        aadhaar: data.aadhaar || null,
        panCard: data.panCard || null,
        uanNo: data.uanNo || null,
        esicNo: data.esicNo || null,
        effectiveFrom: new Date(),
      },
    })

    // Also update the employee's gross salary field for display
    await db.employee.update({
      where: { id: employeeId },
      data: { salary: gross },
    })

    return NextResponse.json({ structure, gross, netSalary })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}