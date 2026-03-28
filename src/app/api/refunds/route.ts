import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateCode } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const refunds = await db.refund.findMany({
      where,
      include: {
        client: { select: { companyName: true, phone: true } },
        job: { select: { jobNo: true, jobTitle: true } },
        invoice: { select: { invoiceNo: true, totalAmount: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const summary = {
      total: refunds.reduce((s, r) => s + r.amount, 0),
      pending: refunds.filter(r => r.status === 'pending').length,
      approved: refunds
        .filter(r => r.status === 'approved')
        .reduce((s, r) => s + r.amount, 0),
      count: refunds.length,
    }

    return NextResponse.json({ refunds, summary })
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

    if (!body.clientId || !body.amount || !body.reason) {
      return NextResponse.json(
        { message: 'Client, amount and reason are required' },
        { status: 400 }
      )
    }

    const refund = await db.refund.create({
      data: {
        refundNo: generateCode('RFD'),
        clientId: body.clientId,
        jobId: body.jobId || null,
        invoiceId: body.invoiceId || null,
        refundType: body.refundType || 'full',
        amount: parseFloat(body.amount),
        reason: body.reason,
        status: 'pending',
        notes: body.notes || null,
        refundDate: new Date(),
      },
    })

    return NextResponse.json({ refund }, { status: 201 })
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

    if (!body.id) return NextResponse.json({ message: 'ID is required' }, { status: 400 })

    const refund = await db.refund.update({
      where: { id: body.id },
      data: {
        status: body.status,
        approvedBy: body.approvedBy || null,
        notes: body.notes || null,
      },
    })

    return NextResponse.json({ refund })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}