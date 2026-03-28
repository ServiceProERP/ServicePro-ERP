import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')

    const spareParts = await db.sparePart.findMany({
      where: jobId ? { jobId } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          select: { jobNo: true }
        }
      }
    })

    return NextResponse.json({ spareParts })
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

    const sparePart = await db.sparePart.create({
      data: {
        jobId: body.jobId,
        partName: body.partName,
        partCode: body.partCode || null,
        quantity: parseFloat(body.quantity),
        unitPrice: parseFloat(body.unitPrice),
        totalPrice: parseFloat(body.quantity) * parseFloat(body.unitPrice),
      },
    })

    return NextResponse.json({ sparePart }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}