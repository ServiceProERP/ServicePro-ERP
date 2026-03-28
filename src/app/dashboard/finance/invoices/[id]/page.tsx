'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'

type Payment = {
  id: string
  amount: number
  paymentDate: string
  paymentMode: string
  paymentType: string
  reference: string | null
  notes: string | null
}

type Invoice = {
  id: string
  invoiceNo: string
  invoiceDate: string
  status: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  additionalTax: number
  serviceCharges: number
  visitingCharges: number
  additionalChargesDesc: string | null
  totalAmount: number
  dueDate: string | null
  paidAt: string | null
  notes: string | null
  paymentMode: string | null
  bankName: string | null
  accountNo: string | null
  ifscCode: string | null
  upiId: string | null
  termsConditions: string | null
  client: {
    companyName: string
    contactPerson: string
    phone: string
    email: string | null
    address: string | null
    gstin: string | null
    city: string | null
    state: string | null
  }
  job: { jobNo: string; jobTitle: string } | null
  payments: Payment[]
}

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  unpaid: { bg: '#fcebeb', color: '#a32d2d', label: 'Unpaid' },
  paid: { bg: '#eaf3de', color: '#3b6d11', label: 'Paid' },
  partial: { bg: '#faeeda', color: '#854f0b', label: 'Partial' },
  overdue: { bg: '#fbeaf0', color: '#993556', label: 'Overdue' },
  cancelled: { bg: '#f1efe8', color: '#5f5e5a', label: 'Cancelled' },
}

const paymentTypeColors: Record<string, { bg: string; color: string }> = {
  full: { bg: '#eaf3de', color: '#3b6d11' },
  partial: { bg: '#faeeda', color: '#854f0b' },
  installment: { bg: '#e6f1fb', color: '#185fa5' },
  advance: { bg: '#eeedfe', color: '#534ab7' },
  refund: { bg: '#fbeaf0', color: '#993556' },
  penalty: { bg: '#fcebeb', color: '#a32d2d' },
}

export default function InvoiceViewPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState({
    status: '',
    dueDate: '',
    notes: '',
    bankName: '',
    accountNo: '',
    ifscCode: '',
    upiId: '',
    termsConditions: '',
  })

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await fetch(`/api/invoices/${id}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.message || 'Failed to load')
        } else {
          setInvoice(data.invoice)
          setEditData({
            status: data.invoice.status,
            dueDate: data.invoice.dueDate ? data.invoice.dueDate.slice(0, 10) : '',
            notes: data.invoice.notes || '',
            bankName: data.invoice.bankName || '',
            accountNo: data.invoice.accountNo || '',
            ifscCode: data.invoice.ifscCode || '',
            upiId: data.invoice.upiId || '',
            termsConditions: data.invoice.termsConditions || '',
          })
        }
      } catch {
        setError('Something went wrong')
      }
      setLoading(false)
    }
    if (id) fetchInvoice()
  }, [id])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })
      const data = await res.json()
      if (res.ok) {
        setInvoice(prev => prev ? { ...prev, ...data.invoice } : prev)
        setEditMode(false)
      }
    } catch { /* error */ }
    setSaving(false)
  }

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
      Loading invoice...
    </div>
  )

  if (error || !invoice) return (
    <div style={{ padding: '60px', textAlign: 'center' }}>
      <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>
        {error || 'Invoice not found.'}
      </div>
      <button
        onClick={() => router.back()}
        style={{ padding: '8px 16px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '12px', color: '#475569', background: '#fff', cursor: 'pointer' }}
      >
        ← Go back
      </button>
    </div>
  )

  const st = statusConfig[invoice.status] || statusConfig.unpaid
  const totalPaid = invoice.payments.reduce((s, p) => s + p.amount, 0)
  const remaining = Math.max(0, invoice.totalAmount - totalPaid)
  const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid'

  const cardStyle = {
    background: '#fff',
    border: '0.5px solid #e2e8f0',
    borderRadius: '10px',
    padding: '20px',
  }

  const labelStyle = {
    fontSize: '11px',
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.4px',
    marginBottom: '3px',
  }

  const valueStyle = {
    fontSize: '13px',
    color: '#0f172a',
    fontWeight: '500' as const,
  }

  const thStyle = {
    padding: '8px 12px',
    textAlign: 'left' as const,
    fontSize: '10px',
    fontWeight: '500' as const,
    color: '#64748b',
    borderBottom: '0.5px solid #e2e8f0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.4px',
    background: '#f8fafc',
  }

  const tdStyle = {
    padding: '10px 12px',
    borderBottom: '0.5px solid #f1f5f9',
    fontSize: '13px',
    color: '#475569',
  }

  const inputStyle = {
    width: '100%',
    height: '34px',
    padding: '0 10px',
    border: '0.5px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    background: '#fff',
    color: '#0f172a',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.back()}
            style={{ padding: '7px 14px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '12px', color: '#475569', background: '#fff', cursor: 'pointer' }}
          >
            ← Back
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>{invoice.invoiceNo}</h1>
              <span style={{ background: st.bg, color: st.color, padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                {st.label}
              </span>
              {isOverdue && (
                <span style={{ background: '#fef2f2', color: '#dc2626', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                  ⚠ Overdue
                </span>
              )}
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {invoice.client.companyName} · {formatDate(invoice.invoiceDate)}
              {invoice.job && ` · ${invoice.job.jobNo}`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {!editMode ? (
            <>
              <button
                onClick={() => setEditMode(true)}
                style={{ padding: '9px 16px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => router.push(`/dashboard/finance/invoices/${invoice.id}/print`)}
                style={{ padding: '9px 16px', border: '0.5px solid #bfdbfe', borderRadius: '8px', fontSize: '13px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}
              >
                🖨️ Print
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ padding: '9px 16px', background: saving ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
              >
                {saving ? 'Saving...' : '✓ Save changes'}
              </button>
              <button
                onClick={() => setEditMode(false)}
                style={{ padding: '9px 16px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Invoice total', value: formatCurrency(invoice.totalAmount), color: '#0f172a', bg: '#fff' },
          { label: 'Amount paid', value: formatCurrency(totalPaid), color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Remaining', value: formatCurrency(remaining), color: remaining > 0 ? '#dc2626' : '#16a34a', bg: remaining > 0 ? '#fef2f2' : '#f0fdf4' },
          { label: 'Due date', value: invoice.dueDate ? formatDate(invoice.dueDate) : 'No due date', color: isOverdue ? '#dc2626' : '#64748b', bg: isOverdue ? '#fef2f2' : '#fff' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: kpi.bg, border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>{kpi.label}</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Client Info */}
        <div style={cardStyle}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '14px' }}>Bill to</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'Company', value: invoice.client.companyName },
              { label: 'Contact', value: invoice.client.contactPerson },
              { label: 'Phone', value: invoice.client.phone },
              { label: 'Email', value: invoice.client.email || '—' },
              { label: 'City', value: invoice.client.city || '—' },
              { label: 'GSTIN', value: invoice.client.gstin || '—' },
            ].map(f => (
              <div key={f.label}>
                <div style={labelStyle}>{f.label}</div>
                <div style={valueStyle}>{f.value}</div>
              </div>
            ))}
          </div>
          {invoice.client.address && (
            <div style={{ marginTop: '12px' }}>
              <div style={labelStyle}>Address</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>{invoice.client.address}</div>
            </div>
          )}
        </div>

        {/* Amount Breakdown or Edit Panel */}
        <div style={cardStyle}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '14px' }}>
            {editMode ? 'Edit invoice details' : 'Amount breakdown'}
          </div>

          {editMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ ...labelStyle, textTransform: 'none' }}>Status</label>
                <select
                  value={editData.status}
                  onChange={e => setEditData(p => ({ ...p, status: e.target.value }))}
                  style={inputStyle}
                >
                  {['unpaid', 'paid', 'partial', 'overdue', 'cancelled'].map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ ...labelStyle, textTransform: 'none' }}>Due date</label>
                <input type="date" value={editData.dueDate} onChange={e => setEditData(p => ({ ...p, dueDate: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ ...labelStyle, textTransform: 'none' }}>Bank name</label>
                <input value={editData.bankName} onChange={e => setEditData(p => ({ ...p, bankName: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ ...labelStyle, textTransform: 'none' }}>Account number</label>
                <input value={editData.accountNo} onChange={e => setEditData(p => ({ ...p, accountNo: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ ...labelStyle, textTransform: 'none' }}>IFSC code</label>
                <input value={editData.ifscCode} onChange={e => setEditData(p => ({ ...p, ifscCode: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ ...labelStyle, textTransform: 'none' }}>UPI ID</label>
                <input value={editData.upiId} onChange={e => setEditData(p => ({ ...p, upiId: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ ...labelStyle, textTransform: 'none' }}>Notes</label>
                <textarea
                  value={editData.notes}
                  onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' as const }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Subtotal', value: formatCurrency(invoice.subtotal), color: '#0f172a' },
                ...(invoice.discountAmount > 0 ? [{ label: 'Discount', value: `— ${formatCurrency(invoice.discountAmount)}`, color: '#16a34a' }] : []),
                { label: 'GST', value: formatCurrency(invoice.taxAmount), color: '#0f172a' },
                ...(invoice.additionalTax > 0 ? [{ label: invoice.additionalChargesDesc || 'Additional tax', value: formatCurrency(invoice.additionalTax), color: '#0f172a' }] : []),
                ...((invoice.serviceCharges ?? 0) > 0 ? [{ label: 'Service charges', value: formatCurrency(invoice.serviceCharges ?? 0), color: '#0f172a' }] : []),
                ...((invoice.visitingCharges ?? 0) > 0 ? [{ label: 'Visiting charges', value: formatCurrency(invoice.visitingCharges ?? 0), color: '#0f172a' }] : []),
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>{row.label}</span>
                  <span style={{ color: row.color }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '600', borderTop: '0.5px solid #e2e8f0', paddingTop: '10px', marginTop: '4px' }}>
                <span>Total</span>
                <span style={{ color: '#1a56db' }}>{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Amount paid</span>
                <span style={{ color: '#16a34a', fontWeight: '500' }}>{formatCurrency(totalPaid)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '600', borderTop: '0.5px solid #e2e8f0', paddingTop: '10px' }}>
                <span>Remaining</span>
                <span style={{ color: remaining > 0 ? '#dc2626' : '#16a34a' }}>
                  {remaining > 0 ? formatCurrency(remaining) : '✓ Fully paid'}
                </span>
              </div>

              {(invoice.bankName || invoice.upiId) && (
                <div style={{ marginTop: '8px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '0.5px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>Payment details</div>
                  {invoice.bankName && <div style={{ fontSize: '12px', color: '#475569' }}>Bank: {invoice.bankName}</div>}
                  {invoice.accountNo && <div style={{ fontSize: '12px', color: '#475569' }}>Account: {invoice.accountNo}</div>}
                  {invoice.ifscCode && <div style={{ fontSize: '12px', color: '#475569' }}>IFSC: {invoice.ifscCode}</div>}
                  {invoice.upiId && <div style={{ fontSize: '12px', color: '#475569' }}>UPI: {invoice.upiId}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div style={{ ...cardStyle, marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Payment history</div>
          {remaining > 0 && (
            <button
              onClick={() => router.push('/dashboard/finance/payments')}
              style={{ padding: '6px 14px', border: '0.5px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}
            >
              + Record payment
            </button>
          )}
        </div>

        {invoice.payments.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px', background: '#f8fafc', borderRadius: '8px' }}>
            No payments recorded yet
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date', 'Amount', 'Type', 'Mode', 'Reference', 'Notes'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map(p => {
                const ptc = paymentTypeColors[p.paymentType] || paymentTypeColors.full
                return (
                  <tr
                    key={p.id}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={tdStyle}>{formatDate(p.paymentDate)}</td>
                    <td style={{ ...tdStyle, fontWeight: '600', color: '#16a34a' }}>{formatCurrency(p.amount)}</td>
                    <td style={tdStyle}>
                      <span style={{ background: ptc.bg, color: ptc.color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500', textTransform: 'capitalize' }}>
                        {p.paymentType}
                      </span>
                    </td>
                    <td style={tdStyle}>{p.paymentMode}</td>
                    <td style={tdStyle}>{p.reference || '—'}</td>
                    <td style={tdStyle}>{p.notes || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Notes & Terms */}
      {!editMode && (invoice.notes || invoice.termsConditions) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {invoice.notes && (
            <div style={cardStyle}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '8px' }}>Notes</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>{invoice.notes}</div>
            </div>
          )}
          {invoice.termsConditions && (
            <div style={cardStyle}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '8px' }}>Terms & conditions</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>{invoice.termsConditions}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}