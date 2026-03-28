import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employeeId') || ''
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = {}
    if (employeeId) where.employeeId = employeeId
    if (status) where.status = status

    const docs = await db.hrDoc.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
    })

    // Check for expiring docs — within 30 days
    const now = new Date()
    const in30Days = new Date()
    in30Days.setDate(in30Days.getDate() + 30)

    const expiringDocs = docs.filter(d =>
      d.expiryDate &&
      new Date(d.expiryDate) > now &&
      new Date(d.expiryDate) <= in30Days
    )

    const expiredDocs = docs.filter(d =>
      d.expiryDate && new Date(d.expiryDate) < now
    )

    return NextResponse.json({
      docs,
      expiringCount: expiringDocs.length,
      expiredCount: expiredDocs.length,
    })
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

    if (!body.employeeId || !body.docName) {
      return NextResponse.json(
        { message: 'Employee and document name are required' },
        { status: 400 }
      )
    }

    const employee = await db.employee.findUnique({
      where: { id: body.employeeId },
    })

    if (!employee) {
      return NextResponse.json({ message: 'Employee not found' }, { status: 404 })
    }

    const doc = await db.hrDoc.create({
      data: {
        employeeId: body.employeeId,
        employeeName: employee.name,
        docType: body.docType,
        docName: body.docName,
        fileUrl: body.fileUrl || null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        status: 'pending',
        notes: body.notes || null,
      },
    })

    return NextResponse.json({ doc }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    if (!body.id) {
      return NextResponse.json({ message: 'Document ID required' }, { status: 400 })
    }

    const doc = await db.hrDoc.update({
      where: { id: body.id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.approvedBy !== undefined && { approvedBy: body.approvedBy }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.fileUrl !== undefined && { fileUrl: body.fileUrl }),
        ...(body.expiryDate !== undefined && {
          expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        }),
      },
    })

    return NextResponse.json({ doc })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}