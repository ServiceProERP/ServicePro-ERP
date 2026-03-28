'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'

type Transaction = {
  id: string
  type: string
  quantity: number
  reference: string | null
  notes: string | null
  createdAt: string
  item: { itemName: string; itemCode: string; unit: string }
}

type InventoryItem = { id: string; itemName: string; itemCode: string; unit: string; currentStock: number }

const inputStyle = {
  width: '100%', height: '36px', padding: '0 10px',
  border: '0.5px solid #e2e8f0', borderRadius: '6px',
  fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a',
}

export default function StockTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [form, setForm] = useState({ itemId: '', type: 'in', quantity: '', reference: '', notes: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [txRes, itemsRes] = await Promise.all([
      fetch('/api/stock-transactions'),
      fetch('/api/inventory?limit=100'),
    ])
    const txData = await txRes.json()
    const itemsData = await itemsRes.json()
    setTransactions(txData.transactions || [])
    setInventoryItems(itemsData.items || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function showMessage(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.itemId || !form.quantity) {
      showMessage('Please fill all required fields', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/stock-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        showMessage(`Stock ${form.type === 'in' ? 'added' : 'removed'} successfully!`, 'success')
        setForm({ itemId: '', type: 'in', quantity: '', reference: '', notes: '' })
        fetchData()
      } else {
        const data = await res.json()
        showMessage(data.message || 'Failed', 'error')
      }
    } catch {
      showMessage('Something went wrong', 'error')
    }
    setSubmitting(false)
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Stock transactions</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Record stock in and stock out movements</p>
      </div>

      {message.text && (
        <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#16a34a' : '#dc2626', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '16px' }}>

        {/* Form */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '18px', height: 'fit-content' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '14px', paddingBottom: '8px', borderBottom: '0.5px solid #e2e8f0' }}>
            Record transaction
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>Transaction type *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { value: 'in', label: '📥 Stock In', bg: form.type === 'in' ? '#f0fdf4' : '#fff', border: form.type === 'in' ? '#16a34a' : '#e2e8f0', color: form.type === 'in' ? '#16a34a' : '#475569' },
                  { value: 'out', label: '📤 Stock Out', bg: form.type === 'out' ? '#fef2f2' : '#fff', border: form.type === 'out' ? '#dc2626' : '#e2e8f0', color: form.type === 'out' ? '#dc2626' : '#475569' },
                ].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setForm(p => ({ ...p, type: opt.value }))}
                    style={{ padding: '8px', border: `0.5px solid ${opt.border}`, borderRadius: '6px', fontSize: '12px', fontWeight: '500', color: opt.color, background: opt.bg, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>Item *</label>
              <select value={form.itemId} onChange={e => setForm(p => ({ ...p, itemId: e.target.value }))} style={inputStyle}>
                <option value="">-- Select item --</option>
                {inventoryItems.map(i => <option key={i.id} value={i.id}>{i.itemName} (Stock: {i.currentStock} {i.unit})</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>Quantity *</label>
              <input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} placeholder="0" min="1" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>Reference</label>
              <input value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} placeholder="PO number or job number" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Reason for transaction..." rows={2}
                style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' as const }} />
            </div>
            <button type="submit" disabled={submitting} style={{ width: '100%', padding: '9px', background: form.type === 'in' ? '#16a34a' : '#dc2626', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              {submitting ? 'Saving...' : form.type === 'in' ? '📥 Record stock in' : '📤 Record stock out'}
            </button>
          </form>
        </div>

        {/* Transactions Table */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '14px' }}>Transaction history</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Date', 'Item', 'Type', 'Qty', 'Reference', 'Notes'].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No transactions yet</td></tr>
              ) : transactions.map(tx => (
                <tr key={tx.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(tx.createdAt)}</td>
                  <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>
                    {tx.item.itemName}
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>{tx.item.itemCode}</div>
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <span style={{ background: tx.type === 'in' ? '#eaf3de' : '#fef2f2', color: tx.type === 'in' ? '#3b6d11' : '#dc2626', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600' }}>
                      {tx.type === 'in' ? '↑ IN' : '↓ OUT'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '14px', fontWeight: '600', color: tx.type === 'in' ? '#16a34a' : '#dc2626' }}>
                    {tx.type === 'in' ? '+' : '-'}{tx.quantity} {tx.item.unit}
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>{tx.reference || '—'}</td>
                  <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>{tx.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
