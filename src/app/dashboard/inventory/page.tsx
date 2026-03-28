'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

type InventoryItem = {
  id: string
  itemCode: string
  itemName: string
  category: string | null
  unit: string
  currentStock: number
  minStock: number
  unitPrice: number
  isActive: boolean
  _count: { transactions: number }
}

export default function InventoryListPage() {
  const router = useRouter()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const limit = 10

  const [form, setForm] = useState({
    itemName: '', category: '', unit: 'pcs',
    currentStock: '', minStock: '', unitPrice: '',
  })

  const categories = ['Bearings', 'Belts', 'Electrical', 'Hydraulic', 'Mechanical', 'Tools', 'Consumables', 'Electronic', 'Other']

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page), limit: String(limit),
      ...(search && { search }),
      ...(categoryFilter && { category: categoryFilter }),
      ...(showLowStock && { lowStock: 'true' }),
    })
    const res = await fetch(`/api/inventory?${params}`)
    const data = await res.json()
    setItems(data.items || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [page, search, categoryFilter, showLowStock])

  useEffect(() => { fetchItems() }, [fetchItems])

  function showMessage(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        showMessage('Item added!', 'success')
        setForm({ itemName: '', category: '', unit: 'pcs', currentStock: '', minStock: '', unitPrice: '' })
        setShowAddForm(false)
        fetchItems()
      }
    } catch {
      showMessage('Failed to add item', 'error')
    }
    setSubmitting(false)
  }

  const lowStockCount = items.filter(i => i.currentStock <= i.minStock).length
  const totalValue = items.reduce((s, i) => s + (i.currentStock * i.unitPrice), 0)
  const totalPages = Math.ceil(total / limit)

  const inputStyle = {
    width: '100%', height: '34px', padding: '0 10px',
    border: '0.5px solid #e2e8f0', borderRadius: '6px',
    fontSize: '13px', outline: 'none', background: '#fff',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Inventory</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Track stock levels and manage spare parts</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            background: '#1a56db', color: '#fff', border: 'none',
            padding: '9px 16px', borderRadius: '8px', fontSize: '13px',
            fontWeight: '500', cursor: 'pointer',
          }}
        >
          + Add item
        </button>
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

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Total items', value: String(total), color: '#0f172a', bg: '#fff' },
          { label: 'Low stock alerts', value: String(lowStockCount), color: lowStockCount > 0 ? '#dc2626' : '#16a34a', bg: lowStockCount > 0 ? '#fef2f2' : '#f0fdf4' },
          { label: 'Total stock value', value: formatCurrency(totalValue), color: '#185fa5', bg: '#e6f1fb' },
          { label: 'Categories', value: String(new Set(items.map(i => i.category).filter(Boolean)).size), color: '#854f0b', bg: '#fffbeb' },
        ].map(stat => (
          <div key={stat.label} style={{ background: stat.bg, border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{stat.label}</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: stat.color, marginTop: '4px' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <div style={{ background: '#fff', border: '0.5px solid #bfdbfe', borderRadius: '10px', padding: '18px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '14px' }}>Add new inventory item</div>
          <form onSubmit={handleAddItem}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>Item name *</label>
                <input value={form.itemName} onChange={e => setForm(p => ({ ...p, itemName: e.target.value }))} placeholder="e.g. Bearing 6205" required style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
                  <option value="">-- Select --</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>Unit</label>
                <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} style={inputStyle}>
                  {['pcs', 'kg', 'ltr', 'mtr', 'set', 'box', 'roll'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>Current stock</label>
                <input type="number" value={form.currentStock} onChange={e => setForm(p => ({ ...p, currentStock: e.target.value }))} placeholder="0" min="0" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>Min stock (alert level)</label>
                <input type="number" value={form.minStock} onChange={e => setForm(p => ({ ...p, minStock: e.target.value }))} placeholder="0" min="0" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>Unit price (₹)</label>
                <input type="number" value={form.unitPrice} onChange={e => setForm(p => ({ ...p, unitPrice: e.target.value }))} placeholder="0.00" min="0" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={submitting} style={{
                padding: '8px 16px', background: '#1a56db', color: '#fff',
                border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              }}>
                {submitting ? 'Saving...' : '+ Save item'}
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} style={{
                padding: '8px 16px', border: '0.5px solid #e2e8f0',
                borderRadius: '7px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer',
              }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search items..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ flex: 1, minWidth: '200px', height: '36px', padding: '0 12px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
        />
        <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1) }} style={{ height: '36px', padding: '0 10px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#475569', background: '#fff', outline: 'none' }}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}>
          <input type="checkbox" checked={showLowStock} onChange={e => setShowLowStock(e.target.checked)} />
          Low stock only
        </label>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Code', 'Item name', 'Category', 'Unit', 'Stock', 'Min stock', 'Unit price', 'Stock value', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No items found. Add your first item.</td></tr>
            ) : items.map(item => {
              const isLow = item.currentStock <= item.minStock
              return (
                <tr key={item.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = isLow ? '#fff9f9' : 'transparent')}
                  style={{ background: isLow ? '#fff9f9' : 'transparent', transition: 'background 0.1s' }}>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{item.itemCode}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{item.itemName}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    {item.category && <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>{item.category}</span>}
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>{item.unit}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '14px', fontWeight: '600', color: isLow ? '#dc2626' : '#0f172a' }}>
                    {item.currentStock} {isLow && '⚠'}
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#64748b' }}>{item.minStock}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#475569' }}>{formatCurrency(item.unitPrice)}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{formatCurrency(item.currentStock * item.unitPrice)}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <span style={{ background: isLow ? '#fef2f2' : '#eaf3de', color: isLow ? '#dc2626' : '#3b6d11', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>
                      {isLow ? 'Low stock' : 'In stock'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '0.5px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} items</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '5px 12px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: page === 1 ? '#cbd5e1' : '#475569', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '5px 12px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: page === totalPages ? '#cbd5e1' : '#475569', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
