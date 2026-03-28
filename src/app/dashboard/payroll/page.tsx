'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

type Employee = {
  id: string
  empCode: string
  name: string
  salary: number
  department: string | null
  designation: string | null
  status: string
}

type PayrollSummary = {
  month: string
  year: number
  totalEmployees: number
  totalBasic: number
  totalAllowances: number
  totalDeductions: number
  totalNet: number
  status: string
}

type SalaryStatus = 'pending' | 'partially_paid' | 'paid' | 'held' | 'fraud'

type EmployeeSalaryStatus = {
  empId: string
  status: SalaryStatus
  paidAmount: number
  note: string
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const statusConfig: Record<SalaryStatus, { bg: string; color: string; label: string }> = {
  pending:        { bg: '#faeeda', color: '#854f0b', label: 'Pending' },
  partially_paid: { bg: '#e6f1fb', color: '#185fa5', label: 'Partial' },
  paid:           { bg: '#eaf3de', color: '#3b6d11', label: 'Paid' },
  held:           { bg: '#f1f5f9', color: '#475569', label: 'Held' },
  fraud:          { bg: '#fcebeb', color: '#a32d2d', label: 'Fraud' },
}

export default function PayrollDashboardPage() {
  const router = useRouter()
  const [payrollData, setPayrollData] = useState<PayrollSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [runningPayroll, setRunningPayroll] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [salaryStatuses, setSalaryStatuses] = useState<Record<string, EmployeeSalaryStatus>>({})

  // Action modal
  const [actionModal, setActionModal] = useState<{
    emp: Employee
    type: 'bonus' | 'deduction' | 'fraud' | 'status'
  } | null>(null)
  const [actionAmount, setActionAmount] = useState('')
  const [actionNote, setActionNote] = useState('')
  const [actionStatus, setActionStatus] = useState<SalaryStatus>('pending')

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(months[now.getMonth()])
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const empRes = await fetch('/api/employees?limit=200')
      const empData = await empRes.json()
      const emps: Employee[] = empData.employees || []
      setEmployees(emps)

      // Load payroll history
      try {
        const payrollRes = await fetch('/api/payslips?summary=true')
        if (payrollRes.ok) {
          const payrollDataRes = await payrollRes.json()
          setPayrollData(payrollDataRes.summary || [])
        }
      } catch { /* ignore */ }

      // Load salary statuses from payslips for selected month
      const init: Record<string, EmployeeSalaryStatus> = {}
      emps.forEach(e => {
        init[e.id] = { empId: e.id, status: 'pending', paidAmount: 0, note: '' }
      })

      try {
        const slipRes = await fetch(`/api/payroll-actions?month=${selectedMonth}&year=${selectedYear}`)
        if (slipRes.ok) {
          const slipData = await slipRes.json()
          const statusMap: Record<string, SalaryStatus> = {
            draft: 'pending', approved: 'partially_paid', paid: 'paid', held: 'held',
          }
          ;(slipData.payslips || []).forEach((p: { employeeId: string; status: string }) => {
            if (init[p.employeeId]) {
              init[p.employeeId].status = statusMap[p.status] || 'pending'
            }
          })
        }
      } catch { /* ignore */ }

      setSalaryStatuses(init)
    } catch (err) {
      console.error('Failed to fetch payroll data:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, selectedYear])

  useEffect(() => { fetchData() }, [fetchData])

  function showMessage(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  async function runPayroll() {
    if (employees.length === 0) { showMessage('No active employees found', 'error'); return }
    setRunningPayroll(true)
    try {
      const res = await fetch('/api/payslips/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, year: selectedYear }),
      })
      if (res.ok) {
        showMessage(`✓ Payroll for ${selectedMonth} ${selectedYear} completed! Payslips generated for ${employees.length} employees.`, 'success')
        fetchData()
      } else {
        const data = await res.json()
        showMessage(data.message || 'Failed to run payroll', 'error')
      }
    } catch {
      showMessage('Failed to run payroll. Please try again.', 'error')
    }
    setRunningPayroll(false)
  }

  function openAction(emp: Employee, type: 'bonus' | 'deduction' | 'fraud' | 'status') {
    setActionModal({ emp, type })
    setActionAmount('')
    setActionNote('')
    setActionStatus(salaryStatuses[emp.id]?.status || 'pending')
  }

  async function applyAction() {
    if (!actionModal) return
    const { emp, type } = actionModal

    // Update local state immediately
    if (type === 'status') {
      setSalaryStatuses(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], status: actionStatus, note: actionNote } }))
    } else if (type === 'bonus') {
      const amt = parseFloat(actionAmount) || 0
      setSalaryStatuses(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], note: `Bonus: ₹${amt} — ${actionNote}` } }))
    } else if (type === 'deduction') {
      const amt = parseFloat(actionAmount) || 0
      setSalaryStatuses(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], note: `Deduction: ₹${amt} — ${actionNote}` } }))
    } else if (type === 'fraud') {
      setSalaryStatuses(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], status: 'fraud', note: `FRAUD: ${actionNote}` } }))
    }

    // Save to DB
    try {
      await fetch('/api/payroll-actions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: emp.id,
          month: selectedMonth,
          year: selectedYear,
          actionType: type,
          amount: actionAmount,
          note: actionNote,
          salaryStatus: type === 'status' ? actionStatus : type === 'fraud' ? 'fraud' : undefined,
        }),
      })
    } catch { /* ignore — local state already updated */ }

    if (type === 'status') showMessage(`Status updated to ${statusConfig[actionStatus].label} for ${emp.name}`, 'success')
    else if (type === 'bonus') showMessage(`Bonus of ₹${parseFloat(actionAmount) || 0} saved for ${emp.name}`, 'success')
    else if (type === 'deduction') showMessage(`Deduction of ₹${parseFloat(actionAmount) || 0} saved for ${emp.name}`, 'success')
    else if (type === 'fraud') showMessage(`${emp.name} marked as fraud. Salary held.`, 'success')

    setActionModal(null)
  }

  const totalMonthlyPayroll = employees.filter(e => e.salary > 0).reduce((s, e) => s + e.salary, 0)
  const paidCount = Object.values(salaryStatuses).filter(s => s.status === 'paid').length
  const pendingCount = Object.values(salaryStatuses).filter(s => s.status === 'pending').length

  const selectStyle = {
    height: '36px', padding: '0 10px', border: '0.5px solid #e2e8f0',
    borderRadius: '6px', fontSize: '13px', color: '#475569', background: '#fff', outline: 'none',
  }

  const inputStyle = {
    width: '100%', height: '36px', padding: '0 10px', border: '0.5px solid #e2e8f0',
    borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Payroll dashboard</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            Run payroll, manage salary disbursements and track payment status
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={selectStyle}>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} style={selectStyle}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => router.push('/dashboard/payroll/salary')}
            style={{ padding: '9px 14px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}
          >
            ⚙ Manage salaries
          </button>
          <button
            onClick={runPayroll}
            disabled={runningPayroll || employees.length === 0}
            style={{ padding: '9px 16px', background: runningPayroll ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: runningPayroll ? 'not-allowed' : 'pointer' }}
          >
            {runningPayroll ? '⏳ Running...' : '▶ Run payroll'}
          </button>
        </div>
      </div>

      {message.text && (
        <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#16a34a' : '#dc2626', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Active employees', value: String(employees.length), color: '#0f172a', bg: '#fff' },
          { label: 'Monthly payroll', value: formatCurrency(totalMonthlyPayroll), color: '#185fa5', bg: '#e6f1fb' },
          { label: 'Avg salary', value: employees.length > 0 ? formatCurrency(totalMonthlyPayroll / employees.length) : '₹0', color: '#854f0b', bg: '#fffbeb' },
          { label: 'Salaries paid', value: String(paidCount), color: '#3b6d11', bg: '#eaf3de' },
          { label: 'Pending', value: String(pendingCount), color: '#854f0b', bg: '#faeeda' },
        ].map(stat => (
          <div key={stat.label} style={{ background: stat.bg, border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>{stat.label}</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '16px' }}>

        {/* Employee Salary Status Table */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '14px' }}>
            Employee salary status — {selectedMonth} {selectedYear}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Emp ID', 'Employee', 'Department', 'Gross salary', 'Status', 'Note', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading...</td></tr>
                ) : employees.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No active employees found</td></tr>
                ) : employees.map(emp => {
                  const ss = salaryStatuses[emp.id] || { status: 'pending', paidAmount: 0, note: '' }
                  const sc = statusConfig[ss.status]
                  return (
                    <tr key={emp.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                        {emp.empCode}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: ss.status === 'fraud' ? '#fcebeb' : '#e6f1fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: ss.status === 'fraud' ? '#a32d2d' : '#185fa5', flexShrink: 0 }}>
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{emp.name}</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{emp.designation || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>
                        {emp.department || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: emp.salary > 0 ? '#0f172a' : '#94a3b8' }}>
                        {emp.salary > 0 ? formatCurrency(emp.salary) : 'Not set'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '11px', color: '#64748b', maxWidth: '140px' }}>
                        {ss.note || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' as const }}>
                          <button onClick={() => openAction(emp, 'status')} style={{ padding: '3px 7px', border: '0.5px solid #bfdbfe', borderRadius: '4px', fontSize: '10px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}>Status</button>
                          <button onClick={() => openAction(emp, 'bonus')} style={{ padding: '3px 7px', border: '0.5px solid #bbf7d0', borderRadius: '4px', fontSize: '10px', color: '#16a34a', background: '#f0fdf4', cursor: 'pointer' }}>+ Bonus</button>
                          <button onClick={() => openAction(emp, 'deduction')} style={{ padding: '3px 7px', border: '0.5px solid #fde68a', borderRadius: '4px', fontSize: '10px', color: '#92400e', background: '#fffbeb', cursor: 'pointer' }}>- Deduct</button>
                          <button onClick={() => openAction(emp, 'fraud')} style={{ padding: '3px 7px', border: '0.5px solid #fecaca', borderRadius: '4px', fontSize: '10px', color: '#dc2626', background: '#fef2f2', cursor: 'pointer' }}>⚠ Fraud</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payroll History */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '14px' }}>Payroll history</div>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading...</div>
          ) : payrollData.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              No payroll runs yet.<br />Select month and click Run Payroll.
            </div>
          ) : payrollData.map((p, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: '0.5px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{p.month} {p.year}</div>
                <button
                  onClick={() => router.push(`/dashboard/payroll/payslips?month=${p.month}&year=${p.year}`)}
                  style={{ padding: '3px 8px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '11px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}
                >
                  View slips
                </button>
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#64748b' }}>
                <span>{p.totalEmployees} employees</span>
                <span style={{ color: '#16a34a', fontWeight: '600' }}>Net: {formatCurrency(p.totalNet)}</span>
                <span style={{ color: '#dc2626' }}>Ded: {formatCurrency(p.totalDeductions)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

            {/* Modal title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>
                  {actionModal.type === 'bonus' && '🎁 Grant bonus'}
                  {actionModal.type === 'deduction' && '➖ Apply deduction'}
                  {actionModal.type === 'fraud' && '⚠️ Mark as fraud'}
                  {actionModal.type === 'status' && '🔄 Update salary status'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{actionModal.emp.name} — {actionModal.emp.empCode}</div>
              </div>
              <button onClick={() => setActionModal(null)} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>

            {actionModal.type === 'fraud' && (
              <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', fontSize: '12px', color: '#dc2626' }}>
                ⚠️ This will mark the employee as fraud and hold their salary. This action will be logged.
              </div>
            )}

            {(actionModal.type === 'bonus' || actionModal.type === 'deduction') && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  value={actionAmount}
                  onChange={e => setActionAmount(e.target.value)}
                  placeholder="Enter amount"
                  style={inputStyle}
                />
              </div>
            )}

            {actionModal.type === 'status' && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>
                  Salary status *
                </label>
                <select value={actionStatus} onChange={e => setActionStatus(e.target.value as SalaryStatus)} style={{ ...inputStyle }}>
                  <option value="pending">Pending</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="paid">Paid</option>
                  <option value="held">Held</option>
                </select>
                {actionStatus === 'partially_paid' && (
                  <div style={{ marginTop: '8px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>Amount paid (₹)</label>
                    <input type="number" value={actionAmount} onChange={e => setActionAmount(e.target.value)} placeholder="Amount paid so far" style={inputStyle} />
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>
                {actionModal.type === 'fraud' ? 'Reason / evidence *' : 'Note / reason'}
              </label>
              <textarea
                value={actionNote}
                onChange={e => setActionNote(e.target.value)}
                placeholder={
                  actionModal.type === 'bonus' ? 'e.g. Performance bonus Q1, Diwali bonus...' :
                  actionModal.type === 'deduction' ? 'e.g. Late attendance, advance recovery...' :
                  actionModal.type === 'fraud' ? 'Describe the fraud — fake attendance, document forgery...' :
                  'Optional note...'
                }
                rows={3}
                style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none', resize: 'vertical' as const }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={applyAction}
                style={{
                  flex: 1, padding: '9px',
                  background: actionModal.type === 'fraud' ? '#dc2626' : actionModal.type === 'bonus' ? '#16a34a' : '#1a56db',
                  color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                }}
              >
                {actionModal.type === 'bonus' && '✓ Grant bonus'}
                {actionModal.type === 'deduction' && '✓ Apply deduction'}
                {actionModal.type === 'fraud' && '⚠ Confirm fraud'}
                {actionModal.type === 'status' && '✓ Update status'}
              </button>
              <button
                onClick={() => setActionModal(null)}
                style={{ flex: 1, padding: '9px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}