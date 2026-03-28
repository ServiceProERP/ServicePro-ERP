import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateCode } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const workOrders = await db.workOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          include: {
            client: { select: { companyName: true } },
          },
        },
      },
    })

    return NextResponse.json({ workOrders })
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

    const workOrder = await db.workOrder.create({
      data: {
        woNo: generateCode('WO'),
        jobId: body.jobId,
        description: body.description,
        status: 'pending',
      },
    })

    return NextResponse.json({ workOrder }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
