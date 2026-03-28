import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const transactions = await db.stockTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      include: { item: { select: { itemName: true, itemCode: true, unit: true } } },
      take: 100,
    })

    return NextResponse.json({ transactions })
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
    const qty = parseFloat(body.quantity)

    const item = await db.inventoryItem.findUnique({ where: { id: body.itemId } })
    if (!item) return NextResponse.json({ message: 'Item not found' }, { status: 404 })

    if (body.type === 'out' && item.currentStock < qty) {
      return NextResponse.json({ message: `Insufficient stock. Available: ${item.currentStock} ${item.unit}` }, { status: 400 })
    }

    const [transaction] = await db.$transaction([
      db.stockTransaction.create({
        data: {
          itemId: body.itemId,
          type: body.type,
          quantity: qty,
          reference: body.reference || null,
          notes: body.notes || null,
        },
      }),
      db.inventoryItem.update({
        where: { id: body.itemId },
        data: {
          currentStock: body.type === 'in'
            ? item.currentStock + qty
            : item.currentStock - qty,
        },
      }),
    ])

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
