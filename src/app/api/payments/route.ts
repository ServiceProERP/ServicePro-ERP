import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const invoiceId = searchParams.get('invoiceId') || ''

    const where: Record<string, unknown> = {}
    if (invoiceId) where.invoiceId = invoiceId

    const payments = await db.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        invoice: {
          select: {
            invoiceNo: true,
            totalAmount: true,
            client: { select: { companyName: true } },
          },
        },
      },
    })

    const now = new Date()
    const thisMonth = payments.filter(p => {
      const d = new Date(p.paymentDate)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })

    const summary = {
      total: payments.reduce((s, p) => s + p.amount, 0),
      thisMonth: thisMonth.reduce((s, p) => s + p.amount, 0),
      count: payments.length,
    }

    return NextResponse.json({ payments, summary })
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

    const payment = await db.payment.create({
      data: {
        invoiceId: body.invoiceId,
        amount: parseFloat(body.amount),
        paymentDate: new Date(body.paymentDate),
        paymentMode: body.paymentMode,
        paymentType: body.paymentType || 'full',
        reference: body.reference || null,
        notes: body.notes || null,
      },
    })

    // Auto update invoice status
    const invoice = await db.invoice.findUnique({
      where: { id: body.invoiceId },
      include: { payments: true },
    })

    if (invoice) {
      const totalPaid = invoice.payments.reduce((s, p) => s + p.amount, 0)
      const newStatus = totalPaid >= invoice.totalAmount ? 'paid'
        : totalPaid > 0 ? 'partial'
        : 'unpaid'

      await db.invoice.update({
        where: { id: body.invoiceId },
        data: {
          status: newStatus,
          paidAt: newStatus === 'paid' ? new Date() : null,
        },
      })
    }

    return NextResponse.json({ payment }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}