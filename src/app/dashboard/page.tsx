import { db } from '@/lib/db'
import { formatCurrency } from '@/lib/utils'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

// ─── Data fetchers per role ────────────────────────────────────────────────

async function getAdminStats() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 86400000 - 1)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
  const yesterday = new Date(todayStart.getTime() - 86400000)

  const [
    totalJobs, openJobs, inProgressJobs, completedJobs, waitingParts,
    totalClients, totalTechnicians,
    dueTodayJobs, highPriorityOpen, todaysJobs,
    monthlyJobs, monthlyCompleted, monthlyInProgress,
    unpaidInvoices, overdueInvoices, monthlyRevenue, lastMonthRevenue,
    recentJobs, technicians, completedNoInvoice, unassignedOver24h,
  ] = await Promise.all([
    db.job.count(),
    db.job.count({ where: { status: 'open' } }),
    db.job.count({ where: { status: 'in_progress' } }),
    db.job.count({ where: { status: 'completed' } }),
    db.job.count({ where: { status: 'waiting_parts' } }),
    db.client.count({ where: { isActive: true } }),
    db.technician.count({ where: { isActive: true } }),
    db.job.count({ where: { deadline: { gte: todayStart, lte: todayEnd }, status: { notIn: ['completed', 'cancelled'] } } }),
    db.job.count({ where: { priority: 'high', status: 'open' } }),
    db.job.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
    db.job.count({ where: { createdAt: { gte: monthStart, lte: monthEnd } } }),
    db.job.count({ where: { status: 'completed', updatedAt: { gte: monthStart, lte: monthEnd } } }),
    db.job.count({ where: { status: 'in_progress', createdAt: { gte: monthStart, lte: monthEnd } } }),
    db.invoice.aggregate({ where: { status: 'unpaid' }, _sum: { totalAmount: true }, _count: true }),
    db.invoice.aggregate({ where: { status: 'unpaid', dueDate: { lt: now } }, _sum: { totalAmount: true }, _count: true }),
    db.invoice.aggregate({ where: { createdAt: { gte: monthStart, lte: monthEnd } }, _sum: { totalAmount: true } }),
    db.invoice.aggregate({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }, _sum: { totalAmount: true } }),
    db.job.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { client: { select: { companyName: true } }, technician: { select: { name: true } } } }),
    db.technician.findMany({ where: { isActive: true }, select: { id: true, name: true, jobs: { where: { status: { in: ['open', 'in_progress', 'waiting_parts'] } }, select: { id: true } } }, orderBy: { name: 'asc' } }),
    db.job.count({ where: { status: 'completed', invoices: { none: {} } } }),
    db.job.count({ where: { technicianId: null, status: 'open', createdAt: { lt: yesterday } } }),
  ])

  const thisMonthRev = monthlyRevenue._sum.totalAmount || 0
  const lastMonthRev = lastMonthRevenue._sum.totalAmount || 0
  const revenueGrowth = lastMonthRev > 0 ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100) : 0
  const daysInMonthSoFar = now.getDate()

  return {
    totalJobs, openJobs, inProgressJobs, completedJobs, waitingParts,
    totalClients, totalTechnicians,
    dueTodayJobs, highPriorityOpen, todaysJobs,
    monthlyJobs, monthlyCompleted,
    monthlyCompletionRatio: monthlyJobs > 0 ? Math.round((monthlyCompleted / monthlyJobs) * 100) : 0,
    avgDailyInProgress: daysInMonthSoFar > 0 ? parseFloat((monthlyInProgress / daysInMonthSoFar).toFixed(1)) : 0,
    avgDailyCompleted: daysInMonthSoFar > 0 ? parseFloat((monthlyCompleted / daysInMonthSoFar).toFixed(1)) : 0,
    unpaidAmount: unpaidInvoices._sum.totalAmount || 0,
    unpaidCount: unpaidInvoices._count,
    overdueAmount: overdueInvoices._sum.totalAmount || 0,
    overdueCount: overdueInvoices._count,
    monthlyRevenue: thisMonthRev,
    revenueGrowth, completedNoInvoice, unassignedOver24h,
    recentJobs, technicians,
  }
}

async function getAccountantStats() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  const [unpaid, overdue, monthlyRev, lastMonthRev, recentPayments, topClients, expenses] = await Promise.all([
    db.invoice.aggregate({ where: { status: 'unpaid' }, _sum: { totalAmount: true }, _count: true }),
    db.invoice.aggregate({ where: { status: 'unpaid', dueDate: { lt: now } }, _sum: { totalAmount: true }, _count: true }),
    db.invoice.aggregate({ where: { createdAt: { gte: monthStart, lte: monthEnd } }, _sum: { totalAmount: true } }),
    db.invoice.aggregate({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }, _sum: { totalAmount: true } }),
    db.payment.findMany({ take: 5, orderBy: { paymentDate: 'desc' }, include: { invoice: { include: { client: { select: { companyName: true } } } } } }),
    db.client.findMany({ include: { invoices: { where: { status: 'unpaid' } } }, orderBy: { companyName: 'asc' }, take: 5 }),
    db.expense.aggregate({ where: { expenseDate: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true }, _count: true }),
  ])

  const thisMonthRev = monthlyRev._sum.totalAmount || 0
  const lastMonthRevAmt = lastMonthRev._sum.totalAmount || 0

  return {
    unpaidAmount: unpaid._sum.totalAmount || 0, unpaidCount: unpaid._count,
    overdueAmount: overdue._sum.totalAmount || 0, overdueCount: overdue._count,
    monthlyRevenue: thisMonthRev,
    revenueGrowth: lastMonthRevAmt > 0 ? Math.round(((thisMonthRev - lastMonthRevAmt) / lastMonthRevAmt) * 100) : 0,
    monthlyExpenses: expenses._sum.amount || 0, expenseCount: expenses._count,
    recentPayments, topClients,
  }
}

async function getHRStats() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalEmployees, activeEmployees, totalTechnicians, pendingRequests, recentRequests, pendingPayslips, attendanceThisMonth] = await Promise.all([
    db.employee.count(),
    db.employee.count({ where: { isActive: true } }),
    db.technician.count({ where: { isActive: true } }),
    db.technicianRequest.count({ where: { status: 'pending' } }),
    db.technicianRequest.findMany({ take: 6, orderBy: { createdAt: 'desc' }, where: { status: 'pending' } }),
    db.payslip.count({ where: { status: 'draft' } }),
    db.attendance.count({ where: { year: new Date().getFullYear(), month: new Date().toLocaleString('en', { month: 'long' }) } }).catch(() => 0),
  ])

  return { totalEmployees, activeEmployees, totalTechnicians, pendingRequests, recentRequests, pendingPayslips, attendanceThisMonth }
}

async function getManagerStats() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 86400000 - 1)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const [openJobs, inProgressJobs, completedJobs, dueTodayJobs, highPriorityOpen,
    monthlyJobs, monthlyCompleted, technicians, recentJobs, overdueJobs] = await Promise.all([
    db.job.count({ where: { status: 'open' } }),
    db.job.count({ where: { status: 'in_progress' } }),
    db.job.count({ where: { status: 'completed' } }),
    db.job.count({ where: { deadline: { gte: todayStart, lte: todayEnd }, status: { notIn: ['completed', 'cancelled'] } } }),
    db.job.count({ where: { priority: 'high', status: 'open' } }),
    db.job.count({ where: { createdAt: { gte: monthStart, lte: monthEnd } } }),
    db.job.count({ where: { status: 'completed', updatedAt: { gte: monthStart, lte: monthEnd } } }),
    db.technician.findMany({ where: { isActive: true }, select: { id: true, name: true, skill: true, jobs: { where: { status: { in: ['open', 'in_progress'] } }, select: { id: true } } } }),
    db.job.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { client: { select: { companyName: true } }, technician: { select: { name: true } } } }),
    db.job.count({ where: { deadline: { lt: now }, status: { not: 'completed' } } }),
  ])

  return {
    openJobs, inProgressJobs, completedJobs, dueTodayJobs, highPriorityOpen, overdueJobs,
    monthlyJobs, monthlyCompleted,
    completionRate: monthlyJobs > 0 ? Math.round((monthlyCompleted / monthlyJobs) * 100) : 0,
    technicians, recentJobs,
  }
}

async function getStaffStats() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 86400000 - 1)

  const [openJobs, inProgressJobs, dueTodayJobs, recentJobs] = await Promise.all([
    db.job.count({ where: { status: 'open' } }),
    db.job.count({ where: { status: 'in_progress' } }),
    db.job.count({ where: { deadline: { gte: todayStart, lte: todayEnd }, status: { notIn: ['completed', 'cancelled'] } } }),
    db.job.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { client: { select: { companyName: true } }, technician: { select: { name: true } } } }),
  ])

  return { openJobs, inProgressJobs, dueTodayJobs, recentJobs }
}

// ─── Shared styles ─────────────────────────────────────────────────────────

const statusColors: Record<string, { bg: string; color: string; label: string }> = {
  open:          { bg: '#e6f1fb', color: '#185fa5', label: 'Open' },
  in_progress:   { bg: '#faeeda', color: '#854f0b', label: 'In Progress' },
  completed:     { bg: '#eaf3de', color: '#3b6d11', label: 'Completed' },
  waiting_parts: { bg: '#fbeaf0', color: '#993556', label: 'Waiting Parts' },
  cancelled:     { bg: '#f1efe8', color: '#5f5e5a', label: 'Cancelled' },
}

const priorityColors: Record<string, { bg: string; color: string }> = {
  high:   { bg: '#fcebeb', color: '#a32d2d' },
  medium: { bg: '#faeeda', color: '#854f0b' },
  low:    { bg: '#eaf3de', color: '#3b6d11' },
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
      {text}
    </div>
  )
}

function KpiCard({ label, value, sub, valColor, bg, border, icon, href }: {
  label: string; value: string | number; sub: string
  valColor: string; bg: string; border?: string; icon: string; href?: string
}) {
  const inner = (
    <div style={{ background: bg, border: `0.5px solid ${border || '#e2e8f0'}`, borderRadius: '10px', padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        <span style={{ fontSize: '16px' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '600', color: valColor, margin: '6px 0 4px' }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#64748b' }}>{sub}</div>
    </div>
  )
  return href ? <a href={href} style={{ textDecoration: 'none' }}>{inner}</a> : inner
}

// ─── Role-specific dashboard components ───────────────────────────────────

function RecentJobsTable({ jobs }: { jobs: { id: string; jobNo: string; priority: string; status: string; client: { companyName: string }; technician: { name: string } | null }[] }) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Recent jobs</div>
        <a href="/dashboard/operations/jobs" style={{ fontSize: '12px', color: '#1a56db', textDecoration: 'none' }}>View all →</a>
      </div>
      {jobs.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No jobs yet.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Job no', 'Client', 'Status', 'Priority'].map(h => (
              <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: '10px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {jobs.map(job => {
              const status = statusColors[job.status] || statusColors.open
              const priority = priorityColors[job.priority] || priorityColors.medium
              return (
                <tr key={job.id}>
                  <td style={{ padding: '8px 10px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', fontWeight: '600', color: '#1a56db' }}>{job.jobNo}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#0f172a', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.client.companyName}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <span style={{ background: status.bg, color: status.color, padding: '2px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: '500' }}>{status.label}</span>
                  </td>
                  <td style={{ padding: '8px 10px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <span style={{ background: priority.bg, color: priority.color, padding: '2px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: '500', textTransform: 'capitalize' }}>{job.priority}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Main dashboard page ───────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/')

  const role = session.role

  // ── ADMIN / SUPERADMIN ──────────────────────────────────────────────────
  if (role === 'admin' || role === 'superadmin') {
    const s = await getAdminStats()
    const now = new Date()

    const alerts: { color: 'red' | 'amber' | 'green'; text: string; badge: string }[] = []
    if (s.completedNoInvoice > 0) alerts.push({ color: 'red', text: `${s.completedNoInvoice} completed job${s.completedNoInvoice > 1 ? 's' : ''} not invoiced — revenue pending`, badge: 'Act now' })
    if (s.unassignedOver24h > 0) alerts.push({ color: 'red', text: `${s.unassignedOver24h} job${s.unassignedOver24h > 1 ? 's' : ''} unassigned for more than 24 hours`, badge: 'Act now' })
    if (s.overdueAmount > 0) alerts.push({ color: 'red', text: `Overdue invoices: ${formatCurrency(s.overdueAmount)} past due from ${s.overdueCount} client${s.overdueCount > 1 ? 's' : ''}`, badge: 'Collect' })
    if (s.highPriorityOpen > 0) alerts.push({ color: 'red', text: `${s.highPriorityOpen} high priority job${s.highPriorityOpen > 1 ? 's' : ''} open — immediate attention needed`, badge: 'Act now' })
    const idleTechs = s.technicians.filter(t => t.jobs.length === 0).length
    if (idleTechs > 0) alerts.push({ color: 'amber', text: `${idleTechs} technician${idleTechs > 1 ? 's' : ''} with no active jobs — idle capacity`, badge: 'Monitor' })
    if (s.waitingParts > 0) alerts.push({ color: 'amber', text: `${s.waitingParts} job${s.waitingParts > 1 ? 's' : ''} waiting for spare parts — check inventory`, badge: 'Monitor' })
    if (s.revenueGrowth > 0) alerts.push({ color: 'green', text: `Revenue up ${s.revenueGrowth}% vs last month`, badge: 'All good' })
    if (s.monthlyCompletionRatio >= 70) alerts.push({ color: 'green', text: `Completion ratio ${s.monthlyCompletionRatio}% this month — on track`, badge: 'All good' })

    const alertColors = {
      red:   { dot: '#dc2626', badge: { bg: '#fef2f2', color: '#dc2626' } },
      amber: { dot: '#d97706', badge: { bg: '#fffbeb', color: '#d97706' } },
      green: { dot: '#16a34a', badge: { bg: '#f0fdf4', color: '#16a34a' } },
    }

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Dashboard</h1>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Welcome back, {session.name} — here is what is happening today</p>
          </div>
          <a href="/dashboard/operations/jobs/create" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1a56db', color: '#fff', padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', textDecoration: 'none' }}>
            + New job
          </a>
        </div>

        <SectionLabel text="Business health alerts" />
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
          {alerts.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#0f172a' }}>All systems healthy — no action required today</span>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#f0fdf4', color: '#16a34a', fontWeight: '500' }}>All good</span>
            </div>
          ) : alerts.map((alert, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < alerts.length - 1 ? '0.5px solid #f1f5f9' : 'none' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: alertColors[alert.color].dot, flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#0f172a', flex: 1 }}>{alert.text}</span>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: '500', whiteSpace: 'nowrap', background: alertColors[alert.color].badge.bg, color: alertColors[alert.color].badge.color }}>{alert.badge}</span>
            </div>
          ))}
        </div>

        <SectionLabel text="Today's snapshot" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <KpiCard label="Due today" value={s.dueTodayJobs} icon="📅" sub={s.dueTodayJobs === 0 ? 'Nothing due today' : 'Jobs need completion'} valColor={s.dueTodayJobs > 0 ? '#dc2626' : '#16a34a'} bg={s.dueTodayJobs > 0 ? '#fef2f2' : '#f0fdf4'} border={s.dueTodayJobs > 0 ? '#fecaca' : '#bbf7d0'} href="/dashboard/operations/jobs" />
          <KpiCard label="High priority open" value={s.highPriorityOpen} icon="🔴" sub={s.highPriorityOpen === 0 ? 'No urgent jobs' : 'Immediate action needed'} valColor={s.highPriorityOpen > 0 ? '#a32d2d' : '#16a34a'} bg={s.highPriorityOpen > 0 ? '#fcebeb' : '#f0fdf4'} border={s.highPriorityOpen > 0 ? '#fca5a5' : '#bbf7d0'} href="/dashboard/operations/jobs" />
          <KpiCard label="Today's jobs" value={s.todaysJobs} icon="📋" sub="Jobs created today" valColor="#185fa5" bg="#e6f1fb" href="/dashboard/operations/jobs" />
          <KpiCard label="Waiting for parts" value={s.waitingParts} icon="⏳" sub={s.waitingParts === 0 ? 'No jobs blocked' : 'Blocked — check inventory'} valColor={s.waitingParts > 0 ? '#993556' : '#16a34a'} bg={s.waitingParts > 0 ? '#fbeaf0' : '#f0fdf4'} href="/dashboard/inventory" />
        </div>

        <SectionLabel text="This month's performance" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Monthly jobs', value: s.monthlyJobs, sub: `${s.monthlyCompleted} completed`, valColor: '#185fa5', barColor: '#185fa5', barBg: '#e6f1fb', barPct: s.monthlyJobs > 0 ? (s.monthlyCompleted / s.monthlyJobs) * 100 : 0 },
            { label: 'Completion ratio', value: `${s.monthlyCompletionRatio}%`, sub: s.monthlyCompletionRatio >= 70 ? '✅ On track' : s.monthlyCompletionRatio >= 40 ? '⚠ Needs attention' : '❌ Low completion', valColor: s.monthlyCompletionRatio >= 70 ? '#16a34a' : s.monthlyCompletionRatio >= 40 ? '#d97706' : '#dc2626', barColor: s.monthlyCompletionRatio >= 70 ? '#16a34a' : '#dc2626', barBg: '#f0fdf4', barPct: s.monthlyCompletionRatio },
            { label: 'Avg daily in progress', value: s.avgDailyInProgress, sub: 'Jobs/day this month', valColor: '#854f0b', barColor: '#ba7517', barBg: '#faeeda', barPct: Math.min(s.avgDailyInProgress * 10, 100) },
            { label: 'Avg daily completed', value: s.avgDailyCompleted, sub: 'Completions/day', valColor: '#3b6d11', barColor: '#3b6d11', barBg: '#eaf3de', barPct: Math.min(s.avgDailyCompleted * 10, 100) },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{kpi.label}</div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: kpi.valColor }}>{kpi.value}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{kpi.sub}</div>
              <div style={{ height: '3px', background: kpi.barBg, borderRadius: '2px', marginTop: '10px' }}>
                <div style={{ width: `${Math.min(kpi.barPct, 100)}%`, height: '100%', background: kpi.barColor, borderRadius: '2px' }} />
              </div>
            </div>
          ))}
        </div>

        <SectionLabel text="Finance" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <KpiCard label="Unpaid invoices" value={formatCurrency(s.unpaidAmount)} icon="💳" sub={`${s.unpaidCount} invoices outstanding`} valColor={s.unpaidAmount > 0 ? '#dc2626' : '#16a34a'} bg={s.unpaidAmount > 0 ? '#fef2f2' : '#f0fdf4'} href="/dashboard/finance/invoices" />
          <KpiCard label="Overdue invoices" value={formatCurrency(s.overdueAmount)} icon="⚠️" sub={s.overdueAmount > 0 ? `${s.overdueCount} past due — collect now` : 'No overdue invoices'} valColor={s.overdueAmount > 0 ? '#dc2626' : '#16a34a'} bg={s.overdueAmount > 0 ? '#fef2f2' : '#f0fdf4'} href="/dashboard/finance/invoices" />
          <KpiCard label="Revenue this month" value={formatCurrency(s.monthlyRevenue)} icon="📈" sub={s.revenueGrowth > 0 ? `+${s.revenueGrowth}% vs last month` : `${s.revenueGrowth}% vs last month`} valColor="#0f6e56" bg="#e1f5ee" href="/dashboard/finance/invoices" />
          <KpiCard label="Not invoiced (done jobs)" value={s.completedNoInvoice} icon="🧾" sub={s.completedNoInvoice === 0 ? 'All done jobs invoiced' : 'Create invoices now'} valColor={s.completedNoInvoice > 0 ? '#d97706' : '#16a34a'} bg={s.completedNoInvoice > 0 ? '#fffbeb' : '#f0fdf4'} href="/dashboard/finance/invoices" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <RecentJobsTable jobs={s.recentJobs} />
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Technician utilization</div>
              <a href="/dashboard/hr/workforce" style={{ fontSize: '12px', color: '#1a56db', textDecoration: 'none' }}>Manage →</a>
            </div>
            {s.technicians.map((tech, i) => {
              const activeJobs = tech.jobs.length
              const isIdle = activeJobs === 0
              const isHigh = activeJobs >= 4
              return (
                <div key={tech.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < s.technicians.length - 1 ? '0.5px solid #f1f5f9' : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{tech.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{activeJobs} active job{activeJobs !== 1 ? 's' : ''}</div>
                    <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', marginTop: '6px', width: '100px' }}>
                      <div style={{ width: `${Math.min((activeJobs / 5) * 100, 100)}%`, height: '100%', background: isIdle ? '#e2e8f0' : isHigh ? '#dc2626' : '#1a56db', borderRadius: '2px' }} />
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: '500', marginLeft: '12px', background: isIdle ? '#fbeaf0' : isHigh ? '#fcebeb' : '#eaf3de', color: isIdle ? '#993556' : isHigh ? '#a32d2d' : '#3b6d11' }}>
                    {isIdle ? 'Idle' : isHigh ? 'Heavy' : 'Active'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <SectionLabel text="Quick actions" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
          {[
            { label: 'Create job', href: '/dashboard/operations/jobs/create', icon: '📋', color: '#1a56db', bg: '#e6f1fb' },
            { label: 'Add client', href: '/dashboard/clients-vendors/clients/create', icon: '👥', color: '#3b6d11', bg: '#eaf3de' },
            { label: 'New invoice', href: '/dashboard/finance/invoices/create', icon: '🧾', color: '#0f6e56', bg: '#e1f5ee' },
            { label: 'Job tracking', href: '/dashboard/operations/jobs/tracking', icon: '📊', color: '#854f0b', bg: '#faeeda' },
            { label: 'View reports', href: '/dashboard/reports', icon: '📈', color: '#534ab7', bg: '#eeedfe' },
          ].map(action => (
            <a key={action.label} href={action.href} style={{ background: action.bg, borderRadius: '10px', padding: '14px 16px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', border: '0.5px solid #e2e8f0' }}>
              <span style={{ fontSize: '18px' }}>{action.icon}</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: action.color }}>{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    )
  }

  // ── MANAGER ─────────────────────────────────────────────────────────────
  if (role === 'manager') {
    const s = await getManagerStats()
    return (
      <div>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Dashboard</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Welcome back, {session.name}</p>
        </div>

        <SectionLabel text="Operations overview" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <KpiCard label="Open jobs" value={s.openJobs} icon="📋" sub="Waiting to start" valColor="#185fa5" bg="#e6f1fb" href="/dashboard/operations/jobs" />
          <KpiCard label="In progress" value={s.inProgressJobs} icon="⚙️" sub="Currently active" valColor="#854f0b" bg="#faeeda" href="/dashboard/operations/jobs" />
          <KpiCard label="Due today" value={s.dueTodayJobs} icon="📅" sub={s.dueTodayJobs === 0 ? 'Nothing due today' : 'Need completion today'} valColor={s.dueTodayJobs > 0 ? '#dc2626' : '#16a34a'} bg={s.dueTodayJobs > 0 ? '#fef2f2' : '#f0fdf4'} href="/dashboard/operations/jobs" />
          <KpiCard label="Overdue jobs" value={s.overdueJobs} icon="⚠️" sub={s.overdueJobs === 0 ? 'No overdue jobs' : 'Past deadline'} valColor={s.overdueJobs > 0 ? '#dc2626' : '#16a34a'} bg={s.overdueJobs > 0 ? '#fef2f2' : '#f0fdf4'} href="/dashboard/operations/jobs" />
        </div>

        <SectionLabel text="This month" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <KpiCard label="Monthly jobs" value={s.monthlyJobs} icon="📊" sub={`${s.monthlyCompleted} completed`} valColor="#185fa5" bg="#e6f1fb" />
          <KpiCard label="Completion rate" value={`${s.completionRate}%`} icon="✅" sub={s.completionRate >= 70 ? 'On track' : 'Needs improvement'} valColor={s.completionRate >= 70 ? '#16a34a' : '#dc2626'} bg={s.completionRate >= 70 ? '#f0fdf4' : '#fef2f2'} />
          <KpiCard label="High priority open" value={s.highPriorityOpen} icon="🔴" sub={s.highPriorityOpen === 0 ? 'No urgent jobs' : 'Needs attention'} valColor={s.highPriorityOpen > 0 ? '#dc2626' : '#16a34a'} bg={s.highPriorityOpen > 0 ? '#fef2f2' : '#f0fdf4'} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <RecentJobsTable jobs={s.recentJobs} />
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>Team utilization</div>
            {s.technicians.map((tech, i) => {
              const activeJobs = tech.jobs.length
              const isIdle = activeJobs === 0
              return (
                <div key={tech.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < s.technicians.length - 1 ? '0.5px solid #f1f5f9' : 'none' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#0f172a' }}>{tech.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{tech.skill || 'Technician'} · {activeJobs} active</div>
                  </div>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: isIdle ? '#fbeaf0' : '#eaf3de', color: isIdle ? '#993556' : '#3b6d11' }}>
                    {isIdle ? 'Idle' : 'Active'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <SectionLabel text="Quick actions" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {[
            { label: 'Create job', href: '/dashboard/operations/jobs/create', icon: '📋', color: '#1a56db', bg: '#e6f1fb' },
            { label: 'Job tracking', href: '/dashboard/operations/jobs/tracking', icon: '📊', color: '#854f0b', bg: '#faeeda' },
            { label: 'Job assignment', href: '/dashboard/operations/jobs/assignment', icon: '👷', color: '#3b6d11', bg: '#eaf3de' },
            { label: 'Reports', href: '/dashboard/reports', icon: '📈', color: '#534ab7', bg: '#eeedfe' },
          ].map(a => (
            <a key={a.label} href={a.href} style={{ background: a.bg, borderRadius: '10px', padding: '14px 16px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', border: '0.5px solid #e2e8f0' }}>
              <span style={{ fontSize: '18px' }}>{a.icon}</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: a.color }}>{a.label}</span>
            </a>
          ))}
        </div>
      </div>
    )
  }

  // ── ACCOUNTANT ───────────────────────────────────────────────────────────
  if (role === 'accountant') {
    const s = await getAccountantStats()
    return (
      <div>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Finance dashboard</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Welcome back, {session.name} — your financial overview</p>
        </div>

        <SectionLabel text="Collections" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <KpiCard label="Unpaid invoices" value={formatCurrency(s.unpaidAmount)} icon="💳" sub={`${s.unpaidCount} invoices outstanding`} valColor={s.unpaidAmount > 0 ? '#dc2626' : '#16a34a'} bg={s.unpaidAmount > 0 ? '#fef2f2' : '#f0fdf4'} href="/dashboard/finance/invoices" />
          <KpiCard label="Overdue invoices" value={formatCurrency(s.overdueAmount)} icon="⚠️" sub={s.overdueAmount > 0 ? `${s.overdueCount} past due — collect now` : 'None overdue'} valColor={s.overdueAmount > 0 ? '#dc2626' : '#16a34a'} bg={s.overdueAmount > 0 ? '#fef2f2' : '#f0fdf4'} href="/dashboard/finance/invoices" />
          <KpiCard label="Revenue this month" value={formatCurrency(s.monthlyRevenue)} icon="📈" sub={s.revenueGrowth >= 0 ? `+${s.revenueGrowth}% vs last month` : `${s.revenueGrowth}% vs last month`} valColor="#0f6e56" bg="#e1f5ee" href="/dashboard/finance/invoices" />
          <KpiCard label="Expenses this month" value={formatCurrency(s.monthlyExpenses)} icon="🧾" sub={`${s.expenseCount} transactions`} valColor="#854f0b" bg="#faeeda" href="/dashboard/finance/expenses" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>Recent payments</div>
            {s.recentPayments.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No payments yet</div>
            ) : s.recentPayments.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < s.recentPayments.length - 1 ? '0.5px solid #f1f5f9' : 'none' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{p.invoice.client.companyName}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{p.invoice.invoiceNo} · {p.paymentMode}</div>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#16a34a' }}>{formatCurrency(p.amount)}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>Outstanding clients</div>
            {s.topClients.map((c, i) => {
              const outstanding = c.invoices.reduce((sum: number, inv: { totalAmount: number }) => sum + inv.totalAmount, 0)
              return (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < s.topClients.length - 1 ? '0.5px solid #f1f5f9' : 'none' }}>
                  <div style={{ fontSize: '13px', color: '#0f172a' }}>{c.companyName}</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: outstanding > 0 ? '#dc2626' : '#16a34a' }}>{formatCurrency(outstanding)}</div>
                </div>
              )
            })}
          </div>
        </div>

        <SectionLabel text="Quick actions" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {[
            { label: 'Invoices', href: '/dashboard/finance/invoices', icon: '🧾', color: '#0f6e56', bg: '#e1f5ee' },
            { label: 'Payments', href: '/dashboard/finance/payments', icon: '💳', color: '#185fa5', bg: '#e6f1fb' },
            { label: 'Expenses', href: '/dashboard/finance/expenses', icon: '💸', color: '#854f0b', bg: '#faeeda' },
            { label: 'Reports', href: '/dashboard/reports', icon: '📊', color: '#534ab7', bg: '#eeedfe' },
          ].map(a => (
            <a key={a.label} href={a.href} style={{ background: a.bg, borderRadius: '10px', padding: '14px 16px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', border: '0.5px solid #e2e8f0' }}>
              <span style={{ fontSize: '18px' }}>{a.icon}</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: a.color }}>{a.label}</span>
            </a>
          ))}
        </div>
      </div>
    )
  }

  // ── HR ───────────────────────────────────────────────────────────────────
  if (role === 'hr') {
    const s = await getHRStats()
    return (
      <div>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>HR dashboard</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Welcome back, {session.name} — workforce overview</p>
        </div>

        <SectionLabel text="Workforce" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <KpiCard label="Total employees" value={s.totalEmployees} icon="👥" sub={`${s.activeEmployees} active`} valColor="#0f172a" bg="#fff" href="/dashboard/hr/workforce" />
          <KpiCard label="Active technicians" value={s.totalTechnicians} icon="👷" sub="Currently active" valColor="#185fa5" bg="#e6f1fb" href="/dashboard/hr/workforce" />
          <KpiCard label="Pending requests" value={s.pendingRequests} icon="📝" sub={s.pendingRequests === 0 ? 'No pending requests' : 'Need your review'} valColor={s.pendingRequests > 0 ? '#854f0b' : '#16a34a'} bg={s.pendingRequests > 0 ? '#faeeda' : '#f0fdf4'} href="/dashboard/hr/technician-requests" />
          <KpiCard label="Payslips to approve" value={s.pendingPayslips} icon="💵" sub={s.pendingPayslips === 0 ? 'All up to date' : 'Draft payslips'} valColor={s.pendingPayslips > 0 ? '#854f0b' : '#16a34a'} bg={s.pendingPayslips > 0 ? '#faeeda' : '#f0fdf4'} href="/dashboard/payroll/payslips" />
        </div>

        {s.pendingRequests > 0 && (
          <>
            <SectionLabel text="Pending technician requests" />
            <div style={{ background: '#fff', border: '0.5px solid #fde68a', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              {s.recentRequests.map((req, i) => (
                <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < s.recentRequests.length - 1 ? '0.5px solid #f1f5f9' : 'none' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{req.subject}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{req.technicianName} · {req.type.replace('_', ' ')} · {req.requestNo}</div>
                  </div>
                  <a href="/dashboard/hr/technician-requests" style={{ padding: '4px 12px', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '6px', fontSize: '11px', color: '#1a56db', textDecoration: 'none', fontWeight: '500' }}>Review →</a>
                </div>
              ))}
            </div>
          </>
        )}

        <SectionLabel text="Quick actions" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {[
            { label: 'Workforce', href: '/dashboard/hr/workforce', icon: '👷', color: '#185fa5', bg: '#e6f1fb' },
            { label: 'Technician requests', href: '/dashboard/hr/technician-requests', icon: '📝', color: '#854f0b', bg: '#faeeda' },
            { label: 'Payslips', href: '/dashboard/payroll/payslips', icon: '💵', color: '#3b6d11', bg: '#eaf3de' },
            { label: 'Reports', href: '/dashboard/reports', icon: '📊', color: '#534ab7', bg: '#eeedfe' },
          ].map(a => (
            <a key={a.label} href={a.href} style={{ background: a.bg, borderRadius: '10px', padding: '14px 16px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', border: '0.5px solid #e2e8f0' }}>
              <span style={{ fontSize: '18px' }}>{a.icon}</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: a.color }}>{a.label}</span>
            </a>
          ))}
        </div>
      </div>
    )
  }

  // ── STAFF ────────────────────────────────────────────────────────────────
  const s = await getStaffStats()
  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Dashboard</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Welcome back, {session.name}</p>
      </div>

      <SectionLabel text="Today's overview" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <KpiCard label="Open jobs" value={s.openJobs} icon="📋" sub="Waiting to start" valColor="#185fa5" bg="#e6f1fb" href="/dashboard/operations/jobs" />
        <KpiCard label="In progress" value={s.inProgressJobs} icon="⚙️" sub="Currently active" valColor="#854f0b" bg="#faeeda" href="/dashboard/operations/jobs" />
        <KpiCard label="Due today" value={s.dueTodayJobs} icon="📅" sub={s.dueTodayJobs === 0 ? 'Nothing due today' : 'Need completion'} valColor={s.dueTodayJobs > 0 ? '#dc2626' : '#16a34a'} bg={s.dueTodayJobs > 0 ? '#fef2f2' : '#f0fdf4'} href="/dashboard/operations/jobs" />
      </div>

      <RecentJobsTable jobs={s.recentJobs} />
    </div>
  )
}