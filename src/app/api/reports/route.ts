import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const report = searchParams.get('report') || ''
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const dateFilter = from || to ? {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(to + 'T23:59:59') : undefined,
    } : undefined

    let data: Record<string, unknown>[] = []
    let summary: Record<string, unknown> = {}

    switch (report) {

      // ── TECHNICIAN PERFORMANCE with scoring ──────────────────────────────
      case 'technician-performance': {
        const technicians = await db.technician.findMany({
          include: {
            jobs: {
              where: dateFilter ? { createdAt: dateFilter } : {},
              include: { spareParts: true },
            },
          },
        })

        data = technicians.map(t => {
          const jobs = t.jobs
          const open = jobs.filter(j => j.status === 'open').length
          const inProgress = jobs.filter(j => j.status === 'in_progress').length
          const completed = jobs.filter(j => j.status === 'completed').length
          const total = jobs.length

          // Scoring: 1pt attempt, 2pt in-progress, 3pt completed
          const points = open * 1 + inProgress * 2 + completed * 3

          // Average repair duration (for completed jobs with completedAt)
          const completedWithDuration = jobs.filter(j => j.status === 'completed' && j.completedAt && j.jobDate)
          const avgDurationDays = completedWithDuration.length > 0
            ? Math.round(completedWithDuration.reduce((s, j) => {
                const days = (new Date(j.completedAt!).getTime() - new Date(j.jobDate).getTime()) / 86400000
                return s + days
              }, 0) / completedWithDuration.length * 10) / 10
            : 0

          // Overdue jobs = jobs past deadline not completed
          const now = new Date()
          const overdue = jobs.filter(j => j.deadline && new Date(j.deadline) < now && j.status !== 'completed').length

          // Parts handled = total spare parts used
          const partsHandled = jobs.reduce((s, j) => s + j.spareParts.length, 0)

          const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

          // Performance grade based on points and completion rate
          const grade = points >= 30 && completionRate >= 80 ? 'A' :
            points >= 20 && completionRate >= 60 ? 'B' :
            points >= 10 ? 'C' : 'D'

          return {
            technician_id: t.empCode,
            name: t.name,
            skill: t.skill || '—',
            total_jobs: total,
            open_jobs: open,
            in_progress: inProgress,
            completed: completed,
            overdue: overdue,
            completion_rate: `${completionRate}%`,
            avg_repair_days: avgDurationDays || '—',
            parts_handled: partsHandled,
            points: points,
            grade: grade,
          }
        }).sort((a, b) => (b.points as number) - (a.points as number))

        summary = {
          total_technicians: technicians.length,
          avg_completion_rate: data.length > 0
            ? Math.round(data.reduce((s, d) => s + parseInt(String(d.completion_rate).replace('%', '')), 0) / data.length) + '%'
            : '0%',
          top_performer: data[0]?.name || '—',
          total_points_awarded: data.reduce((s, d) => s + (d.points as number), 0),
        }
        break
      }

      // ── OVERDUE JOBS ──────────────────────────────────────────────────────
      case 'jobs-overdue': {
        const jobs = await db.job.findMany({
          where: { deadline: { lt: new Date() }, status: { not: 'completed' } },
          include: {
            client: { select: { companyName: true, phone: true } },
            technician: { select: { name: true } },
          },
          orderBy: { deadline: 'asc' },
        })

        data = jobs.map(j => {
          const daysOverdue = j.deadline
            ? Math.floor((Date.now() - j.deadline.getTime()) / 86400000)
            : 0
          return {
            job_no: j.jobNo,
            title: j.jobTitle,
            client: j.client.companyName,
            client_phone: j.client.phone,
            technician: j.technician?.name || 'Unassigned',
            priority: j.priority.toUpperCase(),
            status: j.status,
            deadline: j.deadline?.toISOString().slice(0, 10) || '—',
            days_overdue: daysOverdue,
            severity: daysOverdue > 14 ? 'CRITICAL' : daysOverdue > 7 ? 'HIGH' : 'MEDIUM',
            estimated_amount: j.estimatedAmount || 0,
          }
        })

        summary = {
          total_overdue: jobs.length,
          critical: data.filter(d => d.severity === 'CRITICAL').length,
          high: data.filter(d => d.severity === 'HIGH').length,
          medium: data.filter(d => d.severity === 'MEDIUM').length,
          total_at_risk: data.reduce((s, d) => s + (d.estimated_amount as number), 0),
        }
        break
      }

      // ── WORK ORDERS SUMMARY ───────────────────────────────────────────────
      case 'work-orders-summary': {
        const workOrders = await db.workOrder.findMany({
          where: dateFilter ? { createdAt: dateFilter } : {},
          include: {
            job: {
              include: {
                client: { select: { companyName: true } },
                technician: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })

        data = workOrders.map(wo => ({
          wo_no: wo.woNo,
          job_no: wo.job.jobNo,
          client: wo.job.client.companyName,
          technician: wo.job.technician?.name || 'Unassigned',
          description: wo.description,
          status: wo.status.toUpperCase(),
          created: wo.createdAt.toISOString().slice(0, 10),
        }))

        const byStatus = workOrders.reduce((acc, wo) => {
          acc[wo.status] = (acc[wo.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        summary = {
          total: workOrders.length,
          ...byStatus,
          completion_rate: workOrders.length > 0
            ? Math.round((workOrders.filter(w => w.status === 'completed').length / workOrders.length) * 100) + '%'
            : '0%',
        }
        break
      }

      // ── PAYMENT HISTORY ───────────────────────────────────────────────────
      case 'payment-history': {
        const payments = await db.payment.findMany({
          where: dateFilter ? { paymentDate: dateFilter } : {},
          include: {
            invoice: {
              include: { client: { select: { companyName: true } } },
            },
          },
          orderBy: { paymentDate: 'desc' },
        })

        data = payments.map(p => ({
          date: p.paymentDate.toISOString().slice(0, 10),
          invoice_no: p.invoice.invoiceNo,
          client: p.invoice.client.companyName,
          payment_type: p.paymentType,
          mode: p.paymentMode,
          amount: p.amount,
          reference: p.reference || '—',
          notes: p.notes || '—',
        }))

        const byMode = payments.reduce((acc, p) => {
          acc[p.paymentMode] = (acc[p.paymentMode] || 0) + p.amount
          return acc
        }, {} as Record<string, number>)

        summary = {
          total_received: payments.reduce((s, p) => s + p.amount, 0),
          total_transactions: payments.length,
          by_mode: byMode,
          avg_payment: payments.length > 0
            ? Math.round(payments.reduce((s, p) => s + p.amount, 0) / payments.length)
            : 0,
        }
        break
      }

      // ── EXPENSE REPORT ────────────────────────────────────────────────────
      case 'expense-report': {
        const expenses = await db.expense.findMany({
          where: dateFilter ? { expenseDate: dateFilter } : {},
          orderBy: { expenseDate: 'desc' },
        })

        data = expenses.map(e => ({
          date: e.expenseDate.toISOString().slice(0, 10),
          category: e.category,
          description: e.description,
          amount: e.amount,
          paid_by: e.paidBy || '—',
          owned_by: e.ownedBy || 'Company',
          responsible: e.responsiblePerson || '—',
          reference: e.reference || '—',
        }))

        const byCategory = expenses.reduce((acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + e.amount
          return acc
        }, {} as Record<string, number>)

        const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]

        summary = {
          total_expenses: expenses.reduce((s, e) => s + e.amount, 0),
          total_transactions: expenses.length,
          top_category: topCategory ? `${topCategory[0]} (₹${topCategory[1].toLocaleString('en-IN')})` : '—',
          company_expenses: expenses.filter(e => e.ownedBy === 'Company' || !e.ownedBy).reduce((s, e) => s + e.amount, 0),
          reimbursable: expenses.filter(e => e.ownedBy === 'Personal').reduce((s, e) => s + e.amount, 0),
        }
        break
      }

      // ── REFUNDS REPORT ────────────────────────────────────────────────────
      case 'refunds-report': {
        const refunds = await db.refund.findMany({
          where: dateFilter ? { createdAt: dateFilter } : {},
          include: {
            client: { select: { companyName: true } },
            job: { select: { jobNo: true, jobTitle: true } },
          },
          orderBy: { createdAt: 'desc' },
        })

        data = refunds.map(r => ({
          refund_no: r.refundNo,
          client: r.client.companyName,
          job_no: r.job?.jobNo || '—',
          job_title: r.job?.jobTitle || '—',
          type: r.refundType,
          amount: r.amount,
          reason: r.reason,
          status: r.status.toUpperCase(),
          approved_by: r.approvedBy || '—',
          date: r.refundDate.toISOString().slice(0, 10),
        }))

        summary = {
          total_refunds: refunds.length,
          total_amount: refunds.reduce((s, r) => s + r.amount, 0),
          pending: refunds.filter(r => r.status === 'pending').length,
          approved: refunds.filter(r => r.status === 'approved').length,
          processed: refunds.filter(r => r.status === 'processed').length,
        }
        break
      }

      // ── STOCK SUMMARY ─────────────────────────────────────────────────────
      case 'stock-summary': {
        const items = await db.inventoryItem.findMany({ orderBy: { itemName: 'asc' } })

        data = items.map(i => ({
          code: i.itemCode,
          item: i.itemName,
          category: i.category || '—',
          unit: i.unit,
          current_stock: i.currentStock,
          min_stock: i.minStock,
          unit_price: i.unitPrice,
          stock_value: Math.round(i.currentStock * i.unitPrice),
          status: i.currentStock === 0 ? 'OUT OF STOCK' : i.currentStock <= i.minStock ? 'LOW STOCK' : 'OK',
        }))

        summary = {
          total_items: items.length,
          total_value: Math.round(items.reduce((s, i) => s + i.currentStock * i.unitPrice, 0)),
          low_stock_items: items.filter(i => i.currentStock <= i.minStock && i.currentStock > 0).length,
          out_of_stock: items.filter(i => i.currentStock === 0).length,
          healthy_stock: items.filter(i => i.currentStock > i.minStock).length,
        }
        break
      }

      // ── SPARE PARTS USAGE ─────────────────────────────────────────────────
      case 'spare-parts-usage': {
        const parts = await db.sparePart.findMany({
          where: dateFilter ? { createdAt: dateFilter } : {},
          include: {
            job: {
              include: { client: { select: { companyName: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
        })

        const grouped: Record<string, {
          partName: string; partCode: string; totalQty: number
          totalValue: number; jobCount: Set<string>
        }> = {}

        parts.forEach(p => {
          const key = p.partName
          if (!grouped[key]) grouped[key] = { partName: p.partName, partCode: p.partCode || '—', totalQty: 0, totalValue: 0, jobCount: new Set() }
          grouped[key].totalQty += p.quantity
          grouped[key].totalValue += p.totalPrice
          grouped[key].jobCount.add(p.jobId)
        })

        data = Object.values(grouped)
          .sort((a, b) => b.totalQty - a.totalQty)
          .map(g => ({
            part_name: g.partName,
            part_code: g.partCode,
            total_qty_used: g.totalQty,
            total_value: Math.round(g.totalValue),
            used_in_jobs: g.jobCount.size,
            avg_per_job: Math.round((g.totalQty / g.jobCount.size) * 10) / 10,
          }))

        summary = {
          total_parts_types: data.length,
          total_qty_used: data.reduce((s, d) => s + (d.total_qty_used as number), 0),
          total_value: Math.round(data.reduce((s, d) => s + (d.total_value as number), 0)),
          most_used: data[0]?.part_name || '—',
        }
        break
      }

      // ── STOCK MOVEMENT ────────────────────────────────────────────────────
      case 'stock-movement': {
        const transactions = await db.stockTransaction.findMany({
          where: dateFilter ? { createdAt: dateFilter } : {},
          include: { item: { select: { itemName: true, itemCode: true, unit: true, unitPrice: true } } },
          orderBy: { createdAt: 'desc' },
        })

        data = transactions.map(t => ({
          date: t.createdAt.toISOString().slice(0, 10),
          item_code: t.item.itemCode,
          item: t.item.itemName,
          type: t.type.toUpperCase(),
          quantity: t.quantity,
          unit: t.item.unit,
          unit_price: t.item.unitPrice,
          value: Math.round(t.quantity * t.item.unitPrice),
          reference: t.reference || '—',
          notes: t.notes || '—',
        }))

        summary = {
          total_transactions: transactions.length,
          stock_in: transactions.filter(t => t.type === 'in').reduce((s, t) => s + t.quantity, 0),
          stock_out: transactions.filter(t => t.type === 'out').reduce((s, t) => s + t.quantity, 0),
          total_value_moved: Math.round(transactions.reduce((s, t) => s + t.quantity * t.item.unitPrice, 0)),
        }
        break
      }

      // ── PAYROLL SUMMARY ───────────────────────────────────────────────────
      case 'payroll-summary': {
        const payslips = await db.payslip.findMany({
          where: dateFilter ? { createdAt: dateFilter } : {},
          include: { employee: { select: { name: true, department: true, empCode: true } } },
          orderBy: [{ year: 'desc' }, { month: 'asc' }],
        })

        data = payslips.map(p => ({
          period: `${p.month} ${p.year}`,
          emp_id: p.employee.empCode,
          employee: p.employee.name,
          department: p.employee.department || '—',
          basic: p.basicSalary,
          allowances: p.allowances,
          deductions: p.deductions,
          net_salary: p.netSalary,
          pf_contribution: Math.round(p.basicSalary * 0.12),
          esic: p.netSalary + p.deductions <= 21000 ? Math.round((p.basicSalary + p.allowances) * 0.0075) : 0,
          status: p.status.toUpperCase(),
        }))

        const byDept = payslips.reduce((acc, p) => {
          const dept = p.employee.department || 'Unknown'
          if (!acc[dept]) acc[dept] = { gross: 0, net: 0, count: 0 }
          acc[dept].gross += p.basicSalary + p.allowances
          acc[dept].net += p.netSalary
          acc[dept].count++
          return acc
        }, {} as Record<string, { gross: number; net: number; count: number }>)

        summary = {
          total_employees: new Set(payslips.map(p => p.employeeId)).size,
          total_gross: Math.round(payslips.reduce((s, p) => s + p.basicSalary + p.allowances, 0)),
          total_net: Math.round(payslips.reduce((s, p) => s + p.netSalary, 0)),
          total_deductions: Math.round(payslips.reduce((s, p) => s + p.deductions, 0)),
          total_pf: Math.round(payslips.reduce((s, p) => s + p.basicSalary * 0.12, 0)),
          by_department: byDept,
        }
        break
      }

      // ── OKR REPORT ────────────────────────────────────────────────────────
      case 'okr-report': {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        const [jobs, invoices, payments, expenses, technicians, employees] = await Promise.all([
          db.job.findMany({ where: { createdAt: { gte: startOfMonth } } }),
          db.invoice.findMany({ where: { createdAt: { gte: startOfMonth } }, include: { payments: true } }),
          db.payment.findMany({ where: { paymentDate: { gte: startOfMonth } } }),
          db.expense.findMany({ where: { expenseDate: { gte: startOfMonth } } }),
          db.technician.findMany({ include: { jobs: { where: { createdAt: { gte: startOfMonth } } } } }),
          db.employee.findMany({ where: { isActive: true } }),
        ])

        const totalRevenue = invoices.reduce((s, i) => s + i.totalAmount, 0)
        const totalCollected = payments.reduce((s, p) => s + p.amount, 0)
        const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
        const completedJobs = jobs.filter(j => j.status === 'completed').length
        const overdueJobs = jobs.filter(j => j.deadline && new Date(j.deadline) < now && j.status !== 'completed').length
        const collectionRate = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0
        const jobCompletionRate = jobs.length > 0 ? Math.round((completedJobs / jobs.length) * 100) : 0

        data = [
          { okr: 'Revenue this month', target: '—', actual: `₹${totalRevenue.toLocaleString('en-IN')}`, status: totalRevenue > 0 ? '✅ Active' : '⚠️ No invoices' },
          { okr: 'Collection rate', target: '90%', actual: `${collectionRate}%`, status: collectionRate >= 90 ? '✅ On track' : collectionRate >= 70 ? '⚠️ At risk' : '❌ Behind' },
          { okr: 'Job completion rate', target: '80%', actual: `${jobCompletionRate}%`, status: jobCompletionRate >= 80 ? '✅ On track' : jobCompletionRate >= 60 ? '⚠️ At risk' : '❌ Behind' },
          { okr: 'Overdue jobs', target: '0', actual: String(overdueJobs), status: overdueJobs === 0 ? '✅ Clean' : overdueJobs <= 3 ? '⚠️ Monitor' : '❌ Action needed' },
          { okr: 'Total jobs this month', target: '—', actual: String(jobs.length), status: jobs.length > 0 ? '✅ Active' : '⚠️ No jobs' },
          { okr: 'Total expenses', target: '—', actual: `₹${totalExpenses.toLocaleString('en-IN')}`, status: '📊 Track' },
          { okr: 'Profit (Revenue - Expense)', target: '—', actual: `₹${(totalRevenue - totalExpenses).toLocaleString('en-IN')}`, status: totalRevenue > totalExpenses ? '✅ Profitable' : '❌ Loss' },
          { okr: 'Active technicians', target: '—', actual: String(technicians.filter(t => t.isActive).length), status: '📊 Track' },
          { okr: 'Active employees', target: '—', actual: String(employees.length), status: '📊 Track' },
          { okr: 'Avg jobs per technician', target: '—', actual: technicians.length > 0 ? String(Math.round(jobs.length / technicians.length * 10) / 10) : '0', status: '📊 Track' },
        ]

        summary = {
          month: now.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
          revenue: totalRevenue,
          collected: totalCollected,
          expenses: totalExpenses,
          profit: totalRevenue - totalExpenses,
          collection_rate: collectionRate + '%',
          job_completion_rate: jobCompletionRate + '%',
        }
        break
      }

      // ── Existing reports (unchanged) ──────────────────────────────────────
      case 'jobs-summary': {
        const jobs = await db.job.findMany({
          where: dateFilter ? { createdAt: dateFilter } : {},
          include: { client: { select: { companyName: true } }, technician: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        })
        data = jobs.map(j => ({
          job_no: j.jobNo, title: j.jobTitle, client: j.client.companyName,
          type: j.jobType, priority: j.priority, status: j.status,
          technician: j.technician?.name || 'Unassigned',
          deadline: j.deadline?.toISOString().slice(0, 10) || '—',
          estimated_amount: j.estimatedAmount || 0,
          date: j.createdAt.toISOString().slice(0, 10),
        }))
        break
      }

      case 'revenue-summary': {
        const invoices = await db.invoice.findMany({
          where: dateFilter ? { createdAt: dateFilter } : {},
          include: { payments: true, client: { select: { companyName: true } } },
          orderBy: { createdAt: 'desc' },
        })
        data = invoices.map(inv => ({
          invoice_no: inv.invoiceNo, date: inv.invoiceDate.toISOString().slice(0, 10),
          client: inv.client.companyName, subtotal: inv.subtotal, tax: inv.taxAmount,
          total: inv.totalAmount, paid: inv.payments.reduce((s, p) => s + p.amount, 0),
          balance: inv.totalAmount - inv.payments.reduce((s, p) => s + p.amount, 0),
          status: inv.status,
        }))
        summary = {
          total_invoiced: Math.round(invoices.reduce((s, i) => s + i.totalAmount, 0)),
          total_collected: Math.round(invoices.reduce((s, i) => s + i.payments.reduce((ps, p) => ps + p.amount, 0), 0)),
          total_outstanding: Math.round(invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.totalAmount, 0)),
        }
        break
      }

      case 'invoice-aging': {
        const invoices = await db.invoice.findMany({
          where: { status: { not: 'paid' } },
          include: { client: { select: { companyName: true } }, payments: true },
        })
        const now = Date.now()
        data = invoices.map(inv => {
          const daysOld = Math.floor((now - inv.invoiceDate.getTime()) / 86400000)
          const paid = inv.payments.reduce((s, p) => s + p.amount, 0)
          return {
            invoice_no: inv.invoiceNo, client: inv.client.companyName,
            invoice_date: inv.invoiceDate.toISOString().slice(0, 10),
            total_amount: inv.totalAmount, paid_amount: paid,
            balance: inv.totalAmount - paid, age_days: daysOld,
            aging_bucket: daysOld <= 30 ? '0-30 days' : daysOld <= 60 ? '31-60 days' : daysOld <= 90 ? '61-90 days' : '90+ days',
          }
        }).sort((a, b) => (b.age_days as number) - (a.age_days as number))
        break
      }

      case 'client-jobs': {
        const clients = await db.client.findMany({
          include: { jobs: { where: dateFilter ? { createdAt: dateFilter } : {}, include: { invoices: true } } },
        })
        data = clients.flatMap(c => c.jobs.map(j => ({
          client: c.companyName, job_no: j.jobNo, title: j.jobTitle,
          type: j.jobType, status: j.status, date: j.createdAt.toISOString().slice(0, 10),
          amount: j.estimatedAmount || 0,
        })))
        break
      }

      case 'top-clients': {
        const clients = await db.client.findMany({
          include: { invoices: true, jobs: { select: { id: true } } },
        })
        data = clients.map(c => ({
          client: c.companyName, contact: c.contactPerson, phone: c.phone,
          total_invoiced: c.invoices.reduce((s, i) => s + i.totalAmount, 0),
          paid: c.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.totalAmount, 0),
          outstanding: c.invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.totalAmount, 0),
          total_jobs: c.jobs.length,
        })).sort((a, b) => (b.total_invoiced as number) - (a.total_invoiced as number))
        break
      }

      case 'workforce-summary': {
        const employees = await db.employee.findMany({ orderBy: { department: 'asc' } })
        data = employees.map(e => ({
          code: e.empCode, name: e.name, designation: e.designation || '—',
          department: e.department || '—', phone: e.phone,
          join_date: e.joinDate?.toISOString().slice(0, 10) || '—',
          salary: e.salary, status: e.isActive ? 'Active' : 'Inactive',
        }))
        break
      }

      default:
        data = []
    }

    return NextResponse.json({ data, summary })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}