'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatDate, formatCurrency } from '@/lib/utils'

type Client = { id: string; companyName: string; phone: string }
type Job = { id: string; jobNo: string; jobTitle: string }
type InvoiceOption = { id: string; invoiceNo: string; totalAmount: number }

type Refund = {
  id: string
  refundNo: string
  refundType: string
  amount: number
  reason: string
  status: string
  notes: string | null
  refundDate: string
  createdAt: string
  client: { companyName: string; phone: string }
  job: { jobNo: string; jobTitle: string } | null
  invoice: { invoiceNo: string; totalAmount: number } | null
}

const REASONS = [
  'Unrepairable equipment',
  'Dead on arrival',
  'Work not completed on time',
  'Deadline mismatch',
  'Equipment failure after repair',
  'Components out of stock',
  'Price dispute',
  'Customer fraud suspected',
  'Duplicate payment',
  'Service quality issue',
  'Wrong part installed',
  'Customer request / cancellation',
  'Other',
]

const statusColors: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#faeeda', color: '#854f0b' },
  approved: { bg: '#eaf3de', color: '#3b6d11' },
  rejected: { bg: '#fcebeb', color: '#a32d2d' },
  processed: { bg: '#e6f1fb', color: '#185fa5' },
}

const inputStyle = {
  width: '100%',
  height: '38px',
  padding: '0 12px',
  border: '0.5px solid #e2e8f0',
  borderRadius: '7px',
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
  marginBottom: '5px',
}

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [invoices, setInvoices] = useState<InvoiceOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [statusFilter, setStatusFilter] = useState('')
  const [summary, setSummary] = useState({ total: 0, pending: 0, approved: 0, count: 0 })
  const [approveModal, setApproveModal] = useState<{ id: string; action: string } | null>(null)
  const [approvedBy, setApprovedBy] = useState('')

  const [form, setForm] = useState({
    clientId: '',
    jobId: '',
    invoiceId: '',
    refundType: 'full',
    amount: '',
    reason: '',
    notes: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [refRes, cRes, jRes, invRes] = await Promise.all([
      fetch(`/api/refunds${statusFilter ? `?status=${statusFilter}` : ''}`),
      fetch('/api/clients?all=true'),
      fetch('/api/jobs?limit=200'),
      fetch('/api/invoices?limit=200'),
    ])
    const [refData, cData, jData, invData] = await Promise.all([
      refRes.json(), cRes.json(), jRes.json(), invRes.json(),
    ])
    setRefunds(refData.refunds || [])
    setSummary(refData.summary || { total: 0, pending: 0, approved: 0, count: 0 })
    setClients(cData.clients || [])
    setJobs(jData.jobs || [])
    setInvoices(invData.invoices || [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  function showMsg(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 4000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clientId || !form.amount || !form.reason) {
      showMsg('Please fill client, amount and reason', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        showMsg(data.message || 'Failed to submit refund', 'error')
        setSubmitting(false)
        return
      }
      showMsg(`Refund ${data.refund.refundNo} created successfully!`, 'success')
      setForm({ clientId: '', jobId: '', invoiceId: '', refundType: 'full', amount: '', reason: '', notes: '' })
      fetchData()
    } catch {
      showMsg('Something went wrong', 'error')
    }
    setSubmitting(false)
  }

  async function handleStatusUpdate() {
    if (!approveModal) return
    try {
      const res = await fetch('/api/refunds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: approveModal.id,
          status: approveModal.action,
          approvedBy,
        }),
      })
      if (res.ok) {
        showMsg('Status updated successfully!', 'success')
        setApproveModal(null)
        setApprovedBy('')
        fetchData()
      }
    } catch {
      showMsg('Update failed', 'error')
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Refunds</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            Manage full and partial refunds to clients
          </p>
        </div>
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
          { label: 'Total refunded', value: formatCurrency(summary.total), color: '#dc2626', bg: '#fef2f2' },
          { label: 'Pending approval', value: String(summary.pending), color: '#854f0b', bg: '#faeeda' },
          { label: 'Approved amount', value: formatCurrency(summary.approved), color: '#3b6d11', bg: '#eaf3de' },
          { label: 'Total refunds', value: String(summary.count), color: '#185fa5', bg: '#e6f1fb' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
              {k.label}
            </div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '16px' }}>

        {/* Form */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '20px', height: 'fit-content' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '16px', paddingBottom: '8px', borderBottom: '0.5px solid #e2e8f0' }}>
            New refund request
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Client *</label>
              <select
                value={form.clientId}
                onChange={e => setForm(p => ({ ...p, clientId: e.target.value, jobId: '', invoiceId: '' }))}
                style={inputStyle}
              >
                <option value="">— Select client —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Refund type</label>
                <select
                  value={form.refundType}
                  onChange={e => setForm(p => ({ ...p, refundType: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="full">Full refund</option>
                  <option value="partial">Partial refund</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Amount (₹) *</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00"
                  min="0"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Link to job (optional)</label>
              <select
                value={form.jobId}
                onChange={e => setForm(p => ({ ...p, jobId: e.target.value }))}
                style={inputStyle}
              >
                <option value="">— No job —</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.jobNo} — {j.jobTitle}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Link to invoice (optional)</label>
              <select
                value={form.invoiceId}
                onChange={e => setForm(p => ({ ...p, invoiceId: e.target.value }))}
                style={inputStyle}
              >
                <option value="">— No invoice —</option>
                {invoices.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.invoiceNo} — {formatCurrency(i.totalAmount)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Reason *</label>
              <select
                value={form.reason}
                onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                style={inputStyle}
              >
                <option value="">— Select reason —</option>
                {REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Additional notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Any additional details about this refund..."
                rows={3}
                style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' as const }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{ width: '100%', padding: '10px', background: submitting ? '#93c5fd' : '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: submitting ? 'not-allowed' : 'pointer' }}
            >
              {submitting ? 'Submitting...' : '↩ Submit refund request'}
            </button>
          </form>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Refund requests</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['', 'pending', 'approved', 'rejected', 'processed'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: '5px 12px',
                    border: '0.5px solid',
                    borderColor: statusFilter === s ? '#1a56db' : '#e2e8f0',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: statusFilter === s ? '600' : '400',
                    color: statusFilter === s ? '#1a56db' : '#475569',
                    background: statusFilter === s ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Refund no', 'Client', 'Job', 'Invoice', 'Type', 'Amount', 'Reason', 'Date', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      Loading...
                    </td>
                  </tr>
                ) : refunds.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      No refund requests found
                    </td>
                  </tr>
                ) : refunds.map(r => {
                  const sc = statusColors[r.status] || statusColors.pending
                  return (
                    <tr
                      key={r.id}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', fontWeight: '600', color: '#1a56db' }}>
                        {r.refundNo}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#0f172a', fontWeight: '500' }}>
                        {r.client.companyName}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>
                        {r.job?.jobNo || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>
                        {r.invoice?.invoiceNo || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <span style={{
                          background: r.refundType === 'full' ? '#eaf3de' : '#faeeda',
                          color: r.refundType === 'full' ? '#3b6d11' : '#854f0b',
                          padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500',
                        }}>
                          {r.refundType === 'full' ? 'Full' : 'Partial'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#dc2626' }}>
                        {formatCurrency(r.amount)}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#475569', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.reason}>
                        {r.reason}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatDate(r.refundDate)}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        {r.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => setApproveModal({ id: r.id, action: 'approved' })}
                              style={{ padding: '4px 8px', border: '0.5px solid #bbf7d0', borderRadius: '5px', fontSize: '11px', color: '#16a34a', background: '#f0fdf4', cursor: 'pointer' }}
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => setApproveModal({ id: r.id, action: 'rejected' })}
                              style={{ padding: '4px 8px', border: '0.5px solid #fecaca', borderRadius: '5px', fontSize: '11px', color: '#dc2626', background: '#fef2f2', cursor: 'pointer' }}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        )}
                        {r.status === 'approved' && (
                          <button
                            onClick={() => setApproveModal({ id: r.id, action: 'processed' })}
                            style={{ padding: '4px 10px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '11px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}
                          >
                            Mark processed
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

      {/* Approve / Reject Modal */}
      {approveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>
              {approveModal.action === 'approved' ? '✓ Approve refund'
                : approveModal.action === 'rejected' ? '✕ Reject refund'
                : '✓ Mark as processed'}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Authorised by</label>
              <input
                value={approvedBy}
                onChange={e => setApprovedBy(e.target.value)}
                placeholder="Your name or manager name"
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleStatusUpdate}
                style={{ flex: 1, padding: '9px', background: approveModal.action === 'rejected' ? '#dc2626' : '#16a34a', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
              >
                Confirm
              </button>
              <button
                onClick={() => setApproveModal(null)}
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