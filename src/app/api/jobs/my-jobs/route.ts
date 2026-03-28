import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || ''
    const period = searchParams.get('period') || ''

    const technician = await db.technician.findFirst({
      where: { OR: [{ email: session.email }, { name: session.name }] }
    })

    if (!technician) return NextResponse.json({ jobs: [] })

    const now = new Date()
    const dateFilter: Record<string, unknown> = {}
    if (period === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
      dateFilter.createdAt = { gte: todayStart, lt: todayEnd }
    } else if (period === 'week') {
      dateFilter.createdAt = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
    } else if (period === 'month') {
      dateFilter.createdAt = { gte: new Date(now.getFullYear(), now.getMonth(), 1) }
    }

    const jobs = await db.job.findMany({
      where: {
        technicianId: technician.id,
        ...(status ? { status } : {}),
        ...dateFilter,
      },
      include: {
        client: { select: { companyName: true, phone: true, address: true } },
        spareParts: true,
      },
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
    })

    return NextResponse.json({ jobs, technicianId: technician.id })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}