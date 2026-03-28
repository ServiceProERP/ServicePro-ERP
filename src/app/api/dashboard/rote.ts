import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    // Find technician record linked to this user
    const technician = await db.technician.findFirst({
      where: {
        OR: [
          { email: session.email },
          { name: session.name },
        ]
      }
    })

    if (!technician) {
      return NextResponse.json({ stats: { total: 0, open: 0, inProgress: 0, completed: 0, overdue: 0 }, todayJobs: [], upcomingJobs: [], recentRequests: [] })
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const [allJobs, recentRequests] = await Promise.all([
      db.job.findMany({
        where: { technicianId: technician.id },
        include: { client: { select: { companyName: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      db.technicianRequest.findMany({
        where: { technicianId: technician.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    const open = allJobs.filter(j => j.status === 'open').length
    const inProgress = allJobs.filter(j => j.status === 'in_progress').length
    const completed = allJobs.filter(j => j.status === 'completed').length
    const overdue = allJobs.filter(j => j.deadline && new Date(j.deadline) < now && j.status !== 'completed').length

    // Today's active jobs
    const todayJobs = allJobs.filter(j =>
      j.status !== 'completed' && j.status !== 'cancelled'
    ).slice(0, 6)

    // Upcoming jobs in next 7 days
    const upcomingJobs = allJobs
      .filter(j => j.deadline && new Date(j.deadline) >= now && new Date(j.deadline) <= next7Days && j.status !== 'completed')
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, 5)

    return NextResponse.json({
      technician,
      stats: { total: allJobs.length, open, inProgress, completed, overdue },
      todayJobs,
      upcomingJobs,
      recentRequests,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}