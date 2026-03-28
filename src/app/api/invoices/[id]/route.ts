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

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        job: {
          include: {
            technician: { select: { name: true } },
            spareParts: true,
          },
        },
        payments: { orderBy: { createdAt: 'desc' } },
        refunds: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!invoice) return NextResponse.json({ message: 'Invoice not found' }, { status: 404 })

    return NextResponse.json({ invoice })
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

    let updateData: Record<string, unknown> = {}

    if (body.recalculate) {
      const subtotal = parseFloat(body.subtotal) || 0
      const discountAmount = parseFloat(body.discountAmount) || 0
      const taxAmount = parseFloat(body.taxAmount) || 0
      const additionalTax = parseFloat(body.additionalTax) || 0
      const serviceCharges = parseFloat(body.serviceCharges) || 0
      const visitingCharges = parseFloat(body.visitingCharges) || 0
      const totalAmount =
        subtotal - discountAmount + taxAmount + additionalTax + serviceCharges + visitingCharges

      updateData = {
        subtotal,
        discountAmount,
        taxAmount,
        additionalTax,
        serviceCharges,
        visitingCharges,
        additionalChargesDesc: body.additionalChargesDesc || null,
        totalAmount,
        clientId: body.clientId,
        jobId: body.jobId || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes || null,
        paymentMode: body.paymentMode || null,
        bankName: body.bankName || null,
        accountNo: body.accountNo || null,
        ifscCode: body.ifscCode || null,
        upiId: body.upiId || null,
        termsConditions: body.termsConditions || null,
      }
    } else {
      if (body.status !== undefined) updateData.status = body.status
      if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null
      if (body.notes !== undefined) updateData.notes = body.notes
      if (body.bankName !== undefined) updateData.bankName = body.bankName
      if (body.accountNo !== undefined) updateData.accountNo = body.accountNo
      if (body.ifscCode !== undefined) updateData.ifscCode = body.ifscCode
      if (body.upiId !== undefined) updateData.upiId = body.upiId
      if (body.termsConditions !== undefined) updateData.termsConditions = body.termsConditions
    }

    const invoice = await db.invoice.update({ where: { id }, data: updateData })

    return NextResponse.json({ invoice })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}