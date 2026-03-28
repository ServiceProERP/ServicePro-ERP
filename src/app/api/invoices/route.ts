import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateCode } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const all = searchParams.get('all') === 'true'

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { invoiceNo: { contains: search, mode: 'insensitive' } },
        { client: { companyName: { contains: search, mode: 'insensitive' } } },
      ]
    }
    if (status) where.status = status

    const [invoices, total, allInvoices] = await Promise.all([
      db.invoice.findMany({
        where,
        include: {
          client: { select: { companyName: true } },
          job: { select: { jobNo: true } },
          payments: { select: { amount: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: all ? 0 : (page - 1) * limit,
        take: all ? undefined : limit,
      }),
      db.invoice.count({ where }),
      db.invoice.findMany({
        select: {
          status: true,
          totalAmount: true,
          dueDate: true,
          payments: { select: { amount: true } },
        },
      }),
    ])

    const now = new Date()
    const summary = {
      totalAmount: allInvoices.reduce((s, i) => s + i.totalAmount, 0),
      paidAmount: allInvoices
        .filter(i => i.status === 'paid')
        .reduce((s, i) => s + i.totalAmount, 0),
      unpaidAmount: allInvoices
        .filter(i => i.status === 'unpaid' || i.status === 'partial')
        .reduce((s, i) => s + i.totalAmount, 0),
      overdueAmount: allInvoices
        .filter(i =>
          (i.status === 'unpaid' || i.status === 'partial') &&
          i.dueDate && new Date(i.dueDate) < now
        )
        .reduce((s, i) => s + i.totalAmount, 0),
      totalDues: allInvoices.reduce((s, i) => {
        const paid = i.payments.reduce((ps, p) => ps + p.amount, 0)
        return s + Math.max(0, i.totalAmount - paid)
      }, 0),
    }

    return NextResponse.json({ invoices, total, summary })
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

    const subtotal = parseFloat(body.subtotal) || 0
    const discountAmount = parseFloat(body.discountAmount) || 0
    const taxAmount = parseFloat(body.taxAmount) || 0
    const additionalTax = parseFloat(body.additionalTax) || 0
    const serviceCharges = parseFloat(body.serviceCharges) || 0
    const visitingCharges = parseFloat(body.visitingCharges) || 0
    const totalAmount = subtotal - discountAmount + taxAmount + additionalTax + serviceCharges + visitingCharges

    const invoice = await db.invoice.create({
      data: {
        invoiceNo: generateCode('INV'),
        clientId: body.clientId,
        jobId: body.jobId || null,
        subtotal,
        discountAmount,
        taxAmount,
        additionalTax,
        serviceCharges,
        visitingCharges,
        additionalChargesDesc: body.additionalChargesDesc || null,
        totalAmount,
        status: 'unpaid',
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes || null,
        paymentMode: body.paymentMode || null,
        bankName: body.bankName || null,
        accountNo: body.accountNo || null,
        ifscCode: body.ifscCode || null,
        upiId: body.upiId || null,
        termsConditions: body.termsConditions || null,
      },
    })

    // If advance or partial payment recorded at creation time
    if (body.initialPaymentAmount && parseFloat(body.initialPaymentAmount) > 0) {
      const payAmount = parseFloat(body.initialPaymentAmount)
      await db.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: payAmount,
          paymentDate: new Date(),
          paymentMode: body.paymentMode || 'Cash',
          paymentType: body.initialPaymentType || 'advance',
          notes: 'Initial payment at invoice creation',
        },
      })
      const newStatus = payAmount >= totalAmount ? 'paid' : 'partial'
      await db.invoice.update({
        where: { id: invoice.id },
        data: {
          status: newStatus,
          paidAt: newStatus === 'paid' ? new Date() : null,
        },
      })
    }

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}