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

    const employee = await db.employee.findUnique({
      where: { id },
    })

    if (!employee) {
      return NextResponse.json({ message: 'Employee not found' }, { status: 404 })
    }

    // Get jobs assigned to this employee as technician
    const technician = await db.technician.findFirst({
      where: { empCode: employee.empCode },
    })

    let jobs: {
      id: string
      jobNo: string
      jobTitle: string
      status: string
      priority: string
      jobDate: Date
      deadline: Date | null
      client: { companyName: string }
    }[] = []

    let performance = {
      totalJobs: 0,
      completedJobs: 0,
      inProgressJobs: 0,
      openJobs: 0,
      completionRate: 0,
      overdueJobs: 0,
    }

    if (technician) {
      jobs = await db.job.findMany({
        where: { technicianId: technician.id },
        include: {
          client: { select: { companyName: true } },
        },
        orderBy: { jobDate: 'desc' },
        take: 20,
      })

      const now = new Date()
      const totalJobs = jobs.length
      const completedJobs = jobs.filter(j => j.status === 'completed').length
      const inProgressJobs = jobs.filter(j => j.status === 'in_progress').length
      const openJobs = jobs.filter(j => j.status === 'open').length
      const overdueJobs = jobs.filter(j =>
        j.deadline && new Date(j.deadline) < now && j.status !== 'completed'
      ).length

      performance = {
        totalJobs,
        completedJobs,
        inProgressJobs,
        openJobs,
        completionRate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0,
        overdueJobs,
      }
    }

    // Get HR docs for this employee
    const hrDocs = await db.hrDoc.findMany({
      where: { employeeId: id },
      orderBy: { uploadedAt: 'desc' },
    })

    // Get payslips
    const payslips = await db.payslip.findMany({
      where: { employeeId: id },
      orderBy: { createdAt: 'desc' },
      take: 6,
    })

    return NextResponse.json({
      employee,
      technician,
      jobs,
      performance,
      hrDocs,
      payslips,
    })
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

    const existing = await db.employee.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ message: 'Employee not found' }, { status: 404 })
    }

    const employee = await db.employee.update({
      where: { id },
      data: {
        name: body.name || existing.name,
        designation: body.designation ?? existing.designation,
        department: body.department ?? existing.department,
        branch: body.branch ?? existing.branch,
        phone: body.phone || existing.phone,
        email: body.email ?? existing.email,
        address: body.address ?? existing.address,
        city: body.city ?? existing.city,
        state: body.state ?? existing.state,
        country: body.country ?? existing.country,
        emergencyContact: body.emergencyContact ?? existing.emergencyContact,
        emergencyPhone: body.emergencyPhone ?? existing.emergencyPhone,
        joinDate: body.joinDate ? new Date(body.joinDate) : existing.joinDate,
        salary: body.salary !== undefined ? parseFloat(body.salary) || 0 : existing.salary,
        skill: body.skill ?? existing.skill,
        idProofType: body.idProofType ?? existing.idProofType,
        idProofNumber: body.idProofNumber ?? existing.idProofNumber,
        idProofUrl: body.idProofUrl ?? existing.idProofUrl,
        profilePhotoUrl: body.profilePhotoUrl ?? existing.profilePhotoUrl,
        status: body.status ?? existing.status,
        isActive: body.status ? body.status === 'active' : existing.isActive,
      },
    })

    // Update technician record if skill changed
    if (body.skill !== undefined || body.name !== undefined) {
      const technician = await db.technician.findFirst({
        where: { empCode: existing.empCode },
      })
      if (technician) {
        await db.technician.update({
          where: { id: technician.id },
          data: {
            name: body.name || existing.name,
            phone: body.phone || existing.phone,
            email: body.email ?? existing.email,
            skill: body.skill ?? existing.skill,
          },
        })
      }
    }

    return NextResponse.json({ employee })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}