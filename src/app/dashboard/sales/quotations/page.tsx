'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'

type Quotation = {
  id: string
  quotationNo: string
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  items: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  status: string
  validUntil: string | null
  notes: string | null
  createdAt: string
}

type Client = {
  id: string; clientCode: string; companyName: string
  contactPerson: string; phone: string; email: string | null
  address: string | null; gstin: string | null
}

type LineItem = {
  description: string; hsnCode: string; quantity: string
  unit: string; unitPrice: string; gstPct: string; amount: number
}

type AdditionalCharge = { label: string; amount: string }
type AdditionalTax = { label: string; rate: string; amount: number }

type ParsedItems = {
  lineItems?: LineItem[]
  additionalCharges?: AdditionalCharge[]
  additionalTaxes?: AdditionalTax[]
  discount?: string
  clientAddress?: string
  clientGstin?: string
  paymentTerms?: string
  placeOfSupply?: string
  termsConditions?: string
  revisionNote?: string
}

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  draft:    { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
  sent:     { bg: '#e6f1fb', color: '#185fa5', label: 'Sent' },
  accepted: { bg: '#eaf3de', color: '#3b6d11', label: 'Accepted' },
  rejected: { bg: '#fef2f2', color: '#dc2626', label: 'Rejected' },
  expired:  { bg: '#faeeda', color: '#854f0b', label: 'Superseded' },
}

const inputStyle = {
  width: '100%', height: '36px', padding: '0 10px',
  border: '0.5px solid #e2e8f0', borderRadius: '6px',
  fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a',
}

const labelStyle = {
  display: 'block' as const,
  fontSize: '12px', fontWeight: '500' as const,
  color: '#475569', marginBottom: '4px',
}

const emptyItem = (): LineItem => ({
  description: '', hsnCode: '', quantity: '1', unit: 'nos', unitPrice: '', gstPct: '18', amount: 0,
})

function toWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  if (num === 0) return 'Zero'
  function convert(n: number): string {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '')
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
  }
  return convert(Math.floor(num)) + ' Rupees Only'
}

function parseItems(itemsStr: string): ParsedItems {
  try {
    const parsed = JSON.parse(itemsStr)
    if (Array.isArray(parsed)) return { lineItems: parsed }
    return parsed
  } catch { return {} }
}

export default function QuotationsPage() {
  const router = useRouter()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [statusFilter, setStatusFilter] = useState('')
  const [showSuperseded, setShowSuperseded] = useState(false)
  const [company, setCompany] = useState({ companyName: 'Your Company', companyAddress: '', companyPhone: '', companyEmail: '', companyGstin: '' })
  const [clientMode, setClientMode] = useState<'existing' | 'manual'>('existing')

  // Edit / Revise mode
  const [mode, setMode] = useState<'create' | 'edit' | 'revise'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [reviseNote, setReviseNote] = useState('')

  const [form, setForm] = useState({
    selectedClientId: '',
    clientName: '', clientEmail: '', clientPhone: '', clientAddress: '', clientGstin: '',
    validUntil: '', notes: '',
    termsConditions: '1. Payment due within 30 days of invoice date.\n2. Quotation valid for 30 days from date of issue.\n3. Prices are exclusive of GST unless stated.\n4. Goods once delivered cannot be returned without prior approval.',
    discount: '', paymentTerms: '30 days', placeOfSupply: 'Maharashtra',
  })
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyItem()])
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([
    { label: 'Freight / Shipping', amount: '' },
    { label: 'Installation charges', amount: '' },
  ])
  const [additionalTaxes, setAdditionalTaxes] = useState<AdditionalTax[]>([
    { label: 'TDS (Tax Deducted at Source)', rate: '2', amount: 0 },
  ])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [qRes, clientRes, configRes] = await Promise.all([
        fetch(`/api/quotations${statusFilter ? `?status=${statusFilter}` : ''}`),
        fetch('/api/clients?all=true'),
        fetch('/api/settings'),
      ])
      const qData = await qRes.json()
      const clientData = await clientRes.json()
      const configData = await configRes.json()
      setQuotations(qData.quotations || [])
      setClients(clientData.clients || [])
      if (configData.config) setCompany(configData.config)
    } catch { /* ignore */ }
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  function showMsg(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 4000)
  }

  function resetForm() {
    setForm({ selectedClientId: '', clientName: '', clientEmail: '', clientPhone: '', clientAddress: '', clientGstin: '', validUntil: '', notes: '', termsConditions: '1. Payment due within 30 days of invoice date.\n2. Quotation valid for 30 days from date of issue.\n3. Prices are exclusive of GST unless stated.\n4. Goods once delivered cannot be returned without prior approval.', discount: '', paymentTerms: '30 days', placeOfSupply: 'Maharashtra' })
    setLineItems([emptyItem()])
    setAdditionalCharges([{ label: 'Freight / Shipping', amount: '' }, { label: 'Installation charges', amount: '' }])
    setAdditionalTaxes([{ label: 'TDS (Tax Deducted at Source)', rate: '2', amount: 0 }])
    setMode('create')
    setEditingId(null)
    setReviseNote('')
  }

  function loadQuotationIntoForm(q: Quotation, formMode: 'edit' | 'revise') {
    const parsed = parseItems(q.items)
    setForm({
      selectedClientId: '',
      clientName: q.clientName,
      clientEmail: q.clientEmail || '',
      clientPhone: q.clientPhone || '',
      clientAddress: parsed.clientAddress || '',
      clientGstin: parsed.clientGstin || '',
      validUntil: q.validUntil ? q.validUntil.split('T')[0] : '',
      notes: q.notes || '',
      termsConditions: parsed.termsConditions || '',
      discount: parsed.discount || '',
      paymentTerms: parsed.paymentTerms || '30 days',
      placeOfSupply: parsed.placeOfSupply || 'Maharashtra',
    })
    setLineItems(parsed.lineItems?.length ? parsed.lineItems : [emptyItem()])
    setAdditionalCharges(parsed.additionalCharges?.length ? parsed.additionalCharges : [{ label: 'Freight / Shipping', amount: '' }, { label: 'Installation charges', amount: '' }])
    setAdditionalTaxes(parsed.additionalTaxes?.length ? parsed.additionalTaxes : [{ label: 'TDS (Tax Deducted at Source)', rate: '2', amount: 0 }])
    setMode(formMode)
    setEditingId(q.id)
    setClientMode('manual')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function selectClient(clientId: string) {
    const c = clients.find(c => c.id === clientId)
    if (!c) return
    setForm(p => ({ ...p, selectedClientId: clientId, clientName: c.companyName, clientEmail: c.email || '', clientPhone: c.phone, clientAddress: c.address || '', clientGstin: c.gstin || '' }))
  }

  function updateLineItem(i: number, field: keyof LineItem, value: string) {
    setLineItems(prev => {
      const updated = [...prev]
      const item = { ...updated[i], [field]: value }
      item.amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
      updated[i] = item
      return updated
    })
  }

  const subtotal = lineItems.reduce((s, i) => s + i.amount, 0)
  const totalGst = lineItems.reduce((s, i) => s + (i.amount * (parseFloat(i.gstPct) || 0) / 100), 0)
  const totalAdditionalCharges = additionalCharges.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)
  const discount = parseFloat(form.discount) || 0
  const subtotalAfterDiscount = subtotal - discount
  const grandTotal = subtotalAfterDiscount + totalGst + totalAdditionalCharges
  const totalAddTax = additionalTaxes.reduce((s, t) => s + (grandTotal * (parseFloat(t.rate) || 0) / 100), 0)
  const finalTotal = grandTotal - totalAddTax

  const bodyPayload = () => ({
    clientName: form.clientName,
    clientEmail: form.clientEmail || null,
    clientPhone: form.clientPhone || null,
    items: JSON.stringify({
      lineItems: lineItems.filter(i => i.description),
      additionalCharges: additionalCharges.filter(c => parseFloat(c.amount) > 0),
      additionalTaxes,
      discount: form.discount,
      clientAddress: form.clientAddress,
      clientGstin: form.clientGstin,
      paymentTerms: form.paymentTerms,
      placeOfSupply: form.placeOfSupply,
      termsConditions: form.termsConditions,
      ...(mode === 'revise' && reviseNote ? { revisionNote: reviseNote } : {}),
    }),
    subtotal: subtotalAfterDiscount,
    taxAmount: totalGst,
    totalAmount: finalTotal,
    validUntil: form.validUntil || null,
    notes: form.notes || null,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clientName) { showMsg('Client name is required', 'error'); return }
    if (lineItems.every(i => !i.description)) { showMsg('Add at least one line item', 'error'); return }
    setSubmitting(true)

    try {
      let res: Response

      if (mode === 'create') {
        res = await fetch('/api/quotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload()),
        })
      } else if (mode === 'edit' && editingId) {
        res = await fetch(`/api/quotations/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload()),
        })
      } else if (mode === 'revise' && editingId) {
        res = await fetch(`/api/quotations/${editingId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload()),
        })
      } else {
        setSubmitting(false); return
      }

      const data = await res.json()
      if (res.ok) {
        const msgs: Record<string, string> = {
          create: 'Quotation created successfully!',
          edit: 'Quotation updated successfully!',
          revise: `Revision created: ${data.quotation?.quotationNo}. Original marked as superseded.`,
        }
        showMsg(msgs[mode], 'success')
        resetForm()
        setShowForm(false)
        fetchData()
      } else {
        showMsg(data.message || 'Failed to save quotation', 'error')
      }
    } catch {
      showMsg('Failed to save quotation', 'error')
    }
    setSubmitting(false)
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/quotations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, statusOnly: true }),
    })
    fetchData()
  }

  function isRevision(q: Quotation) { return q.quotationNo.includes('-Rev') }
  function revisionNumber(q: Quotation) {
    const match = q.quotationNo.match(/-Rev(\d+)$/)
    return match ? parseInt(match[1]) : null
  }

  function printQuotation(q: Quotation) {
    const parsed = parseItems(q.items)
    const items: LineItem[] = parsed.lineItems || [{ description: q.items, hsnCode: '', quantity: '1', unit: 'nos', unitPrice: String(q.subtotal), gstPct: '18', amount: q.subtotal }]
    const addCharges: AdditionalCharge[] = parsed.additionalCharges || []
    const addTaxes: AdditionalTax[] = parsed.additionalTaxes || []
    const disc = parseFloat(parsed.discount || '0') || 0
    const sub = items.reduce((s, i) => s + i.amount, 0)
    const gst = items.reduce((s, i) => s + (i.amount * (parseFloat(i.gstPct) || 0) / 100), 0)
    const addC = addCharges.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)
    const grand = sub - disc + gst + addC
    const revNo = revisionNumber(q)

    const w = window.open('', '_blank', 'width=950,height=800')
    if (!w) return
    w.document.write(`
      <html><head><title>${q.quotationNo}</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;color:#000;padding:20px}table{border-collapse:collapse;width:100%}th,td{padding:7px 10px;border:1px solid #ddd}th{background:#f8fafc;font-weight:600}.right{text-align:right}.center{text-align:center}@page{size:A4;margin:15mm}</style>
      </head><body>
      <div style="border-bottom:2px solid #1a56db;padding-bottom:12px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:20px;font-weight:700;color:#1a56db">${company.companyName}</div>
          <div style="font-size:11px;color:#555">${company.companyAddress || ''}${company.companyPhone ? ' | Tel: ' + company.companyPhone : ''}${company.companyEmail ? ' | ' + company.companyEmail : ''}</div>
          ${company.companyGstin ? `<div style="font-size:11px;color:#555">GSTIN: ${company.companyGstin}</div>` : ''}
        </div>
        <div style="text-align:right">
          <div style="font-size:16px;font-weight:700;color:#1a56db">QUOTATION${revNo ? ` <span style="font-size:12px;background:#faeeda;color:#854f0b;padding:2px 8px;border-radius:4px">Revision ${revNo}</span>` : ''}</div>
          <div style="font-size:12px;margin-top:4px"><strong>No:</strong> ${q.quotationNo}</div>
          <div style="font-size:12px"><strong>Date:</strong> ${new Date(q.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
          ${q.validUntil ? `<div style="font-size:12px"><strong>Valid until:</strong> ${formatDate(q.validUntil)}</div>` : ''}
          <div style="font-size:11px;color:#555">Place of supply: ${parsed.placeOfSupply || 'Maharashtra'}</div>
          ${revNo ? `<div style="font-size:11px;color:#854f0b;margin-top:4px">⚠ This is Revision ${revNo} — supersedes previous version</div>` : ''}
        </div>
      </div>
      <table style="margin-bottom:14px">
        <tr>
          <td style="width:50%;vertical-align:top;padding:10px">
            <div style="font-size:11px;color:#666;font-weight:600;margin-bottom:4px;text-transform:uppercase">Bill To</div>
            <div style="font-size:13px;font-weight:700">${q.clientName}</div>
            ${parsed.clientAddress ? `<div style="font-size:11px;color:#555;margin-top:2px">${parsed.clientAddress}</div>` : ''}
            ${q.clientPhone ? `<div style="font-size:11px;color:#555">Tel: ${q.clientPhone}</div>` : ''}
            ${q.clientEmail ? `<div style="font-size:11px;color:#555">Email: ${q.clientEmail}</div>` : ''}
            ${parsed.clientGstin ? `<div style="font-size:11px;color:#555">GSTIN: ${parsed.clientGstin}</div>` : ''}
          </td>
          <td style="width:50%;vertical-align:top;padding:10px">
            <div style="font-size:11px;color:#666;font-weight:600;margin-bottom:4px;text-transform:uppercase">Payment Details</div>
            <div style="font-size:12px"><strong>Payment terms:</strong> ${parsed.paymentTerms || '30 days'}</div>
          </td>
        </tr>
      </table>
      <table style="margin-bottom:14px">
        <thead><tr style="background:#1a56db;color:#fff">
          <th style="width:5%;border-color:#1a56db" class="center">Sr</th>
          <th style="border-color:#1a56db">Description</th>
          <th style="width:8%;border-color:#1a56db" class="center">HSN/SAC</th>
          <th style="width:6%;border-color:#1a56db" class="center">Qty</th>
          <th style="width:6%;border-color:#1a56db" class="center">Unit</th>
          <th style="width:10%;border-color:#1a56db" class="right">Rate (₹)</th>
          <th style="width:7%;border-color:#1a56db" class="center">GST%</th>
          <th style="width:10%;border-color:#1a56db" class="right">Amount (₹)</th>
        </tr></thead>
        <tbody>
          ${items.map((item, i) => `<tr><td class="center">${i + 1}</td><td>${item.description}</td><td class="center" style="color:#555;font-size:11px">${item.hsnCode || '—'}</td><td class="center">${item.quantity}</td><td class="center">${item.unit}</td><td class="right">${parseFloat(item.unitPrice || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td><td class="center">${item.gstPct}%</td><td class="right" style="font-weight:600">${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`).join('')}
        </tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
        <table style="width:320px">
          <tr><td style="background:#f8fafc;font-weight:600">Subtotal</td><td class="right">₹ ${sub.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
          ${disc > 0 ? `<tr><td style="background:#f8fafc;color:#dc2626">Discount</td><td class="right" style="color:#dc2626">- ₹ ${disc.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>` : ''}
          <tr><td style="background:#f8fafc;font-weight:600">GST (total)</td><td class="right">₹ ${gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
          ${addCharges.map(c => `<tr><td style="background:#f8fafc">${c.label}</td><td class="right">₹ ${parseFloat(c.amount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`).join('')}
          ${addTaxes.map(t => `<tr><td style="background:#faeeda;color:#854f0b">${t.label} (${t.rate}%)</td><td class="right" style="color:#854f0b">- ₹ ${(grand * parseFloat(t.rate || '0') / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`).join('')}
          <tr style="font-size:14px;font-weight:700;background:#1a56db;color:#fff"><td>Grand Total</td><td class="right">₹ ${q.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
        </table>
      </div>
      <div style="border:1px solid #e2e8f0;border-radius:4px;padding:8px 12px;margin-bottom:14px;font-size:11px"><strong>Amount in words:</strong> ${toWords(Math.round(q.totalAmount))}</div>
      ${q.notes ? `<div style="border:1px solid #e2e8f0;padding:10px;border-radius:4px;font-size:11px;color:#555;margin-bottom:14px"><strong>Notes:</strong> ${q.notes}</div>` : ''}
      ${parsed.revisionNote ? `<div style="border:1px solid #fde68a;background:#fffbeb;padding:10px;border-radius:4px;font-size:11px;color:#92400e;margin-bottom:14px"><strong>Revision note:</strong> ${parsed.revisionNote}</div>` : ''}
      ${parsed.termsConditions ? `<div style="border:1px solid #e2e8f0;padding:10px;border-radius:4px;font-size:11px;margin-bottom:20px"><div style="font-weight:600;margin-bottom:6px">Terms & Conditions</div><div style="white-space:pre-line;color:#555">${parsed.termsConditions}</div></div>` : ''}
      <div style="display:flex;justify-content:space-between;margin-top:30px">
        <div style="text-align:center"><div style="border-top:1px solid #000;width:180px;margin-bottom:4px"></div><div style="font-size:11px">Client signature & stamp</div></div>
        <div style="text-align:center"><div style="border-top:1px solid #000;width:180px;margin-bottom:4px"></div><div style="font-size:11px">Authorised signatory</div><div style="font-size:10px;color:#555">${company.companyName}</div></div>
      </div>
      </body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 400)
  }

  const displayedQuotations = showSuperseded
    ? quotations
    : quotations.filter(q => q.status !== 'expired')

  const totalValue = quotations.filter(q => q.status !== 'expired').reduce((s, q) => s + q.totalAmount, 0)
  const acceptedValue = quotations.filter(q => q.status === 'accepted').reduce((s, q) => s + q.totalAmount, 0)

  const formTitle = mode === 'edit' ? '✏️ Edit quotation' : mode === 'revise' ? '🔄 Revise quotation' : 'Create quotation'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Quotations</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Create, edit and revise client quotations — Indian GST format</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm) }}
          style={{ background: '#1a56db', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          {showForm && mode === 'create' ? '✕ Cancel' : '+ New quotation'}
        </button>
      </div>

      {message.text && (
        <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#16a34a' : '#dc2626', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total quotations', value: String(quotations.filter(q => q.status !== 'expired').length), color: '#0f172a', bg: '#fff' },
          { label: 'Total value', value: formatCurrency(totalValue), color: '#185fa5', bg: '#e6f1fb' },
          { label: 'Accepted value', value: formatCurrency(acceptedValue), color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Conversion rate', value: quotations.filter(q => q.status !== 'expired').length > 0 ? `${Math.round((quotations.filter(q => q.status === 'accepted').length / quotations.filter(q => q.status !== 'expired').length) * 100)}%` : '0%', color: '#854f0b', bg: '#fffbeb' },
        ].map(stat => (
          <div key={stat.label} style={{ background: stat.bg, border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>{stat.label}</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: '#fff', border: `0.5px solid ${mode === 'revise' ? '#fde68a' : '#bfdbfe'}`, borderRadius: '10px', padding: '24px', marginBottom: '20px' }}>

          {/* Form header with mode banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '12px', borderBottom: '0.5px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{formTitle}</div>
              {mode === 'edit' && <div style={{ fontSize: '12px', color: '#185fa5', marginTop: '2px' }}>Editing draft — changes will update the original quotation</div>}
              {mode === 'revise' && <div style={{ fontSize: '12px', color: '#92400e', marginTop: '2px' }}>⚠️ Creating a new revision — original will be marked as superseded</div>}
            </div>
            <button type="button" onClick={() => { resetForm(); setShowForm(false) }} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
          </div>

          {/* Revision note field */}
          {mode === 'revise' && (
            <div style={{ background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
              <label style={{ ...labelStyle, color: '#92400e' }}>Reason for revision *</label>
              <input value={reviseNote} onChange={e => setReviseNote(e.target.value)} placeholder="e.g. Price revised as per client negotiation, Scope updated to include installation..." style={{ ...inputStyle, borderColor: '#fde68a' }} />
              <div style={{ fontSize: '11px', color: '#92400e', marginTop: '4px' }}>This note will appear on the printed quotation so the client knows what changed.</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Client selection */}
            <div style={{ background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <button type="button" onClick={() => setClientMode('existing')}
                  style={{ padding: '6px 14px', border: `0.5px solid ${clientMode === 'existing' ? '#1a56db' : '#e2e8f0'}`, borderRadius: '6px', fontSize: '12px', color: clientMode === 'existing' ? '#1a56db' : '#475569', background: clientMode === 'existing' ? '#eff6ff' : '#fff', cursor: 'pointer', fontWeight: clientMode === 'existing' ? '600' : '400' }}>
                  📋 Select from clients
                </button>
                <button type="button" onClick={() => setClientMode('manual')}
                  style={{ padding: '6px 14px', border: `0.5px solid ${clientMode === 'manual' ? '#1a56db' : '#e2e8f0'}`, borderRadius: '6px', fontSize: '12px', color: clientMode === 'manual' ? '#1a56db' : '#475569', background: clientMode === 'manual' ? '#eff6ff' : '#fff', cursor: 'pointer', fontWeight: clientMode === 'manual' ? '600' : '400' }}>
                  ✏️ Enter manually
                </button>
              </div>
              {clientMode === 'existing' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Select client *</label>
                    <select value={form.selectedClientId} onChange={e => selectClient(e.target.value)} style={inputStyle}>
                      <option value="">— Choose from database —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.companyName} ({c.clientCode})</option>)}
                    </select>
                  </div>
                  {form.clientName && (
                    <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '6px', padding: '10px 12px', fontSize: '12px' }}>
                      <div style={{ fontWeight: '600', color: '#0f172a' }}>{form.clientName}</div>
                      <div style={{ color: '#64748b', marginTop: '2px' }}>{form.clientPhone}{form.clientEmail ? ` · ${form.clientEmail}` : ''}</div>
                      {form.clientGstin && <div style={{ color: '#64748b' }}>GSTIN: {form.clientGstin}</div>}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>Client / company name *</label><input value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))} placeholder="Company or person name" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Phone</label><input value={form.clientPhone} onChange={e => setForm(p => ({ ...p, clientPhone: e.target.value }))} placeholder="Mobile number" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Email</label><input type="email" value={form.clientEmail} onChange={e => setForm(p => ({ ...p, clientEmail: e.target.value }))} placeholder="email@company.com" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Address</label><input value={form.clientAddress} onChange={e => setForm(p => ({ ...p, clientAddress: e.target.value }))} placeholder="Client address" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Client GSTIN</label><input value={form.clientGstin} onChange={e => setForm(p => ({ ...p, clientGstin: e.target.value }))} placeholder="22AAAAA0000A1Z5" style={inputStyle} /></div>
                </div>
              )}
            </div>

            {/* Quotation meta */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div><label style={labelStyle}>Valid until</label><input type="date" value={form.validUntil} onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>Payment terms</label>
                <select value={form.paymentTerms} onChange={e => setForm(p => ({ ...p, paymentTerms: e.target.value }))} style={inputStyle}>
                  {['Immediate', '7 days', '15 days', '30 days', '45 days', '60 days', '100% Advance', '50% Advance 50% on delivery'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Place of supply</label><input value={form.placeOfSupply} onChange={e => setForm(p => ({ ...p, placeOfSupply: e.target.value }))} placeholder="State name" style={inputStyle} /></div>
              <div><label style={labelStyle}>Discount (₹)</label><input type="number" value={form.discount} onChange={e => setForm(p => ({ ...p, discount: e.target.value }))} placeholder="0" style={inputStyle} /></div>
            </div>

            {/* Line items */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ ...labelStyle, marginBottom: 0, fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Line items *</label>
                <button type="button" onClick={() => setLineItems(p => [...p, emptyItem()])} style={{ padding: '4px 12px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '12px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}>+ Add item</button>
              </div>
              <div style={{ border: '0.5px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate (₹)', 'GST %', 'Amount', ''].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr key={i}>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9' }}><input value={item.description} onChange={e => updateLineItem(i, 'description', e.target.value)} placeholder="Service / product" style={{ ...inputStyle, height: '32px', fontSize: '12px' }} /></td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9', width: '90px' }}><input value={item.hsnCode} onChange={e => updateLineItem(i, 'hsnCode', e.target.value)} placeholder="HSN" style={{ ...inputStyle, height: '32px', fontSize: '12px' }} /></td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9', width: '70px' }}><input type="number" value={item.quantity} min="1" onChange={e => updateLineItem(i, 'quantity', e.target.value)} style={{ ...inputStyle, height: '32px', fontSize: '12px', textAlign: 'center' as const }} /></td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9', width: '80px' }}><select value={item.unit} onChange={e => updateLineItem(i, 'unit', e.target.value)} style={{ ...inputStyle, height: '32px', fontSize: '12px' }}>{['nos', 'hrs', 'days', 'kg', 'ltr', 'mtr', 'set', 'job'].map(u => <option key={u}>{u}</option>)}</select></td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9', width: '110px' }}><input type="number" value={item.unitPrice} min="0" onChange={e => updateLineItem(i, 'unitPrice', e.target.value)} placeholder="0.00" style={{ ...inputStyle, height: '32px', fontSize: '12px' }} /></td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9', width: '80px' }}><select value={item.gstPct} onChange={e => updateLineItem(i, 'gstPct', e.target.value)} style={{ ...inputStyle, height: '32px', fontSize: '12px' }}>{['0', '5', '12', '18', '28'].map(g => <option key={g} value={g}>{g}%</option>)}</select></td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#0f172a', width: '100px', whiteSpace: 'nowrap' }}>₹ {item.amount.toLocaleString('en-IN')}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9', width: '30px' }}>{lineItems.length > 1 && <button type="button" onClick={() => setLineItems(p => p.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '16px' }}>✕</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Additional charges + taxes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>➕ Additional charges</div>
                  <button type="button" onClick={() => setAdditionalCharges(p => [...p, { label: '', amount: '' }])} style={{ padding: '3px 8px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '11px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}>+ Add</button>
                </div>
                {additionalCharges.map((c, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 24px', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                    <input value={c.label} onChange={e => setAdditionalCharges(p => p.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} placeholder="Charge label" style={{ ...inputStyle, height: '32px', fontSize: '12px' }} />
                    <input type="number" value={c.amount} onChange={e => setAdditionalCharges(p => p.map((x, idx) => idx === i ? { ...x, amount: e.target.value } : x))} placeholder="₹ 0" style={{ ...inputStyle, height: '32px', fontSize: '12px' }} />
                    <button type="button" onClick={() => setAdditionalCharges(p => p.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>🧾 Additional taxes / deductions</div>
                  <button type="button" onClick={() => setAdditionalTaxes(p => [...p, { label: '', rate: '', amount: 0 }])} style={{ padding: '3px 8px', border: '0.5px solid #fde68a', borderRadius: '5px', fontSize: '11px', color: '#92400e', background: '#fffbeb', cursor: 'pointer' }}>+ Add</button>
                </div>
                {additionalTaxes.map((t, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 24px', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                    <input value={t.label} onChange={e => setAdditionalTaxes(p => p.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} placeholder="Tax label" style={{ ...inputStyle, height: '32px', fontSize: '12px' }} />
                    <input type="number" value={t.rate} onChange={e => setAdditionalTaxes(p => p.map((x, idx) => idx === i ? { ...x, rate: e.target.value } : x))} placeholder="%" style={{ ...inputStyle, height: '32px', fontSize: '12px' }} />
                    <button type="button" onClick={() => setAdditionalTaxes(p => p.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Total summary */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <div style={{ width: '300px', background: '#f0f7ff', border: '0.5px solid #bfdbfe', borderRadius: '10px', padding: '14px 16px' }}>
                {[
                  { label: 'Subtotal', value: formatCurrency(subtotal), color: '#475569' },
                  ...(discount > 0 ? [{ label: 'Discount', value: `- ${formatCurrency(discount)}`, color: '#dc2626' }] : []),
                  { label: 'GST', value: formatCurrency(totalGst), color: '#475569' },
                  ...(totalAdditionalCharges > 0 ? [{ label: 'Additional charges', value: formatCurrency(totalAdditionalCharges), color: '#475569' }] : []),
                  ...(totalAddTax > 0 ? [{ label: 'TDS / deductions', value: `- ${formatCurrency(totalAddTax)}`, color: '#92400e' }] : []),
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: r.color, marginBottom: '6px' }}>
                    <span>{r.label}</span><span>{r.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '700', color: '#1a56db', borderTop: '0.5px solid #bfdbfe', paddingTop: '10px', marginTop: '4px' }}>
                  <span>Grand Total</span><span>{formatCurrency(finalTotal)}</span>
                </div>
              </div>
            </div>

            {/* Notes + T&C */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div><label style={labelStyle}>Notes</label><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Special notes..." rows={3} style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' as const }} /></div>
              <div><label style={labelStyle}>Terms & conditions</label><textarea value={form.termsConditions} onChange={e => setForm(p => ({ ...p, termsConditions: e.target.value }))} rows={3} style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' as const }} /></div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={submitting}
                style={{ padding: '9px 24px', background: submitting ? '#93c5fd' : mode === 'revise' ? '#92400e' : '#1a56db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Saving...' : mode === 'edit' ? '💾 Update quotation' : mode === 'revise' ? '🔄 Create revision' : '💾 Save quotation'}
              </button>
              <button type="button" onClick={() => { resetForm(); setShowForm(false) }} style={{ padding: '9px 20px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Filter + show superseded toggle */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ height: '36px', padding: '0 10px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#475569', background: '#fff', outline: 'none' }}>
          <option value="">All status</option>
          {Object.entries(statusConfig).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', cursor: 'pointer' }}>
          <input type="checkbox" checked={showSuperseded} onChange={e => setShowSuperseded(e.target.checked)} />
          Show superseded revisions
        </label>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Quote no', 'Client', 'Phone', 'Amount', 'Valid until', 'Status', 'Date', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading...</td></tr>
            ) : displayedQuotations.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No quotations yet. Create your first one.</td></tr>
            ) : displayedQuotations.map(q => {
              const status = statusConfig[q.status] || statusConfig.draft
              const isExpired = q.validUntil && new Date(q.validUntil) < new Date() && q.status !== 'accepted'
              const revNo = revisionNumber(q)
              const isSuperseded = q.status === 'expired'
              return (
                <tr key={q.id}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={e => (e.currentTarget.style.background = isSuperseded ? '#fffdf5' : 'transparent')}
                  style={{ background: isSuperseded ? '#fffdf5' : 'transparent', opacity: isSuperseded ? 0.7 : 1 }}
                >
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#1a56db' }}>{q.quotationNo}</div>
                    {revNo && <div style={{ fontSize: '10px', background: '#faeeda', color: '#854f0b', padding: '1px 6px', borderRadius: '4px', marginTop: '2px', display: 'inline-block' }}>Revision {revNo}</div>}
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{q.clientName}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>{q.clientPhone || '—'}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{formatCurrency(q.totalAmount)}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: isExpired ? '#dc2626' : '#64748b', fontWeight: isExpired ? '600' : '400', whiteSpace: 'nowrap' as const }}>
                    {q.validUntil ? formatDate(q.validUntil) : '—'}{isExpired && !isSuperseded ? ' ⚠' : ''}
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <span style={{ background: status.bg, color: status.color, padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>{status.label}</span>
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' as const }}>{formatDate(q.createdAt)}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    {!isSuperseded && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' as const }}>
                        <button onClick={() => printQuotation(q)} style={{ padding: '3px 8px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '10px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}>🖨 Print</button>
                        {q.status === 'draft' && (
                          <>
                            <button onClick={() => loadQuotationIntoForm(q, 'edit')} style={{ padding: '3px 8px', border: '0.5px solid #e2e8f0', borderRadius: '5px', fontSize: '10px', color: '#475569', background: '#f8fafc', cursor: 'pointer' }}>✏️ Edit</button>
                            <button onClick={() => updateStatus(q.id, 'sent')} style={{ padding: '3px 8px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '10px', color: '#185fa5', background: '#e6f1fb', cursor: 'pointer' }}>Send</button>
                          </>
                        )}
                        {(q.status === 'sent' || q.status === 'accepted') && (
                          <button onClick={() => loadQuotationIntoForm(q, 'revise')} style={{ padding: '3px 8px', border: '0.5px solid #fde68a', borderRadius: '5px', fontSize: '10px', color: '#92400e', background: '#fffbeb', cursor: 'pointer' }}>🔄 Revise</button>
                        )}
                        {q.status === 'sent' && (
                          <>
                            <button onClick={() => updateStatus(q.id, 'accepted')} style={{ padding: '3px 8px', border: '0.5px solid #bbf7d0', borderRadius: '5px', fontSize: '10px', color: '#16a34a', background: '#f0fdf4', cursor: 'pointer' }}>Accept</button>
                            <button onClick={() => updateStatus(q.id, 'rejected')} style={{ padding: '3px 8px', border: '0.5px solid #fecaca', borderRadius: '5px', fontSize: '10px', color: '#dc2626', background: '#fef2f2', cursor: 'pointer' }}>Reject</button>
                          </>
                        )}
                        {q.status === 'accepted' && (
                          <button onClick={() => router.push(`/dashboard/finance/invoices/create?clientName=${q.clientName}`)} style={{ padding: '3px 8px', border: '0.5px solid #bbf7d0', borderRadius: '5px', fontSize: '10px', color: '#16a34a', background: '#f0fdf4', cursor: 'pointer' }}>→ Invoice</button>
                        )}
                      </div>
                    )}
                    {isSuperseded && <span style={{ fontSize: '11px', color: '#94a3b8' }}>Superseded</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}