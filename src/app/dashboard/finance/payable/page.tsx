'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatDate, formatCurrency } from '@/lib/utils'

type Payable = {
  id: string
  description: string
  amount: number
  amountPaid: number
  paymentType: string
  dueDate: string | null
  status: string
  createdAt: string
  vendor: { companyName: string; contactPerson: string; phone: string }
}

const PAYMENT_TYPES = ['pending', 'partial', 'full', 'installment', 'refund', 'return', 'penalty']

const paymentTypeColors: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#faeeda', color: '#854f0b' },
  partial: { bg: '#e6f1fb', color: '#185fa5' },
  full: { bg: '#eaf3de', color: '#3b6d11' },
  installment: { bg: '#eeedfe', color: '#534ab7' },
  refund: { bg: '#fbeaf0', color: '#993556' },
  return: { bg: '#f1efe8', color: '#5f5e5a' },
  penalty: { bg: '#fcebeb', color: '#a32d2d' },
}

const inputStyle = {
  width: '100%',
  height: '36px',
  padding: '0 10px',
  border: '0.5px solid #e2e8f0',
  borderRadius: '6px',
  fontSize: '13px',
  outline: 'none',
  background: '#fff',
  color: '#0f172a',
}

const labelStyle = {
  display: 'block' as const,
  fontSize: '12px',
  fontWeight: '500' as const,
  color: '#475569',
  marginBottom: '4px',
}

export default function AccountsPayablePage() {
  const [payables, setPayables] = useState<Payable[]>([])
  const [allVendors, setAllVendors] = useState<{ id: string; companyName: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [payModal, setPayModal] = useState<Payable | null>(null)
  const [payForm, setPayForm] = useState({ amountPaid: '', paymentType: 'full' })

  const [newPayable, setNewPayable] = useState({
    vendorId: '',
    description: '',
    amount: '',
    amountPaid: '0',
    paymentType: 'pending',
    dueDate: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [vendorsRes, payablesRes] = await Promise.all([
      fetch('/api/vendors?all=true'),
      fetch('/api/payables'),
    ])
    const vData = await vendorsRes.json()
    const pData = await payablesRes.json()
    setAllVendors(vData.vendors || [])
    setPayables(pData.payables || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function showMsg(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newPayable.vendorId || !newPayable.description || !newPayable.amount) {
      showMsg('Please fill all required fields', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/payables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayable),
      })
      if (res.ok) {
        showMsg('Payable recorded!', 'success')
        setNewPayable({
          vendorId: '',
          description: '',
          amount: '',
          amountPaid: '0',
          paymentType: 'pending',
          dueDate: '',
        })
        fetchData()
      }
    } catch {
      showMsg('Failed to record payable', 'error')
    }
    setSubmitting(false)
  }

  async function handlePayUpdate() {
    if (!payModal) return
    try {
      const res = await fetch('/api/payables', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payModal.id,
          amountPaid: payForm.amountPaid,
          paymentType: payForm.paymentType,
        }),
      })
      if (res.ok) {
        showMsg('Payment updated!', 'success')
        setPayModal(null)
        fetchData()
      }
    } catch {
      showMsg('Update failed', 'error')
    }
  }

  // KPI calculations
  const totalOutstanding = payables
    .filter(p => p.status !== 'paid')
    .reduce((s, p) => s + (p.amount - p.amountPaid), 0)

  const overdueAmount = payables
    .filter(p => p.status !== 'paid' && p.dueDate && new Date(p.dueDate) < new Date())
    .reduce((s, p) => s + (p.amount - p.amountPaid), 0)

  const totalPaid = payables
    .filter(p => p.status === 'paid')
    .reduce((s, p) => s + p.amount, 0)

  const totalDues = payables
    .reduce((s, p) => s + Math.max(0, p.amount - p.amountPaid), 0)

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Accounts payable</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          Track all amounts your company owes to vendors
        </p>
      </div>

      {message.text && (
        <div style={{
          background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: message.type === 'success' ? '#16a34a' : '#dc2626',
          padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px',
        }}>
          {message.text}
        </div>
      )}

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total outstanding', value: formatCurrency(totalOutstanding), color: '#dc2626', bg: '#fef2f2' },
          { label: 'Overdue', value: formatCurrency(overdueAmount), color: '#993556', bg: '#fbeaf0' },
          { label: 'Total dues', value: formatCurrency(totalDues), color: '#854f0b', bg: '#faeeda' },
          { label: 'Total paid', value: formatCurrency(totalPaid), color: '#16a34a', bg: '#f0fdf4' },
        ].map(stat => (
          <div key={stat.label} style={{ background: stat.bg, border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '16px' }}>

        {/* Add Form */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '18px', height: 'fit-content' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '14px', paddingBottom: '8px', borderBottom: '0.5px solid #e2e8f0' }}>
            Record payable
          </div>
          <form onSubmit={handleAdd}>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Vendor *</label>
              <select
                value={newPayable.vendorId}
                onChange={e => setNewPayable(p => ({ ...p, vendorId: e.target.value }))}
                style={inputStyle}
              >
                <option value="">— Select vendor —</option>
                {allVendors.map(v => (
                  <option key={v.id} value={v.id}>{v.companyName}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Description *</label>
              <input
                value={newPayable.description}
                onChange={e => setNewPayable(p => ({ ...p, description: e.target.value }))}
                placeholder="e.g. Spare parts supply"
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <div>
                <label style={labelStyle}>Total amount (₹) *</label>
                <input
                  type="number"
                  value={newPayable.amount}
                  onChange={e => setNewPayable(p => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Amount paid (₹)</label>
                <input
                  type="number"
                  value={newPayable.amountPaid}
                  onChange={e => setNewPayable(p => ({ ...p, amountPaid: e.target.value }))}
                  placeholder="0.00"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Payment type</label>
              <select
                value={newPayable.paymentType}
                onChange={e => setNewPayable(p => ({ ...p, paymentType: e.target.value }))}
                style={inputStyle}
              >
                {PAYMENT_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Due date</label>
              <input
                type="date"
                value={newPayable.dueDate}
                onChange={e => setNewPayable(p => ({ ...p, dueDate: e.target.value }))}
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%', padding: '9px',
                background: submitting ? '#93c5fd' : '#1a56db',
                color: '#fff', border: 'none', borderRadius: '7px',
                fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              }}
            >
              {submitting ? 'Saving...' : '+ Record payable'}
            </button>
          </form>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '14px' }}>
            Payables list
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '750px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Vendor', 'Description', 'Total', 'Paid', 'Remaining', 'Type', 'Due date', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      Loading...
                    </td>
                  </tr>
                ) : payables.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      No payables recorded yet
                    </td>
                  </tr>
                ) : payables.map(p => {
                  const remaining = p.amount - p.amountPaid
                  const isOverdue = p.dueDate && new Date(p.dueDate) < new Date() && p.status !== 'paid'
                  const ptc = paymentTypeColors[p.paymentType] || paymentTypeColors.pending
                  return (
                    <tr
                      key={p.id}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>
                        {p.vendor.companyName}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#475569' }}>
                        {p.description}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>
                        {formatCurrency(p.amount)}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#16a34a', fontWeight: '500' }}>
                        {p.amountPaid > 0 ? formatCurrency(p.amountPaid) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: remaining > 0 ? '#dc2626' : '#16a34a' }}>
                        {remaining > 0 ? formatCurrency(remaining) : '✓ Cleared'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <span style={{ background: ptc.bg, color: ptc.color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500', textTransform: 'capitalize' }}>
                          {p.paymentType}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: isOverdue ? '#dc2626' : '#64748b', fontWeight: isOverdue ? '600' : '400', whiteSpace: 'nowrap' }}>
                        {p.dueDate ? formatDate(p.dueDate) : '—'}{isOverdue && ' ⚠'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <span style={{
                          background: p.status === 'paid' ? '#eaf3de' : p.status === 'partial' ? '#e6f1fb' : isOverdue ? '#fbeaf0' : '#faeeda',
                          color: p.status === 'paid' ? '#3b6d11' : p.status === 'partial' ? '#185fa5' : isOverdue ? '#993556' : '#854f0b',
                          padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500',
                        }}>
                          {p.status === 'paid' ? 'Paid' : p.status === 'partial' ? 'Partial' : isOverdue ? 'Overdue' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        {p.status !== 'paid' && (
                          <button
                            onClick={() => {
                              setPayModal(p)
                              setPayForm({
                                amountPaid: String(p.amount - p.amountPaid),
                                paymentType: 'full',
                              })
                            }}
                            style={{ padding: '4px 10px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '11px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}
                          >
                            Record payment
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {payModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
              Record payment
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
              {payModal.vendor.companyName} · {payModal.description}
            </div>

            {/* Summary */}
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Total amount</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(payModal.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Already paid</span>
                <span style={{ color: '#16a34a', fontWeight: '500' }}>{formatCurrency(payModal.amountPaid)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '600', borderTop: '0.5px solid #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ color: '#64748b' }}>Remaining</span>
                <span style={{ color: '#dc2626' }}>{formatCurrency(payModal.amount - payModal.amountPaid)}</span>
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Total paid so far (₹)</label>
              <input
                type="number"
                value={payForm.amountPaid}
                onChange={e => setPayForm(p => ({ ...p, amountPaid: e.target.value }))}
                max={String(payModal.amount)}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Payment type</label>
              <select
                value={payForm.paymentType}
                onChange={e => setPayForm(p => ({ ...p, paymentType: e.target.value }))}
                style={inputStyle}
              >
                {PAYMENT_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handlePayUpdate}
                style={{ flex: 1, padding: '10px', background: '#1a56db', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
              >
                Update payment
              </button>
              <button
                onClick={() => setPayModal(null)}
                style={{ flex: 1, padding: '10px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}
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