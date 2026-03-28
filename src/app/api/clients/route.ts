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
    const all = searchParams.get('all') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { clientCode: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (status) where.status = status

    const [clients, total] = await Promise.all([
      db.client.findMany({
        where,
        orderBy: { companyName: 'asc' },
        take: all ? undefined : limit,
        skip: all ? undefined : (page - 1) * limit,
        include: {
          _count: { select: { jobs: true, invoices: true, refunds: true } },
          invoices: { select: { status: true, totalAmount: true } },
          jobs: { select: { status: true, createdAt: true } },
          refunds: { select: { amount: true, refundType: true } },
        },
      }),
      db.client.count({ where }),
    ])

    return NextResponse.json({ clients, total })
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

    if (!body.companyName || !body.contactPerson || !body.phone) {
      return NextResponse.json(
        { message: 'Company name, contact person and phone are required' },
        { status: 400 }
      )
    }

    const client = await db.client.create({
      data: {
        clientCode: generateCode('CLT'),
        companyName: body.companyName,
        contactPerson: body.contactPerson,
        phone: body.phone,
        email: body.email || null,
        address: body.address || null,
        city: body.city || null,
        postalCode: body.postalCode || null,
        state: body.state || null,
        country: body.country || 'India',
        gstin: body.gstin || null,
        creditLimit: body.creditLimit ? parseFloat(body.creditLimit) : 0,
        clientType: body.clientType || 'walk-in',
        status: body.status || 'active',
        preferredContact: body.preferredContact || 'phone',
        industry: body.industry || null,
        notes: body.notes || null,
      },
    })

    return NextResponse.json({ client }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}