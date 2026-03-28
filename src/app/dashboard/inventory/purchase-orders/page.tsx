'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatDate, formatCurrency } from '@/lib/utils'

type LineItem = {
  itemName: string
  description: string
  qty: number
  unit: string
  rate: number
  gstPct: number
  amount: number
}

type PurchaseOrder = {
  id: string
  poNo: string
  vendorName: string
  vendorId: string
  items: string
  totalAmount: number
  status: string
  expectedDate: string | null
  notes: string | null
  createdAt: string
}

type Vendor = {
  id: string
  companyName: string
  phone: string
  email: string | null
  address: string | null
  gstin: string | null
}

const statusConfig: Record<string, { bg: string; color: string }> = {
  draft:     { bg: '#f1f5f9', color: '#475569' },
  sent:      { bg: '#e6f1fb', color: '#185fa5' },
  confirmed: { bg: '#eeedfe', color: '#534ab7' },
  received:  { bg: '#eaf3de', color: '#3b6d11' },
  cancelled: { bg: '#fef2f2', color: '#dc2626' },
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
  itemName: '', description: '', qty: 1, unit: 'pcs', rate: 0, gstPct: 18, amount: 0,
})

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [viewOrder, setViewOrder] = useState<PurchaseOrder | null>(null)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [company, setCompany] = useState({ companyName: 'Your Company', companyAddress: '', companyPhone: '', companyEmail: '', companyGstin: '' })

  const [form, setForm] = useState({
    vendorId: '',
    deliveryAddress: '',
    paymentTerms: '30 days',
    priority: 'normal',
    shippingCharges: '',
    expectedDate: '',
    notes: '',
    termsConditions: 'Goods once received will not be returned without prior approval. Payment will be made within agreed terms after receipt of invoice.',
  })
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyItem()])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [poRes, vendorsRes, configRes] = await Promise.all([
        fetch('/api/purchase-orders'),
        fetch('/api/vendors?all=true'),
        fetch('/api/settings'),
      ])
      const poData = await poRes.json()
      const vendorsData = await vendorsRes.json()
      const configData = await configRes.json()
      setOrders(poData.orders || [])
      setVendors(vendorsData.vendors || [])
      if (configData.config) setCompany(configData.config)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function showMsg(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    setLineItems(prev => {
      const updated = [...prev]
      const item = { ...updated[index], [field]: typeof value === 'string' && field !== 'itemName' && field !== 'description' && field !== 'unit' ? parseFloat(value) || 0 : value }
      item.amount = (item.qty || 0) * (item.rate || 0)
      updated[index] = item
      return updated
    })
  }

  function addLineItem() { setLineItems(prev => [...prev, emptyItem()]) }
  function removeLineItem(i: number) { setLineItems(prev => prev.filter((_, idx) => idx !== i)) }

  const subtotal = lineItems.reduce((s, i) => s + (i.amount || 0), 0)
  const totalGst = lineItems.reduce((s, i) => s + ((i.amount || 0) * (i.gstPct || 0) / 100), 0)
  const shipping = parseFloat(form.shippingCharges) || 0
  const grandTotal = subtotal + totalGst + shipping

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.vendorId) { showMsg('Please select a vendor', 'error'); return }
    const validItems = lineItems.filter(i => i.itemName.trim())
    if (validItems.length === 0) { showMsg('Please add at least one item', 'error'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: form.vendorId,
          items: JSON.stringify(validItems),
          totalAmount: grandTotal,
          expectedDate: form.expectedDate || null,
          notes: [
            form.notes,
            form.deliveryAddress ? `Delivery: ${form.deliveryAddress}` : '',
            `Payment terms: ${form.paymentTerms}`,
            `Priority: ${form.priority}`,
            form.shippingCharges ? `Shipping: ₹${form.shippingCharges}` : '',
            form.termsConditions ? `T&C: ${form.termsConditions}` : '',
          ].filter(Boolean).join(' | ') || null,
        }),
      })
      if (res.ok) {
        showMsg('Purchase order created successfully!', 'success')
        setForm({ vendorId: '', deliveryAddress: '', paymentTerms: '30 days', priority: 'normal', shippingCharges: '', expectedDate: '', notes: '', termsConditions: 'Goods once received will not be returned without prior approval. Payment will be made within agreed terms after receipt of invoice.' })
        setLineItems([emptyItem()])
        setShowForm(false)
        fetchData()
      } else {
        const data = await res.json()
        showMsg(data.message || 'Failed to create PO', 'error')
      }
    } catch {
      showMsg('Failed to create PO. Please try again.', 'error')
    }
    setSubmitting(false)
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/purchase-orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchData()
  }

  function printPO(order: PurchaseOrder) {
    let parsedItems: LineItem[] = []
    try {
      parsedItems = JSON.parse(order.items)
    } catch {
      parsedItems = [{ itemName: order.items, description: '', qty: 1, unit: 'pcs', rate: order.totalAmount, gstPct: 0, amount: order.totalAmount }]
    }
    const vendor = vendors.find(v => v.id === order.vendorId)
    const sub = parsedItems.reduce((s, i) => s + (i.amount || 0), 0)
    const gst = parsedItems.reduce((s, i) => s + ((i.amount || 0) * (i.gstPct || 0) / 100), 0)

    const w = window.open('', '_blank', 'width=900,height=750')
    if (!w) return
    w.document.write(`
      <html><head><title>PO-${order.poNo}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #000; padding: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { padding: 6px 10px; border: 1px solid #ccc; }
        th { background: #f8fafc; font-weight: 600; }
        .header { text-align: center; margin-bottom: 16px; }
        .blue { color: #1a56db; }
        @page { size: A4; margin: 15mm; }
      </style></head><body>
      <div class="header">
        <div style="font-size:18px;font-weight:700;color:#1a56db">${company.companyName}</div>
        <div style="font-size:11px;color:#555">${company.companyAddress || ''}${company.companyPhone ? ' | Tel: ' + company.companyPhone : ''}${company.companyGstin ? ' | GSTIN: ' + company.companyGstin : ''}</div>
        <div style="font-size:15px;font-weight:700;margin-top:10px;text-decoration:underline">PURCHASE ORDER</div>
      </div>
      <table style="margin-bottom:14px">
        <tr>
          <td style="font-weight:600;background:#f8fafc;width:22%">PO Number</td><td style="width:28%">${order.poNo}</td>
          <td style="font-weight:600;background:#f8fafc;width:22%">Date</td><td>${new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
        </tr>
        <tr>
          <td style="font-weight:600;background:#f8fafc">Vendor</td><td>${order.vendorName}</td>
          <td style="font-weight:600;background:#f8fafc">Expected delivery</td><td>${order.expectedDate ? formatDate(order.expectedDate) : '—'}</td>
        </tr>
        <tr>
          <td style="font-weight:600;background:#f8fafc">Vendor phone</td><td>${vendor?.phone || '—'}</td>
          <td style="font-weight:600;background:#f8fafc">Vendor GSTIN</td><td>${vendor?.gstin || '—'}</td>
        </tr>
        <tr>
          <td style="font-weight:600;background:#f8fafc">Vendor address</td><td colspan="3">${vendor?.address || '—'}</td>
        </tr>
      </table>
      <table style="margin-bottom:14px">
        <thead>
          <tr style="background:#1a56db;color:#fff">
            <th style="width:5%;border-color:#1a56db">Sr</th>
            <th style="border-color:#1a56db">Item name</th>
            <th style="border-color:#1a56db">Description</th>
            <th style="width:8%;border-color:#1a56db">Qty</th>
            <th style="width:8%;border-color:#1a56db">Unit</th>
            <th style="width:10%;border-color:#1a56db">Rate (₹)</th>
            <th style="width:8%;border-color:#1a56db">GST %</th>
            <th style="width:10%;border-color:#1a56db;text-align:right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${parsedItems.map((item, i) => `
            <tr>
              <td style="text-align:center">${i + 1}</td>
              <td style="font-weight:500">${item.itemName}</td>
              <td style="color:#555">${item.description || '—'}</td>
              <td style="text-align:center">${item.qty}</td>
              <td style="text-align:center">${item.unit}</td>
              <td style="text-align:right">${(item.rate || 0).toLocaleString('en-IN')}</td>
              <td style="text-align:center">${item.gstPct || 0}%</td>
              <td style="text-align:right">${(item.amount || 0).toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
        <table style="width:280px">
          <tr><td style="background:#f8fafc;font-weight:600">Subtotal</td><td style="text-align:right">₹ ${sub.toLocaleString('en-IN')}</td></tr>
          <tr><td style="background:#f8fafc;font-weight:600">GST</td><td style="text-align:right">₹ ${gst.toLocaleString('en-IN')}</td></tr>
          <tr style="font-size:14px;font-weight:700;background:#1a56db;color:#fff">
            <td>Grand Total</td><td style="text-align:right">₹ ${order.totalAmount.toLocaleString('en-IN')}</td>
          </tr>
        </table>
      </div>
      ${order.notes ? `<div style="border:1px solid #e2e8f0;padding:10px;border-radius:4px;font-size:11px;color:#555;margin-bottom:14px"><strong>Notes:</strong> ${order.notes}</div>` : ''}
      <div style="margin-top:40px;display:flex;justify-content:space-between">
        <div style="text-align:center"><div style="border-top:1px solid #000;width:160px;margin-bottom:4px"></div><div style="font-size:11px">Vendor acknowledgement</div></div>
        <div style="text-align:center"><div style="border-top:1px solid #000;width:160px;margin-bottom:4px"></div><div style="font-size:11px">Authorised signatory</div><div style="font-size:10px;color:#555">${company.companyName}</div></div>
      </div>
      </body></html>
    `)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 400)
  }

  const selectedVendor = vendors.find(v => v.id === form.vendorId)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Purchase orders</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Create and manage purchase orders for vendors</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ background: '#1a56db', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
        >
          {showForm ? '✕ Cancel' : '+ New PO'}
        </button>
      </div>

      {message.text && (
        <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#16a34a' : '#dc2626', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total POs', value: String(orders.length), color: '#0f172a', bg: '#fff' },
          { label: 'Draft', value: String(orders.filter(o => o.status === 'draft').length), color: '#475569', bg: '#f1f5f9' },
          { label: 'Confirmed', value: String(orders.filter(o => o.status === 'confirmed').length), color: '#534ab7', bg: '#eeedfe' },
          { label: 'Received', value: String(orders.filter(o => o.status === 'received').length), color: '#3b6d11', bg: '#eaf3de' },
          { label: 'Total value', value: formatCurrency(orders.reduce((s, o) => s + o.totalAmount, 0)), color: '#185fa5', bg: '#e6f1fb' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Create PO Form */}
      {showForm && (
        <div style={{ background: '#fff', border: '0.5px solid #bfdbfe', borderRadius: '10px', padding: '24px', marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '20px', paddingBottom: '10px', borderBottom: '0.5px solid #e2e8f0' }}>
            Create purchase order
          </div>
          <form onSubmit={handleSubmit}>

            {/* Vendor + delivery info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Vendor *</label>
                <select value={form.vendorId} onChange={e => setForm(p => ({ ...p, vendorId: e.target.value }))} style={inputStyle}>
                  <option value="">— Select vendor —</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                </select>
                {selectedVendor && (
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                    {selectedVendor.phone}{selectedVendor.gstin ? ` · GSTIN: ${selectedVendor.gstin}` : ''}
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Expected delivery</label>
                <input type="date" value={form.expectedDate} onChange={e => setForm(p => ({ ...p, expectedDate: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Priority</label>
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} style={inputStyle}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Delivery address</label>
                <input value={form.deliveryAddress} onChange={e => setForm(p => ({ ...p, deliveryAddress: e.target.value }))} placeholder="Delivery location" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Payment terms</label>
                <select value={form.paymentTerms} onChange={e => setForm(p => ({ ...p, paymentTerms: e.target.value }))} style={inputStyle}>
                  <option value="immediate">Immediate</option>
                  <option value="7 days">7 days</option>
                  <option value="15 days">15 days</option>
                  <option value="30 days">30 days</option>
                  <option value="45 days">45 days</option>
                  <option value="60 days">60 days</option>
                  <option value="advance">100% Advance</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Shipping charges (₹)</label>
                <input type="number" value={form.shippingCharges} onChange={e => setForm(p => ({ ...p, shippingCharges: e.target.value }))} placeholder="0" style={inputStyle} />
              </div>
            </div>

            {/* Line items */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Line items *</label>
                <button type="button" onClick={addLineItem} style={{ padding: '4px 10px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '11px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}>
                  + Add item
                </button>
              </div>
              <div style={{ border: '0.5px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Item name', 'Description', 'Qty', 'Unit', 'Rate (₹)', 'GST %', 'Amount', ''].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr key={i}>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9' }}>
                          <input value={item.itemName} onChange={e => updateLineItem(i, 'itemName', e.target.value)} placeholder="Item name" style={{ ...inputStyle, height: '32px', fontSize: '12px' }} />
                        </td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9' }}>
                          <input value={item.description} onChange={e => updateLineItem(i, 'description', e.target.value)} placeholder="Optional" style={{ ...inputStyle, height: '32px', fontSize: '12px' }} />
                        </td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9', width: '70px' }}>
                          <input type="number" value={item.qty} min={1} onChange={e => updateLineItem(i, 'qty', e.target.value)} style={{ ...inputStyle, height: '32px', fontSize: '12px', textAlign: 'center' as const }} />
                        </td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9', width: '80px' }}>
                          <select value={item.unit} onChange={e => updateLineItem(i, 'unit', e.target.value)} style={{ ...inputStyle, height: '32px', fontSize: '12px' }}>
                            {['pcs', 'kg', 'ltr', 'mtr', 'set', 'box', 'roll', 'pair'].map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9', width: '100px' }}>
                          <input type="number" value={item.rate} min={0} onChange={e => updateLineItem(i, 'rate', e.target.value)} style={{ ...inputStyle, height: '32px', fontSize: '12px' }} />
                        </td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9', width: '80px' }}>
                          <select value={item.gstPct} onChange={e => updateLineItem(i, 'gstPct', e.target.value)} style={{ ...inputStyle, height: '32px', fontSize: '12px' }}>
                            {[0, 5, 12, 18, 28].map(g => <option key={g} value={g}>{g}%</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#0f172a', width: '100px', whiteSpace: 'nowrap' }}>
                          ₹ {(item.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9', width: '30px' }}>
                          {lineItems.length > 1 && (
                            <button type="button" onClick={() => setLineItems(p => p.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
              <div style={{ width: '260px', background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                {[
                  { label: 'Subtotal', value: formatCurrency(subtotal) },
                  { label: 'GST', value: formatCurrency(totalGst) },
                  { label: 'Shipping', value: formatCurrency(shipping) },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                    <span>{r.label}</span><span>{r.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700', color: '#0f172a', borderTop: '0.5px solid #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                  <span>Grand Total</span><span style={{ color: '#1a56db' }}>{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Notes + T&C */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Notes / special instructions</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any special instructions for vendor..." rows={3}
                  style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' as const }} />
              </div>
              <div>
                <label style={labelStyle}>Terms & conditions</label>
                <textarea value={form.termsConditions} onChange={e => setForm(p => ({ ...p, termsConditions: e.target.value }))} rows={3}
                  style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' as const }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={submitting} style={{ padding: '9px 24px', background: submitting ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Creating...' : '+ Create PO'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 16px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Orders table */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['PO No', 'Vendor', 'Items', 'Amount', 'Expected', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No purchase orders yet. Click + New PO to create one.</td></tr>
            ) : orders.map(order => {
              const sc = statusConfig[order.status] || statusConfig.draft
              let itemCount = 1
              try { itemCount = JSON.parse(order.items).length } catch { /* ignore */ }
              return (
                <tr key={order.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', fontWeight: '600', color: '#1a56db', cursor: 'pointer' }} onClick={() => setViewOrder(order)}>
                    {order.poNo}
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{order.vendorName}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#475569' }}>
                    {itemCount} item{itemCount > 1 ? 's' : ''}
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{formatCurrency(order.totalAmount)}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {order.expectedDate ? formatDate(order.expectedDate) : '—'}
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500', textTransform: 'capitalize' as const }}>
                      {order.status}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button onClick={() => setViewOrder(order)} style={{ padding: '3px 8px', border: '0.5px solid #e2e8f0', borderRadius: '5px', fontSize: '11px', color: '#475569', background: '#f8fafc', cursor: 'pointer' }}>View</button>
                      <button onClick={() => printPO(order)} style={{ padding: '3px 8px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '11px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}>🖨 Print</button>
                      <select
                        onChange={e => { if (e.target.value) updateStatus(order.id, e.target.value) }}
                        defaultValue=""
                        style={{ height: '28px', padding: '0 6px', border: '0.5px solid #e2e8f0', borderRadius: '5px', fontSize: '11px', color: '#475569', background: '#fff', cursor: 'pointer' }}
                      >
                        <option value="">Update status</option>
                        {['draft', 'sent', 'confirmed', 'received', 'cancelled'].map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* View PO Modal */}
      {viewOrder && (() => {
        let parsedItems: LineItem[] = []
        try { parsedItems = JSON.parse(viewOrder.items) } catch { parsedItems = [{ itemName: viewOrder.items, description: '', qty: 1, unit: 'pcs', rate: viewOrder.totalAmount, gstPct: 0, amount: viewOrder.totalAmount }] }
        const sc = statusConfig[viewOrder.status] || statusConfig.draft
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: '#fff', borderRadius: '12px', width: '680px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '18px 24px', borderBottom: '0.5px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>PO — {viewOrder.poNo}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>{viewOrder.vendorName} · {formatDate(viewOrder.createdAt)}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '500', textTransform: 'capitalize' as const }}>{viewOrder.status}</span>
                  <button onClick={() => printPO(viewOrder)} style={{ padding: '5px 12px', border: '0.5px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}>🖨 Print PO</button>
                  <button onClick={() => setViewOrder(null)} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                </div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['#', 'Item', 'Description', 'Qty', 'Unit', 'Rate', 'GST', 'Amount'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedItems.map((item, i) => (
                      <tr key={i}>
                        <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>{i + 1}</td>
                        <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{item.itemName}</td>
                        <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>{item.description || '—'}</td>
                        <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#0f172a' }}>{item.qty}</td>
                        <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>{item.unit}</td>
                        <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#0f172a' }}>{formatCurrency(item.rate || 0)}</td>
                        <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>{item.gstPct || 0}%</td>
                        <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{formatCurrency(item.amount || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ background: '#f0f7ff', border: '0.5px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px', width: '220px', textAlign: 'right' as const }}>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Grand total</div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#1a56db' }}>{formatCurrency(viewOrder.totalAmount)}</div>
                  </div>
                </div>
                {viewOrder.notes && (
                  <div style={{ marginTop: '14px', background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#475569' }}>
                    <strong>Notes:</strong> {viewOrder.notes}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}