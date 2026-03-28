import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateCode } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const orders = await db.purchaseOrder.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ orders })
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
    const vendor = await db.vendor.findUnique({ where: { id: body.vendorId } })
    if (!vendor) return NextResponse.json({ message: 'Vendor not found' }, { status: 404 })

    const order = await db.purchaseOrder.create({
      data: {
        poNo: generateCode('PO'),
        vendorId: body.vendorId,
        vendorName: vendor.companyName,
        items: body.items,
        totalAmount: parseFloat(body.totalAmount),
        status: 'draft',
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
        notes: body.notes || null,
      },
    })

    return NextResponse.json({ order }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}