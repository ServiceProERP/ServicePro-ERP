import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateCode } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const department = searchParams.get('department') || ''
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const all = searchParams.get('all') === 'true'

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { empCode: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
        { branch: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (department) where.department = department
    if (status) where.status = status

    const [employees, total] = await Promise.all([
      db.employee.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: all ? 0 : (page - 1) * limit,
        take: all ? undefined : limit,
      }),
      db.employee.count({ where }),
    ])

    return NextResponse.json({ employees, total })
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

    if (!body.name || !body.phone) {
      return NextResponse.json({ message: 'Name and phone are required' }, { status: 400 })
    }

    const employee = await db.employee.create({
      data: {
        empCode: generateCode('EMP'),
        name: body.name,
        designation: body.designation || null,
        department: body.department || null,
        branch: body.branch || null,
        phone: body.phone,
        email: body.email || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        country: body.country || 'India',
        emergencyContact: body.emergencyContact || null,
        emergencyPhone: body.emergencyPhone || null,
        joinDate: body.joinDate ? new Date(body.joinDate) : null,
        salary: body.salary ? parseFloat(body.salary) : 0,
        skill: body.skill || null,
        idProofType: body.idProofType || null,
        idProofNumber: body.idProofNumber || null,
        idProofUrl: body.idProofUrl || null,
        profilePhotoUrl: body.profilePhotoUrl || null,
        status: 'active',
        isActive: true,
      },
    })

    // Also create technician record if skill provided
    if (body.skill || body.designation) {
      try {
        await db.technician.create({
          data: {
            empCode: employee.empCode,
            name: employee.name,
            phone: employee.phone,
            email: employee.email,
            skill: body.skill || body.designation || null,
            isActive: true,
          },
        })
      } catch {
        // Technician may already exist — ignore
      }
    }

    return NextResponse.json({ employee }, { status: 201 })
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
    const { id, status } = body

    if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 })

    const updateData: Record<string, unknown> = {}

    // Status update — active, blocked, blacklisted
    if (status !== undefined) {
      updateData.status = status
      updateData.isActive = status === 'active'
    }

    // Full update
    if (body.name) updateData.name = body.name
    if (body.designation !== undefined) updateData.designation = body.designation
    if (body.department !== undefined) updateData.department = body.department
    if (body.branch !== undefined) updateData.branch = body.branch
    if (body.phone) updateData.phone = body.phone
    if (body.email !== undefined) updateData.email = body.email
    if (body.address !== undefined) updateData.address = body.address
    if (body.city !== undefined) updateData.city = body.city
    if (body.state !== undefined) updateData.state = body.state
    if (body.country !== undefined) updateData.country = body.country
    if (body.salary !== undefined) updateData.salary = parseFloat(body.salary) || 0
    if (body.joinDate !== undefined) updateData.joinDate = body.joinDate ? new Date(body.joinDate) : null
    if (body.skill !== undefined) updateData.skill = body.skill
    if (body.idProofType !== undefined) updateData.idProofType = body.idProofType
    if (body.idProofNumber !== undefined) updateData.idProofNumber = body.idProofNumber
    if (body.idProofUrl !== undefined) updateData.idProofUrl = body.idProofUrl
    if (body.profilePhotoUrl !== undefined) updateData.profilePhotoUrl = body.profilePhotoUrl
    if (body.emergencyContact !== undefined) updateData.emergencyContact = body.emergencyContact
    if (body.emergencyPhone !== undefined) updateData.emergencyPhone = body.emergencyPhone

    const employee = await db.employee.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ employee })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}