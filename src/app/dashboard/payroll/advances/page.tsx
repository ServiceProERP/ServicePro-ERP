'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'

type Employee = { id: string; empCode: string; name: string; designation: string | null; department: string | null }
type Advance = {
  id: string
  employeeId: string
  amount: number
  reason: string
  approvedBy: string | null
  disbursedOn: string
  recoveryMonths: number
  amountRecovered: number
  pendingAmount: number
  recoveryPerMonth: number
  status: string
  employee: Employee
  recoveries: { month: string; year: number; amount: number }[]
}

const statusColors: Record<string, { bg: string; color: string; label: string }> = {
  active:  { bg: '#faeeda', color: '#854f0b', label: 'Active' },
  closed:  { bg: '#eaf3de', color: '#3b6d11', label: 'Closed' },
  pending: { bg: '#e6f1fb', color: '#185fa5', label: 'Pending' },
}

export default function SalaryAdvancePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [advances, setAdvances] = useState<Advance[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [statusFilter, setStatusFilter] = useState('')
  const [viewAdv, setViewAdv] = useState<Advance | null>(null)

  const [form, setForm] = useState({
    employeeId: '',
    amount: '',
    reason: '',
    approvedBy: '',
    recoveryMonths: '3',
    disbursedOn: new Date().toISOString().split('T')[0],
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [empRes, advRes] = await Promise.all([
        fetch('/api/employees?limit=200'),
        fetch('/api/salary-advance'),
      ])
      const empData = await empRes.json()
      const advData = await advRes.json()
      setEmployees(empData.employees || [])
      setAdvances(advData.advances || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function showMsg(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.employeeId || !form.amount || !form.reason) { showMsg('Please fill all required fields', 'error'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/salary-advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        showMsg('Advance created successfully', 'success')
        setForm({ employeeId: '', amount: '', reason: '', approvedBy: '', recoveryMonths: '3', disbursedOn: new Date().toISOString().split('T')[0] })
        fetchData()
      } else {
        const data = await res.json()
        showMsg(data.message || 'Failed to create advance', 'error')
      }
    } catch {
      showMsg('Failed to create advance', 'error')
    }
    setSubmitting(false)
  }

  const filtered = advances.filter(a => !statusFilter || a.status === statusFilter)
  const totalOutstanding = advances.filter(a => a.status === 'active').reduce((s, a) => s + a.pendingAmount, 0)
  const totalDisbursed = advances.reduce((s, a) => s + a.amount, 0)

  const inputStyle = {
    width: '100%', height: '36px', padding: '0 10px', border: '0.5px solid #e2e8f0',
    borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a',
  }
  const labelStyle = { display: 'block' as const, fontSize: '12px', fontWeight: '500' as const, color: '#475569', marginBottom: '4px' }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Salary advances</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          Manage employee salary advances and track monthly recovery
        </p>
      </div>

      {message.text && (
        <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#16a34a' : '#dc2626', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total advances', value: String(advances.length), color: '#0f172a', bg: '#fff' },
          { label: 'Total disbursed', value: formatCurrency(totalDisbursed), color: '#185fa5', bg: '#e6f1fb' },
          { label: 'Outstanding', value: formatCurrency(totalOutstanding), color: '#854f0b', bg: '#faeeda' },
          { label: 'Active advances', value: String(advances.filter(a => a.status === 'active').length), color: '#dc2626', bg: '#fef2f2' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '16px' }}>

        {/* Form */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '18px', height: 'fit-content' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '14px', paddingBottom: '8px', borderBottom: '0.5px solid #e2e8f0' }}>
            Grant advance
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Employee *</label>
              <select value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))} style={inputStyle}>
                <option value="">— Select employee —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.empCode})</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Advance amount (₹) *</label>
              <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="e.g. 10000" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Reason *</label>
              <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Medical emergency, personal need..." rows={2} style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' as const }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Recovery over (months)</label>
              <select value={form.recoveryMonths} onChange={e => setForm(p => ({ ...p, recoveryMonths: e.target.value }))} style={inputStyle}>
                {[1,2,3,4,5,6,9,12].map(n => <option key={n} value={String(n)}>{n} month{n > 1 ? 's' : ''}</option>)}
              </select>
              {form.amount && (
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                  ₹{Math.round(parseFloat(form.amount || '0') / parseInt(form.recoveryMonths))}/month recovery
                </div>
              )}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Disbursed on</label>
              <input type="date" value={form.disbursedOn} onChange={e => setForm(p => ({ ...p, disbursedOn: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Approved by</label>
              <input type="text" value={form.approvedBy} onChange={e => setForm(p => ({ ...p, approvedBy: e.target.value }))} placeholder="Manager name" style={inputStyle} />
            </div>
            <button type="submit" disabled={submitting} style={{ width: '100%', padding: '9px', background: submitting ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Saving...' : '+ Grant advance'}
            </button>
          </form>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', flex: 1 }}>All advances</div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ height: '34px', padding: '0 10px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#475569', background: '#fff', outline: 'none' }}>
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Employee', 'Amount', 'Reason', 'Recovery', 'Recovered', 'Pending', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No advances found</td></tr>
                ) : filtered.map(adv => {
                  const sc = statusColors[adv.status] || statusColors.active
                  const pct = Math.round((adv.amountRecovered / adv.amount) * 100)
                  return (
                    <tr key={adv.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{adv.employee?.name || '—'}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{adv.employee?.empCode}</div>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{formatCurrency(adv.amount)}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#475569', maxWidth: '140px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adv.reason}</div>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>
                        {adv.recoveryMonths} mo · {formatCurrency(adv.recoveryPerMonth)}/mo
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <div style={{ fontSize: '13px', color: '#16a34a', fontWeight: '500' }}>{formatCurrency(adv.amountRecovered)}</div>
                        <div style={{ width: '60px', height: '4px', background: '#e2e8f0', borderRadius: '2px', marginTop: '3px' }}>
                          <div style={{ width: `${pct}%`, height: '4px', background: '#16a34a', borderRadius: '2px' }} />
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: adv.pendingAmount > 0 ? '#dc2626' : '#16a34a' }}>
                        {formatCurrency(adv.pendingAmount)}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>{sc.label}</span>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <button onClick={() => setViewAdv(adv)} style={{ padding: '3px 8px', border: '0.5px solid #e2e8f0', borderRadius: '5px', fontSize: '11px', color: '#475569', background: '#f8fafc', cursor: 'pointer' }}>View</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View modal */}
      {viewAdv && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>Advance details</div>
              <button onClick={() => setViewAdv(null)} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>
            {[
              { label: 'Employee', value: viewAdv.employee?.name },
              { label: 'Amount', value: formatCurrency(viewAdv.amount) },
              { label: 'Reason', value: viewAdv.reason },
              { label: 'Disbursed on', value: formatDate(viewAdv.disbursedOn) },
              { label: 'Approved by', value: viewAdv.approvedBy || '—' },
              { label: 'Recovery plan', value: `${viewAdv.recoveryMonths} months @ ${formatCurrency(viewAdv.recoveryPerMonth)}/month` },
              { label: 'Recovered so far', value: formatCurrency(viewAdv.amountRecovered) },
              { label: 'Pending', value: formatCurrency(viewAdv.pendingAmount) },
              { label: 'Status', value: statusColors[viewAdv.status]?.label || viewAdv.status },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px' }}>
                <span style={{ color: '#64748b', fontWeight: '500' }}>{f.label}</span>
                <span style={{ color: '#0f172a' }}>{f.value}</span>
              </div>
            ))}
            {viewAdv.recoveries && viewAdv.recoveries.length > 0 && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Recovery log</div>
                {viewAdv.recoveries.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>{r.month} {r.year}</span>
                    <span style={{ color: '#16a34a', fontWeight: '500' }}>- {formatCurrency(r.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setViewAdv(null)} style={{ width: '100%', marginTop: '16px', padding: '9px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}