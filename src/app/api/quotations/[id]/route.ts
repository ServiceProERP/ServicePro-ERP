import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateCode } from '@/lib/utils'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const quotation = await db.quotation.findUnique({ where: { id } })
    if (!quotation) return NextResponse.json({ message: 'Not found' }, { status: 404 })

    return NextResponse.json({ quotation })
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

    // Status-only update (Send, Accept, Reject)
    if (body.statusOnly) {
      const quotation = await db.quotation.update({
        where: { id },
        data: { status: body.status },
      })
      return NextResponse.json({ quotation })
    }

    // Full edit update (draft quotations)
    let itemsString: string
    if (typeof body.items === 'string') {
      itemsString = body.items
    } else if (body.lineItems) {
      itemsString = JSON.stringify(body.lineItems)
    } else {
      itemsString = JSON.stringify([])
    }

    const quotation = await db.quotation.update({
      where: { id },
      data: {
        clientName: body.clientName,
        clientEmail: body.clientEmail || null,
        clientPhone: body.clientPhone || null,
        items: itemsString,
        subtotal: parseFloat(body.subtotal) || 0,
        taxAmount: parseFloat(body.taxAmount) || 0,
        totalAmount: parseFloat(body.totalAmount) || 0,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        notes: body.notes || null,
      },
    })

    return NextResponse.json({ quotation })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // POST to /api/quotations/[id] = Create a revision of this quotation
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    // Get original quotation
    const original = await db.quotation.findUnique({ where: { id } })
    if (!original) return NextResponse.json({ message: 'Original quotation not found' }, { status: 404 })

    // Find existing revisions to determine next revision number
    // Revisions share the same base quotation number prefix
    const baseNo = original.quotationNo.replace(/-Rev\d+$/, '')
    const existingRevisions = await db.quotation.findMany({
      where: { quotationNo: { startsWith: baseNo } },
      orderBy: { createdAt: 'asc' },
    })
    const nextRevNo = existingRevisions.length + 1  // Rev 2, Rev 3...
    const newQuotationNo = `${baseNo}-Rev${nextRevNo}`

    // Mark original as superseded
    await db.quotation.update({
      where: { id },
      data: { status: 'expired' },
    })

    // Create new revision
    let itemsString: string
    if (typeof body.items === 'string') {
      itemsString = body.items
    } else {
      itemsString = original.items
    }

    const revision = await db.quotation.create({
      data: {
        quotationNo: newQuotationNo,
        clientName: body.clientName || original.clientName,
        clientEmail: body.clientEmail || original.clientEmail,
        clientPhone: body.clientPhone || original.clientPhone,
        items: itemsString,
        subtotal: parseFloat(body.subtotal) || original.subtotal,
        taxAmount: parseFloat(body.taxAmount) || original.taxAmount,
        totalAmount: parseFloat(body.totalAmount) || original.totalAmount,
        status: 'draft',
        validUntil: body.validUntil ? new Date(body.validUntil) : original.validUntil,
        notes: body.notes || original.notes,
      },
    })

    return NextResponse.json({ quotation: revision, message: `Revision ${newQuotationNo} created` }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}