'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type ReportItem = { id: string; name: string; description: string; icon: string; roles?: string[] }
type ReportSection = { category: string; color: string; bg: string; roles?: string[]; items: ReportItem[] }

const reports: ReportSection[] = [
  {
    category: 'Business overview',
    color: '#1a56db', bg: '#e6f1fb',
    roles: ['superadmin', 'admin', 'manager'],
    items: [
      { id: 'okr-report', name: 'OKR dashboard', description: 'Monthly KPIs — revenue, collection rate, job completion, profit vs expense', icon: '🎯' },
    ],
  },
  {
    category: 'Operations',
    color: '#854f0b', bg: '#faeeda',
    roles: ['superadmin', 'admin', 'manager', 'hr'],
    items: [
      { id: 'technician-performance', name: 'Technician performance', description: 'Scoring: 1pt open, 2pt in-progress, 3pt completed. Grade A/B/C/D with avg repair time', icon: '👷' },
      { id: 'jobs-overdue',           name: 'Overdue jobs',           description: 'Critical/High/Medium severity — jobs past deadline with days overdue and amount at risk', icon: '⚠️' },
      { id: 'work-orders-summary',    name: 'Work orders summary',    description: 'All work orders by status, job and technician with completion rate', icon: '🔧' },
      { id: 'jobs-summary',           name: 'Jobs summary',           description: 'All jobs by status, priority and technician with estimated amounts', icon: '📋' },
    ],
  },
  {
    category: 'Finance',
    color: '#0f6e56', bg: '#e1f5ee',
    roles: ['superadmin', 'admin', 'manager', 'accountant'],
    items: [
      { id: 'payment-history', name: 'Payment history', description: 'All payments by mode — cash, bank, UPI — with reference numbers and collection analysis', icon: '💳' },
      { id: 'expense-report',  name: 'Expense report',  description: 'Expenses by category with company vs personal split and top spending category', icon: '🧾' },
      { id: 'refunds-report',  name: 'Refunds report',  description: 'All refunds with reason, status, approval — pending vs processed', icon: '↩️' },
      { id: 'revenue-summary', name: 'Revenue summary', description: 'All invoices with collected, balance and payment status', icon: '💰' },
      { id: 'invoice-aging',   name: 'Invoice aging',   description: 'Outstanding invoices grouped 0-30, 31-60, 61-90, 90+ days', icon: '📅' },
    ],
  },
  {
    category: 'Inventory',
    color: '#185fa5', bg: '#e6f1fb',
    roles: ['superadmin', 'admin', 'manager'],
    items: [
      { id: 'stock-summary',     name: 'Stock summary',     description: 'Current levels, stock value, low stock alerts and out-of-stock items', icon: '📦' },
      { id: 'spare-parts-usage', name: 'Spare parts usage', description: 'Most used parts — quantity, value and average per job', icon: '⚙️' },
      { id: 'stock-movement',    name: 'Stock movement',    description: 'All stock in/out transactions with value and reference', icon: '🔄' },
    ],
  },
  {
    category: 'HR & Payroll',
    color: '#534ab7', bg: '#eeedfe',
    roles: ['superadmin', 'admin', 'manager', 'hr', 'accountant'],
    items: [
      { id: 'payroll-summary',   name: 'Payroll summary',   description: 'Monthly payroll by employee with PF, ESIC, deductions and department breakdown', icon: '💵' },
      { id: 'workforce-summary', name: 'Workforce summary', description: 'All employees by department, designation, salary and status', icon: '👥', roles: ['superadmin', 'admin', 'manager', 'hr'] },
    ],
  },
  {
    category: 'Clients',
    color: '#3b6d11', bg: '#eaf3de',
    roles: ['superadmin', 'admin', 'manager', 'accountant'],
    items: [
      { id: 'top-clients', name: 'Top clients by revenue', description: 'Ranked by total invoiced — with paid, outstanding and job count', icon: '🏆' },
      { id: 'client-jobs', name: 'Client job history',     description: 'All jobs per client with status and revenue', icon: '📁' },
    ],
  },
]

export default function ReportsListPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.role) setUserRole(d.role) })
      .catch(() => setUserRole('admin'))
  }, [])

  const visibleReports = reports
    .filter(s => !s.roles || s.roles.includes(userRole))
    .map(s => ({ ...s, items: s.items.filter(i => !i.roles || i.roles.includes(userRole)) }))
    .filter(s => s.items.length > 0)

  if (!userRole) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading...</div>
  )

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Reports</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          Business intelligence — select any report to view data, filter by date and export CSV
        </p>
      </div>

      {visibleReports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontSize: '13px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
          No reports available for your role.
        </div>
      ) : visibleReports.map(section => (
        <div key={section.category} style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ background: section.bg, color: section.color, padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
              {section.category}
            </span>
            <div style={{ flex: 1, height: '0.5px', background: '#e2e8f0' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {section.items.map(report => (
              <div
                key={report.id}
                onClick={() => router.push(`/dashboard/reports/viewer?report=${report.id}`)}
                style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'flex-start', gap: '14px' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = section.color; e.currentTarget.style.background = '#fafcff'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{ width: '40px', height: '40px', background: section.bg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                  {report.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>{report.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>{report.description}</div>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '16px', flexShrink: 0 }}>→</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}