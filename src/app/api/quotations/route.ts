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

    const quotations = await db.quotation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ quotations })
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

    // items can be pre-stringified JSON object or a lineItems array
    let itemsString: string
    if (typeof body.items === 'string') {
      itemsString = body.items
    } else if (body.lineItems) {
      itemsString = JSON.stringify(body.lineItems)
    } else {
      itemsString = JSON.stringify([])
    }

    const quotation = await db.quotation.create({
      data: {
        quotationNo: generateCode('QT'),
        clientName: body.clientName,
        clientEmail: body.clientEmail || null,
        clientPhone: body.clientPhone || null,
        items: itemsString,
        subtotal: parseFloat(body.subtotal) || 0,
        taxAmount: parseFloat(body.taxAmount) || 0,
        totalAmount: parseFloat(body.totalAmount) || 0,
        status: 'draft',
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        notes: body.notes || null,
      },
    })

    return NextResponse.json({ quotation }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}