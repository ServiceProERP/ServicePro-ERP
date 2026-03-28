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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { vendorCode: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) where.status = status

    const [vendors, total] = await Promise.all([
      db.vendor.findMany({
        where,
        orderBy: { companyName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.vendor.count({ where }),
    ])

    return NextResponse.json({ vendors, total })
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

    const vendor = await db.vendor.create({
      data: {
        vendorCode: generateCode('VND'),
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
        category: body.category || null,
        paymentTerms: body.paymentTerms || 'immediate',
        leadTimeDays: body.leadTimeDays ? parseInt(body.leadTimeDays) : null,
        rating: body.rating ? parseInt(body.rating) : null,
        status: body.status || 'active',
        notes: body.notes || null,
      },
    })

    return NextResponse.json({ vendor }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}