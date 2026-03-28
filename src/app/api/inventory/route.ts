import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateCode } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const lowStock = searchParams.get('lowStock') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const where: Record<string, unknown> = { isActive: true }
    if (search) {
      where.OR = [
        { itemName: { contains: search, mode: 'insensitive' } },
        { itemCode: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (category) where.category = category

    const allItems = await db.inventoryItem.findMany({
      where,
      include: { _count: { select: { transactions: true } } },
      orderBy: { itemName: 'asc' },
    })

    const filtered = lowStock
      ? allItems.filter(i => i.currentStock <= i.minStock)
      : allItems

    const total = filtered.length
    const items = filtered.slice((page - 1) * limit, page * limit)

    return NextResponse.json({ items, total })
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

    const item = await db.inventoryItem.create({
      data: {
        itemCode: generateCode('ITM'),
        itemName: body.itemName,
        category: body.category || null,
        unit: body.unit || 'pcs',
        currentStock: parseFloat(body.currentStock) || 0,
        minStock: parseFloat(body.minStock) || 0,
        unitPrice: parseFloat(body.unitPrice) || 0,
      },
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}