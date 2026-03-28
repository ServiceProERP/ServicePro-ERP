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
    const vendor = await db.vendor.findUnique({ where: { id } })
    if (!vendor) return NextResponse.json({ message: 'Vendor not found' }, { status: 404 })
    return NextResponse.json({ vendor })
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
    const vendor = await db.vendor.update({
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
        ...(body.category !== undefined && { category: body.category || null }),
        ...(body.paymentTerms !== undefined && { paymentTerms: body.paymentTerms }),
        ...(body.leadTimeDays !== undefined && { leadTimeDays: body.leadTimeDays ? parseInt(body.leadTimeDays) : null }),
        ...(body.rating !== undefined && { rating: body.rating ? parseInt(body.rating) : null }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes || null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    })
    return NextResponse.json({ vendor })
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
    await db.vendor.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}