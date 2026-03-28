'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

type Client = {
  id: string
  companyName: string
  contactPerson: string
  phone: string
  gstin: string | null
  address: string | null
  city: string | null
}

type Job = {
  id: string
  jobNo: string
  jobTitle: string
  estimatedAmount: number | null
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

const sectionTitle = {
  fontSize: '13px',
  fontWeight: '600' as const,
  color: '#0f172a',
  marginBottom: '14px',
  paddingBottom: '8px',
  borderBottom: '0.5px solid #f1f5f9',
}

export default function CreateInvoicePage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [showPaymentSection, setShowPaymentSection] = useState(false)
  const [showExtraCharges, setShowExtraCharges] = useState(false)
  const [showBankDetails, setShowBankDetails] = useState(false)

  const [form, setForm] = useState({
    clientId: '',
    jobId: '',
    subtotal: '',
    discountAmount: '0',
    taxRate: '18',
    taxAmount: '0',
    additionalTax: '0',
    additionalChargesDesc: '',
    serviceCharges: '0',
    visitingCharges: '0',
    dueDate: '',
    paymentMode: 'Bank Transfer',
    bankName: '',
    accountNo: '',
    ifscCode: '',
    upiId: '',
    notes: '',
    termsConditions: 'Payment due within 30 days. Goods once sold will not be returned.',
    initialPaymentAmount: '',
    initialPaymentType: 'advance',
  })

  useEffect(() => {
    async function load() {
      const [cRes, jRes] = await Promise.all([
        fetch('/api/clients?all=true'),
        fetch('/api/jobs?limit=200'),
      ])
      const cData = await cRes.json()
      const jData = await jRes.json()
      setClients(cData.clients || [])
      setJobs(jData.jobs || [])
    }
    load()
  }, [])

  // Auto-fill job estimated amount when job selected
  useEffect(() => {
    if (form.jobId) {
      const job = jobs.find(j => j.id === form.jobId)
      if (job?.estimatedAmount) {
        setForm(p => ({ ...p, subtotal: String(job.estimatedAmount) }))
      }
    }
  }, [form.jobId, jobs])

  // Auto-calculate GST whenever subtotal, discount or taxRate changes
  useEffect(() => {
    const sub = parseFloat(form.subtotal) || 0
    const disc = parseFloat(form.discountAmount) || 0
    const rate = parseFloat(form.taxRate) || 0
    const taxable = sub - disc
    const tax = parseFloat(((taxable * rate) / 100).toFixed(2))
    setForm(p => ({ ...p, taxAmount: String(tax) }))
  }, [form.subtotal, form.discountAmount, form.taxRate])

  const calcTotal = () => {
    const sub = parseFloat(form.subtotal) || 0
    const disc = parseFloat(form.discountAmount) || 0
    const tax = parseFloat(form.taxAmount) || 0
    const addTax = parseFloat(form.additionalTax) || 0
    const svc = parseFloat(form.serviceCharges) || 0
    const vis = parseFloat(form.visitingCharges) || 0
    return sub - disc + tax + addTax + svc + vis
  }

  const total = calcTotal()
  const initialPay = parseFloat(form.initialPaymentAmount) || 0
  const remaining = Math.max(0, total - initialPay)

  function set(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clientId || !form.subtotal) {
      setMessage({ text: 'Please select a client and enter subtotal', type: 'error' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, totalAmount: total }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ text: data.message || 'Failed to create invoice', type: 'error' })
        setSubmitting(false)
        return
      }
      router.push(`/dashboard/finance/invoices/${data.invoice.id}`)
    } catch {
      setMessage({ text: 'Something went wrong', type: 'error' })
      setSubmitting(false)
    }
  }

  const selectedClient = clients.find(c => c.id === form.clientId)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => router.back()}
          style={{ padding: '7px 14px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '12px', color: '#475569', background: '#fff', cursor: 'pointer' }}
        >
          ← Back
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Create invoice</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Fill in the details below to generate a new invoice</p>
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

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>

          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Client & Job */}
            <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <div style={sectionTitle}>Client & job details</div>

              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Client *</label>
                <select value={form.clientId} onChange={e => set('clientId', e.target.value)} style={inputStyle}>
                  <option value="">— Select client —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName} — {c.phone}</option>
                  ))}
                </select>
              </div>

              {selectedClient && (
                <div style={{ background: '#f8fafc', borderRadius: '7px', padding: '10px 12px', marginBottom: '12px', fontSize: '12px', color: '#475569', lineHeight: '1.6' }}>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>{selectedClient.companyName}</span><br />
                  {selectedClient.contactPerson} · {selectedClient.phone}
                  {selectedClient.city && ` · ${selectedClient.city}`}
                  {selectedClient.gstin && <><br />GSTIN: {selectedClient.gstin}</>}
                </div>
              )}

              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Link to job (optional)</label>
                <select value={form.jobId} onChange={e => set('jobId', e.target.value)} style={inputStyle}>
                  <option value="">— No job linked —</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.jobNo} — {j.jobTitle}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Due date</label>
                  <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Payment mode</label>
                  <select value={form.paymentMode} onChange={e => set('paymentMode', e.target.value)} style={inputStyle}>
                    {['Bank Transfer', 'Cash', 'Cheque', 'UPI', 'NEFT', 'RTGS', 'Card'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Amount Breakdown */}
            <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <div style={sectionTitle}>Amount breakdown</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={labelStyle}>Subtotal (₹) *</label>
                  <input type="number" value={form.subtotal} onChange={e => set('subtotal', e.target.value)} placeholder="0.00" min="0" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Discount (₹)</label>
                  <input type="number" value={form.discountAmount} onChange={e => set('discountAmount', e.target.value)} placeholder="0.00" min="0" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={labelStyle}>GST rate (%)</label>
                  <select value={form.taxRate} onChange={e => set('taxRate', e.target.value)} style={inputStyle}>
                    {['0', '5', '12', '18', '28'].map(r => (
                      <option key={r} value={r}>{r}% GST</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>GST amount (₹) — auto calculated</label>
                  <input type="number" value={form.taxAmount} readOnly style={{ ...inputStyle, background: '#f8fafc', color: '#64748b' }} />
                </div>
              </div>

              {/* Extra Charges Toggle */}
              <button
                type="button"
                onClick={() => setShowExtraCharges(v => !v)}
                style={{ width: '100%', padding: '8px', border: '0.5px dashed #bfdbfe', borderRadius: '7px', fontSize: '12px', color: '#1a56db', background: '#f0f7ff', cursor: 'pointer', marginBottom: showExtraCharges ? '12px' : '0' }}
              >
                {showExtraCharges ? '▲ Hide extra charges' : '+ Add service / visiting / extra charges'}
              </button>

              {showExtraCharges && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', background: '#f8fafc', borderRadius: '8px', border: '0.5px solid #e2e8f0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>Service charges (₹)</label>
                      <input type="number" value={form.serviceCharges} onChange={e => set('serviceCharges', e.target.value)} placeholder="0.00" min="0" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Visiting charges (₹)</label>
                      <input type="number" value={form.visitingCharges} onChange={e => set('visitingCharges', e.target.value)} placeholder="0.00" min="0" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>Additional tax / TDS / Cess (₹)</label>
                      <input type="number" value={form.additionalTax} onChange={e => set('additionalTax', e.target.value)} placeholder="0.00" min="0" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Charges description</label>
                      <input value={form.additionalChargesDesc} onChange={e => set('additionalChargesDesc', e.target.value)} placeholder="e.g. TDS 2%, Site visit" style={inputStyle} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Initial Payment */}
            <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '8px', borderBottom: '0.5px solid #f1f5f9' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Initial payment (optional)</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showPaymentSection} onChange={e => setShowPaymentSection(e.target.checked)} />
                  Record payment now
                </label>
              </div>

              {showPaymentSection ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={labelStyle}>Amount paid (₹)</label>
                    <input type="number" value={form.initialPaymentAmount} onChange={e => set('initialPaymentAmount', e.target.value)} placeholder="0.00" min="0" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Payment type</label>
                    <select value={form.initialPaymentType} onChange={e => set('initialPaymentType', e.target.value)} style={inputStyle}>
                      <option value="advance">Advance</option>
                      <option value="partial">Partial</option>
                      <option value="full">Full payment</option>
                      <option value="installment">Installment</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                  Enable to record advance or partial payment at the time of invoicing
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Live Total Summary */}
            <div style={{ background: '#0f172a', borderRadius: '10px', padding: '20px', color: '#fff' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Invoice summary
              </div>

              {[
                { label: 'Subtotal', value: parseFloat(form.subtotal) || 0 },
                ...(parseFloat(form.discountAmount) > 0 ? [{ label: 'Discount', value: -(parseFloat(form.discountAmount) || 0) }] : []),
                { label: `GST (${form.taxRate}%)`, value: parseFloat(form.taxAmount) || 0 },
                ...(parseFloat(form.additionalTax) > 0 ? [{ label: form.additionalChargesDesc || 'Additional tax', value: parseFloat(form.additionalTax) || 0 }] : []),
                ...(parseFloat(form.serviceCharges) > 0 ? [{ label: 'Service charges', value: parseFloat(form.serviceCharges) || 0 }] : []),
                ...(parseFloat(form.visitingCharges) > 0 ? [{ label: 'Visiting charges', value: parseFloat(form.visitingCharges) || 0 }] : []),
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                  <span style={{ color: '#94a3b8' }}>{row.label}</span>
                  <span style={{ color: row.value < 0 ? '#4ade80' : '#fff' }}>
                    {row.value < 0 ? `— ${formatCurrency(-row.value)}` : formatCurrency(row.value)}
                  </span>
                </div>
              ))}

              <div style={{ borderTop: '0.5px solid #334155', paddingTop: '12px', marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '700' }}>
                  <span>Total</span>
                  <span style={{ color: '#60a5fa' }}>{formatCurrency(total)}</span>
                </div>

                {showPaymentSection && initialPay > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '10px' }}>
                      <span style={{ color: '#86efac' }}>Amount paid</span>
                      <span style={{ color: '#86efac' }}>{formatCurrency(initialPay)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '600', marginTop: '6px' }}>
                      <span style={{ color: '#94a3b8' }}>Remaining</span>
                      <span style={{ color: remaining > 0 ? '#f87171' : '#4ade80' }}>
                        {remaining > 0 ? formatCurrency(remaining) : '✓ Paid'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bank Details */}
            <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <button
                type="button"
                onClick={() => setShowBankDetails(v => !v)}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showBankDetails ? '14px' : '0', padding: '0' }}
              >
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Bank / UPI details</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{showBankDetails ? '▲ Hide' : '▼ Show'}</span>
              </button>

              {showBankDetails && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '8px', borderTop: '0.5px solid #f1f5f9' }}>
                  {[
                    { label: 'Bank name', field: 'bankName', placeholder: 'e.g. SBI, HDFC' },
                    { label: 'Account number', field: 'accountNo', placeholder: 'Account number' },
                    { label: 'IFSC code', field: 'ifscCode', placeholder: 'e.g. SBIN0001234' },
                    { label: 'UPI ID', field: 'upiId', placeholder: 'e.g. business@upi' },
                  ].map(f => (
                    <div key={f.field}>
                      <label style={labelStyle}>{f.label}</label>
                      <input
                        value={form[f.field as keyof typeof form]}
                        onChange={e => set(f.field, e.target.value)}
                        placeholder={f.placeholder}
                        style={inputStyle}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes & Terms */}
            <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <div style={sectionTitle}>Notes & terms</div>
              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Any additional notes for the client..."
                  rows={2}
                  style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' as const }}
                />
              </div>
              <div>
                <label style={labelStyle}>Terms & conditions</label>
                <textarea
                  value={form.termsConditions}
                  onChange={e => set('termsConditions', e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' as const }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              style={{ width: '100%', padding: '12px', background: submitting ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer' }}
            >
              {submitting ? 'Creating invoice...' : `🧾 Create invoice — ${formatCurrency(total)}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}