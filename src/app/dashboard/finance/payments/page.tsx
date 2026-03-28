'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatDate, formatCurrency } from '@/lib/utils'

type Payment = {
  id: string
  amount: number
  paymentDate: string
  paymentMode: string
  paymentType: string
  reference: string | null
  notes: string | null
  invoice: {
    invoiceNo: string
    totalAmount: number
    client: { companyName: string }
  }
}

type Invoice = {
  id: string
  invoiceNo: string
  totalAmount: number
  status: string
  payments: { amount: number }[]
  client: { companyName: string }
}

const paymentModes = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'NEFT', 'RTGS', 'Card']
const paymentTypes = ['full', 'partial', 'installment', 'advance', 'refund', 'return', 'penalty']

const paymentTypeColors: Record<string, { bg: string; color: string }> = {
  full: { bg: '#eaf3de', color: '#3b6d11' },
  partial: { bg: '#faeeda', color: '#854f0b' },
  installment: { bg: '#e6f1fb', color: '#185fa5' },
  advance: { bg: '#eeedfe', color: '#534ab7' },
  refund: { bg: '#fbeaf0', color: '#993556' },
  return: { bg: '#f1efe8', color: '#5f5e5a' },
  penalty: { bg: '#fcebeb', color: '#a32d2d' },
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

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [summary, setSummary] = useState({
    total: 0,
    thisMonth: 0,
    count: 0,
    totalDues: 0,
  })
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const [form, setForm] = useState({
    invoiceId: '',
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMode: 'Bank Transfer',
    paymentType: 'full',
    reference: '',
    notes: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [paymentsRes, invoicesRes] = await Promise.all([
      fetch('/api/payments'),
      fetch('/api/invoices?limit=200'),
    ])
    const paymentsData = await paymentsRes.json()
    const invoicesData = await invoicesRes.json()

    const allPayments: Payment[] = paymentsData.payments || []
    const allInvoices: Invoice[] = invoicesData.invoices || []

    setPayments(allPayments)

    // Only show unpaid/partial invoices in dropdown
    const unpaid = allInvoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled')
    setUnpaidInvoices(unpaid)

    const now = new Date()
    const thisMonthPayments = allPayments.filter(p => {
      const d = new Date(p.paymentDate)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })

    const totalDues = allInvoices.reduce((s, inv) => {
      const paid = inv.payments.reduce((ps, p) => ps + p.amount, 0)
      return s + Math.max(0, inv.totalAmount - paid)
    }, 0)

    setSummary({
      total: allPayments.reduce((s, p) => s + p.amount, 0),
      thisMonth: thisMonthPayments.reduce((s, p) => s + p.amount, 0),
      count: allPayments.length,
      totalDues,
    })

    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function showMessage(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  function handleInvoiceSelect(invoiceId: string) {
    const inv = unpaidInvoices.find(i => i.id === invoiceId)
    setSelectedInvoice(inv || null)
    if (inv) {
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0)
      const remaining = Math.max(0, inv.totalAmount - paid)
      setForm(prev => ({ ...prev, invoiceId, amount: String(remaining) }))
    } else {
      setForm(prev => ({ ...prev, invoiceId, amount: '' }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.invoiceId || !form.amount) {
      showMessage('Please select invoice and enter amount', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        showMessage(data.message || 'Failed to record payment', 'error')
        setSubmitting(false)
        return
      }
      showMessage('Payment recorded successfully!', 'success')
      setForm({
        invoiceId: '',
        amount: '',
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentMode: 'Bank Transfer',
        paymentType: 'full',
        reference: '',
        notes: '',
      })
      setSelectedInvoice(null)
      fetchData()
    } catch {
      showMessage('Something went wrong', 'error')
    }
    setSubmitting(false)
  }

  const getRemainingForInvoice = (inv: Invoice) => {
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0)
    return Math.max(0, inv.totalAmount - paid)
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Payments</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          Record and track all client payments
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
          { label: 'Total received', value: formatCurrency(summary.total), color: '#16a34a', bg: '#f0fdf4' },
          { label: 'This month', value: formatCurrency(summary.thisMonth), color: '#185fa5', bg: '#e6f1fb' },
          { label: 'Total transactions', value: String(summary.count), color: '#0f172a', bg: '#fff' },
          { label: 'Total dues pending', value: formatCurrency(summary.totalDues), color: summary.totalDues > 0 ? '#dc2626' : '#16a34a', bg: summary.totalDues > 0 ? '#fef2f2' : '#f0fdf4' },
        ].map(stat => (
          <div key={stat.label} style={{ background: stat.bg, border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '16px' }}>

        {/* Record Payment Form */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '20px', height: 'fit-content' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '16px', paddingBottom: '8px', borderBottom: '0.5px solid #e2e8f0' }}>
            Record payment
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Select invoice *</label>
              <select
                value={form.invoiceId}
                onChange={e => handleInvoiceSelect(e.target.value)}
                style={inputStyle}
              >
                <option value="">— Select unpaid invoice —</option>
                {unpaidInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNo} — {inv.client.companyName} (₹{getRemainingForInvoice(inv).toLocaleString('en-IN')} due)
                  </option>
                ))}
              </select>
              {unpaidInvoices.length === 0 && !loading && (
                <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px' }}>
                  All invoices are paid! 🎉
                </div>
              )}
            </div>

            {/* Invoice summary box */}
            {selectedInvoice && (
              <div style={{ background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a', marginBottom: '8px' }}>
                  {selectedInvoice.invoiceNo} — {selectedInvoice.client.companyName}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div style={{ textAlign: 'center', background: '#fff', borderRadius: '6px', padding: '8px', border: '0.5px solid #e2e8f0' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Total</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{formatCurrency(selectedInvoice.totalAmount)}</div>
                  </div>
                  <div style={{ textAlign: 'center', background: '#f0fdf4', borderRadius: '6px', padding: '8px', border: '0.5px solid #bbf7d0' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Paid</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#16a34a' }}>
                      {formatCurrency(selectedInvoice.totalAmount - getRemainingForInvoice(selectedInvoice))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', background: '#fef2f2', borderRadius: '6px', padding: '8px', border: '0.5px solid #fecaca' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Remaining</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#dc2626' }}>
                      {formatCurrency(getRemainingForInvoice(selectedInvoice))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Amount (₹) *</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  min="0"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Payment type *</label>
                <select
                  value={form.paymentType}
                  onChange={e => setForm(prev => ({ ...prev, paymentType: e.target.value }))}
                  style={inputStyle}
                >
                  {paymentTypes.map(t => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Payment date *</label>
                <input
                  type="date"
                  value={form.paymentDate}
                  onChange={e => setForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Payment mode *</label>
                <select
                  value={form.paymentMode}
                  onChange={e => setForm(prev => ({ ...prev, paymentMode: e.target.value }))}
                  style={inputStyle}
                >
                  {paymentModes.map(mode => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Reference / cheque no.</label>
              <input
                value={form.reference}
                onChange={e => setForm(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="Transaction ID or cheque number"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes..."
                rows={2}
                style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' as const }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%', padding: '10px',
                background: submitting ? '#93c5fd' : '#1a56db',
                color: '#fff', border: 'none', borderRadius: '8px',
                fontSize: '13px', fontWeight: '500',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Recording...' : '💰 Record payment'}
            </button>
          </form>
        </div>

        {/* Payment History Table */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '14px' }}>
            Payment history
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Date', 'Invoice', 'Client', 'Total', 'Paid', 'Remaining', 'Type', 'Mode', 'Ref'].map(h => (
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
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      No payments recorded yet
                    </td>
                  </tr>
                ) : payments.map(payment => {
                  const ptc = paymentTypeColors[payment.paymentType] || paymentTypeColors.full
                  const totalInvoice = payment.invoice.totalAmount
                  const paidSoFar = payment.amount
                  const remainingAmt = Math.max(0, totalInvoice - paidSoFar)
                  return (
                    <tr
                      key={payment.id}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatDate(payment.paymentDate)}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', fontWeight: '600', color: '#1a56db' }}>
                        {payment.invoice.invoiceNo}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#0f172a' }}>
                        {payment.invoice.client.companyName.length > 12
                          ? payment.invoice.client.companyName.slice(0, 12) + '...'
                          : payment.invoice.client.companyName}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#475569' }}>
                        {formatCurrency(totalInvoice)}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#16a34a' }}>
                        {formatCurrency(paidSoFar)}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: remainingAmt > 0 ? '#dc2626' : '#16a34a' }}>
                        {remainingAmt > 0 ? formatCurrency(remainingAmt) : '✓ Cleared'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <span style={{ background: ptc.bg, color: ptc.color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500', textTransform: 'capitalize' }}>
                          {payment.paymentType}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <span style={{ background: '#f0f7ff', color: '#185fa5', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>
                          {payment.paymentMode}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>
                        {payment.reference || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}