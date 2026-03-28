import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const payslip = await db.payslip.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            name: true, empCode: true, designation: true,
            department: true, phone: true, email: true, joinDate: true,
          },
        },
      },
    })

    if (!payslip) return NextResponse.json({ message: 'Payslip not found' }, { status: 404 })

    // Also fetch salary structure for detailed breakdown
    const salaryStructure = await db.salaryStructure.findUnique({
      where: { employeeId: payslip.employeeId },
    })

    return NextResponse.json({ payslip, salaryStructure })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    const payslip = await db.payslip.update({
      where: { id },
      data: { status: body.status },
    })

    return NextResponse.json({ payslip })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}