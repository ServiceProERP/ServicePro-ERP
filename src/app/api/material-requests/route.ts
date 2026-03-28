import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateCode } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const requests = await db.materialRequest.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ requests })
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
    const job = await db.job.findUnique({ where: { id: body.jobId } })
    if (!job) return NextResponse.json({ message: 'Job not found' }, { status: 404 })

    const request = await db.materialRequest.create({
      data: {
        reqNo: generateCode('MR'),
        jobId: body.jobId,
        jobNo: job.jobNo,
        itemName: body.itemName,
        quantity: parseFloat(body.quantity),
        unit: body.unit || 'pcs',
        requiredBy: body.requiredBy ? new Date(body.requiredBy) : null,
        status: 'pending',
        requestedBy: body.requestedBy || null,
      },
    })

    return NextResponse.json({ request }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}