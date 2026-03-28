import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    const log = await db.siteVisitLog.create({
      data: {
        jobId: id,
        technicianId: session.id,
        visitDate: body.visitDate ? new Date(body.visitDate) : new Date(),
        arrivalTime: body.arrivalTime || null,
        departureTime: body.departureTime || null,
        onSiteContact: body.onSiteContact || null,
        onSiteContactSign: body.onSiteContactSign || null,
        machineConditionBefore: body.machineConditionBefore || null,
        observedProblem: body.observedProblem || null,
        rootCause: body.rootCause || null,
        actionTaken: body.actionTaken || null,
        machineConditionAfter: body.machineConditionAfter || null,
        inspectionDone: body.inspectionDone || false,
        cleaningDone: body.cleaningDone || false,
        calibrationDone: body.calibrationDone || null,
        lubricationDone: body.lubricationDone || null,
        partsReplaced: body.partsReplaced || false,
        testRunDone: body.testRunDone || false,
        machineHandedOver: body.machineHandedOver || false,
        nextServiceDate: body.nextServiceDate ? new Date(body.nextServiceDate) : null,
        additionalRecommendations: body.additionalRecommendations || null,
        partsToOrder: body.partsToOrder || null,
        clientRepresentative: body.clientRepresentative || null,
        clientSatisfaction: body.clientSatisfaction || null,
        clientComments: body.clientComments || null,
      }
    })

    return NextResponse.json({ log }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const logs = await db.siteVisitLog.findMany({
      where: { jobId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ logs })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}