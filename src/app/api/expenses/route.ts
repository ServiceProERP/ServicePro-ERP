import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = {}

    if (category) where.category = category

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { paidBy: { contains: search, mode: 'insensitive' } },
        { responsiblePerson: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (dateFrom || dateTo) {
      where.expenseDate = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo + 'T23:59:59') }),
      }
    }

    const expenses = await db.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
    })

    return NextResponse.json({ expenses })
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

    if (!body.description || !body.amount) {
      return NextResponse.json({ message: 'Description and amount are required' }, { status: 400 })
    }

    const expense = await db.expense.create({
      data: {
        expenseDate: new Date(body.expenseDate),
        category: body.category,
        description: body.description,
        amount: parseFloat(body.amount),
        paidBy: body.paidBy || null,
        responsiblePerson: body.responsiblePerson || null,
        ownedBy: body.ownedBy || null,
        fileUrl: body.fileUrl || null,
        reference: body.reference || null,
      },
    })

    return NextResponse.json({ expense }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}