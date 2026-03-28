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

    const client = await db.client.findUnique({
      where: { id },
      include: {
        jobs: {
          orderBy: { createdAt: 'desc' },
          include: {
            technician: { select: { name: true } },
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          include: { payments: true },
        },
        refunds: {
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { jobs: true, invoices: true, refunds: true } },
      },
    })

    if (!client) return NextResponse.json({ message: 'Client not found' }, { status: 404 })

    return NextResponse.json({ client })
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

    const client = await db.client.update({
      where: { id },
      data: {
        ...(body.companyName && { companyName: body.companyName }),
        ...(body.contactPerson && { contactPerson: body.contactPerson }),
        ...(body.phone && { phone: body.phone }),
        ...(body.email !== undefined && { email: body.email || null }),
        ...(body.address !== undefined && { address: body.address || null }),
        ...(body.city !== undefined && { city: body.city || null }),
        ...(body.postalCode !== undefined && { postalCode: body.postalCode || null }),
        ...(body.state !== undefined && { state: body.state || null }),
        ...(body.country !== undefined && { country: body.country || 'India' }),
        ...(body.gstin !== undefined && { gstin: body.gstin || null }),
        ...(body.creditLimit !== undefined && { creditLimit: body.creditLimit ? parseFloat(body.creditLimit) : 0 }),
        ...(body.clientType !== undefined && { clientType: body.clientType }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.preferredContact !== undefined && { preferredContact: body.preferredContact }),
        ...(body.industry !== undefined && { industry: body.industry || null }),
        ...(body.notes !== undefined && { notes: body.notes || null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    })

    return NextResponse.json({ client })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await db.client.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}