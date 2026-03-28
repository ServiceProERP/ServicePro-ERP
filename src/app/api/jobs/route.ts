import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateCode } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const priority = searchParams.get('priority') || ''
    const type = searchParams.get('type') || ''

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { jobNo: { contains: search, mode: 'insensitive' } },
        { jobTitle: { contains: search, mode: 'insensitive' } },
        { client: { companyName: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (status) where.status = status
    if (priority) where.priority = priority
    if (type) where.jobType = type

    const [jobs, total] = await Promise.all([
      db.job.findMany({
        where,
        include: {
          client: { select: { companyName: true } },
          technician: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.job.count({ where }),
    ])

    return NextResponse.json({ jobs, total })
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

    const job = await db.job.create({
      data: {
        jobNo: generateCode('JOB'),
        jobTitle: body.jobTitle,
        jobType: body.jobType || 'onsite',
        priority: body.priority || 'medium',
        status: 'open',
        clientId: body.clientId,
        technicianId: body.technicianId || null,
        siteAddress: body.siteAddress || null,
        billingContact: body.billingContact || null,
        billingPhone: body.billingPhone || null,  
        contactPerson: body.contactPerson || null,
        contactPhone: body.contactPhone || null,
        machineName: body.machineName || null,
        machineSerial: body.machineSerial || null,
        faultDescription: body.faultDescription || null,
        deadline: body.deadline ? new Date(body.deadline) : null,
        estimatedAmount: body.estimatedAmount ? parseFloat(body.estimatedAmount) : null,
        remarks: body.remarks || null,
      },
    })

    return NextResponse.json({ job }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
