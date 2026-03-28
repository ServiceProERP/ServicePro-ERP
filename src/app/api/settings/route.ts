import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    // Get existing config or create default one
    let config = await db.systemConfig.findFirst()

    if (!config) {
      config = await db.systemConfig.create({
        data: {
          companyName: '',
          companyTagline: 'Professional Service Management',
          companyAddress: '',
          companyPhone: '',
          companyEmail: '',
          companyGstin: '',
          jobPrefix: 'JOB',
          clientPrefix: 'CLT',
          vendorPrefix: 'VND',
          invoicePrefix: 'INV',
          quotationPrefix: 'QT',
          defaultTaxRate: '18',
          defaultPaymentTerms: '30',
          currency: 'INR',
          financialYearStart: 'April',
          enableEmailNotifications: false,
          enableSMSNotifications: false,
          enableOverdueAlerts: true,
          enableLowStockAlerts: true,
          overdueAlertDays: '1',
          lowStockAlertLevel: '10',
        },
      })
    }

    return NextResponse.json({ config })
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

    // Check if config exists
    const existing = await db.systemConfig.findFirst()

    let config

    if (existing) {
      // Update existing
      config = await db.systemConfig.update({
        where: { id: existing.id },
        data: {
          companyName: body.companyName ?? existing.companyName,
          companyTagline: body.companyTagline ?? existing.companyTagline,
          companyAddress: body.companyAddress ?? existing.companyAddress,
          companyPhone: body.companyPhone ?? existing.companyPhone,
          companyEmail: body.companyEmail ?? existing.companyEmail,
          companyGstin: body.companyGstin ?? existing.companyGstin,
          jobPrefix: body.jobPrefix ?? existing.jobPrefix,
          clientPrefix: body.clientPrefix ?? existing.clientPrefix,
          vendorPrefix: body.vendorPrefix ?? existing.vendorPrefix,
          invoicePrefix: body.invoicePrefix ?? existing.invoicePrefix,
          quotationPrefix: body.quotationPrefix ?? existing.quotationPrefix,
          defaultTaxRate: body.defaultTaxRate ?? existing.defaultTaxRate,
          defaultPaymentTerms: body.defaultPaymentTerms ?? existing.defaultPaymentTerms,
          currency: body.currency ?? existing.currency,
          financialYearStart: body.financialYearStart ?? existing.financialYearStart,
          enableEmailNotifications: body.enableEmailNotifications ?? existing.enableEmailNotifications,
          enableSMSNotifications: body.enableSMSNotifications ?? existing.enableSMSNotifications,
          enableOverdueAlerts: body.enableOverdueAlerts ?? existing.enableOverdueAlerts,
          enableLowStockAlerts: body.enableLowStockAlerts ?? existing.enableLowStockAlerts,
          overdueAlertDays: body.overdueAlertDays ?? existing.overdueAlertDays,
          lowStockAlertLevel: body.lowStockAlertLevel ?? existing.lowStockAlertLevel,
        },
      })
    } else {
      // Create new
      config = await db.systemConfig.create({
        data: {
          companyName: body.companyName || '',
          companyTagline: body.companyTagline || 'Professional Service Management',
          companyAddress: body.companyAddress || '',
          companyPhone: body.companyPhone || '',
          companyEmail: body.companyEmail || '',
          companyGstin: body.companyGstin || '',
          jobPrefix: body.jobPrefix || 'JOB',
          clientPrefix: body.clientPrefix || 'CLT',
          vendorPrefix: body.vendorPrefix || 'VND',
          invoicePrefix: body.invoicePrefix || 'INV',
          quotationPrefix: body.quotationPrefix || 'QT',
          defaultTaxRate: body.defaultTaxRate || '18',
          defaultPaymentTerms: body.defaultPaymentTerms || '30',
          currency: body.currency || 'INR',
          financialYearStart: body.financialYearStart || 'April',
          enableEmailNotifications: body.enableEmailNotifications || false,
          enableSMSNotifications: body.enableSMSNotifications || false,
          enableOverdueAlerts: body.enableOverdueAlerts ?? true,
          enableLowStockAlerts: body.enableLowStockAlerts ?? true,
          overdueAlertDays: body.overdueAlertDays || '1',
          lowStockAlertLevel: body.lowStockAlertLevel || '10',
        },
      })
    }

    return NextResponse.json({ config })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}