import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const payables = await db.payable.findMany({
      include: {
        vendor: {
          select: {
            companyName: true,
            contactPerson: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ payables })
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

    if (!body.vendorId || !body.description || !body.amount) {
      return NextResponse.json({ message: 'Vendor, description and amount are required' }, { status: 400 })
    }

    const amountPaid = parseFloat(body.amountPaid) || 0
    const amount = parseFloat(body.amount)
    const status = amountPaid >= amount ? 'paid' : amountPaid > 0 ? 'partial' : 'pending'

    const payable = await db.payable.create({
      data: {
        vendorId: body.vendorId,
        description: body.description,
        amount,
        amountPaid,
        paymentType: body.paymentType || 'pending',
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        status,
      },
    })

    return NextResponse.json({ payable }, { status: 201 })
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
    const { id, amountPaid, paymentType } = body

    if (!id) return NextResponse.json({ message: 'ID is required' }, { status: 400 })

    const existing = await db.payable.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ message: 'Payable not found' }, { status: 404 })

    const newAmountPaid = parseFloat(amountPaid) || 0
    const newStatus =
      newAmountPaid >= existing.amount ? 'paid'
      : newAmountPaid > 0 ? 'partial'
      : 'pending'

    const payable = await db.payable.update({
      where: { id },
      data: {
        amountPaid: newAmountPaid,
        paymentType: paymentType || existing.paymentType,
        status: newStatus,
      },
    })

    return NextResponse.json({ payable })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}