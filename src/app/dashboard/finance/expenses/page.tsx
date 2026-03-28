'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatDate, formatCurrency } from '@/lib/utils'

type Expense = {
  id: string
  expenseDate: string
  category: string
  description: string
  amount: number
  paidBy: string | null
  responsiblePerson: string | null
  ownedBy: string | null
  fileUrl: string | null
  reference: string | null
  createdAt: string
}

const CATEGORIES = [
  'Office', 'Site', 'Legal', 'Sales', 'Marketing', 'Tools & Equipment',
  'Debts', 'Rent', 'Bills & Utilities', 'Employee', 'Bonus',
  'Emergency', 'Miscellaneous', 'Disaster Management', 'Procurement',
  'Travel', 'Fuel', 'Repairs', 'Other',
]

const catColors: Record<string, { bg: string; color: string }> = {
  'Office': { bg: '#e6f1fb', color: '#185fa5' },
  'Site': { bg: '#faeeda', color: '#854f0b' },
  'Legal': { bg: '#eeedfe', color: '#534ab7' },
  'Sales': { bg: '#e1f5ee', color: '#0f6e56' },
  'Marketing': { bg: '#fbeaf0', color: '#993556' },
  'Tools & Equipment': { bg: '#f1efe8', color: '#5f5e5a' },
  'Debts': { bg: '#fcebeb', color: '#a32d2d' },
  'Rent': { bg: '#fbeaf0', color: '#993556' },
  'Bills & Utilities': { bg: '#faeeda', color: '#854f0b' },
  'Employee': { bg: '#eaf3de', color: '#3b6d11' },
  'Bonus': { bg: '#e1f5ee', color: '#0f6e56' },
  'Emergency': { bg: '#fcebeb', color: '#a32d2d' },
  'Miscellaneous': { bg: '#f1f5f9', color: '#475569' },
  'Disaster Management': { bg: '#fcebeb', color: '#a32d2d' },
  'Procurement': { bg: '#e6f1fb', color: '#185fa5' },
  'Travel': { bg: '#e6f1fb', color: '#185fa5' },
  'Fuel': { bg: '#faeeda', color: '#854f0b' },
  'Repairs': { bg: '#f1efe8', color: '#5f5e5a' },
  'Other': { bg: '#f1f5f9', color: '#475569' },
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

const fileLinkStyle = {
  color: '#1a56db',
  textDecoration: 'none' as const,
  fontSize: '11px',
  background: '#eff6ff',
  padding: '2px 8px',
  borderRadius: '5px',
  border: '0.5px solid #bfdbfe',
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<'expenseDate' | 'amount'>('expenseDate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [summary, setSummary] = useState({
    total: 0,
    thisMonth: 0,
    byCategory: {} as Record<string, number>,
  })
  const [form, setForm] = useState({
    expenseDate: new Date().toISOString().slice(0, 10),
    category: 'Office',
    description: '',
    amount: '',
    paidBy: '',
    responsiblePerson: '',
    ownedBy: 'company',
    reference: '',
    fileUrl: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (categoryFilter) params.set('category', categoryFilter)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    if (search) params.set('search', search)
    const res = await fetch(`/api/expenses?${params}`)
    const data = await res.json()
    const list: Expense[] = data.expenses || []
    setExpenses(list)
    const now = new Date()
    const thisMonthList = list.filter(e => {
      const d = new Date(e.expenseDate)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const byCategory: Record<string, number> = {}
    list.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
    })
    setSummary({
      total: list.reduce((s, e) => s + e.amount, 0),
      thisMonth: thisMonthList.reduce((s, e) => s + e.amount, 0),
      byCategory,
    })
    setLoading(false)
  }, [categoryFilter, dateFrom, dateTo, search])

  useEffect(() => { fetchData() }, [fetchData])

  function showMsg(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description || !form.amount) {
      showMsg('Please fill all required fields', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        showMsg('Expense recorded successfully!', 'success')
        setForm({
          expenseDate: new Date().toISOString().slice(0, 10),
          category: 'Office',
          description: '',
          amount: '',
          paidBy: '',
          responsiblePerson: '',
          ownedBy: 'company',
          reference: '',
          fileUrl: '',
        })
        fetchData()
      }
    } catch {
      showMsg('Failed to record expense', 'error')
    }
    setSubmitting(false)
  }

  const sorted = [...expenses].sort((a, b) => {
    const va = sortField === 'amount' ? a.amount : new Date(a.expenseDate).getTime()
    const vb = sortField === 'amount' ? b.amount : new Date(b.expenseDate).getTime()
    return sortDir === 'asc' ? va - vb : vb - va
  })

  function toggleSort(field: 'expenseDate' | 'amount') {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Expenses</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          Track and categorise all company expenses
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total expenses', value: formatCurrency(summary.total), color: '#dc2626', bg: '#fef2f2' },
          { label: 'This month', value: formatCurrency(summary.thisMonth), color: '#854f0b', bg: '#fffbeb' },
          { label: 'Categories used', value: String(Object.keys(summary.byCategory).length), color: '#185fa5', bg: '#e6f1fb' },
          { label: 'Total records', value: String(expenses.length), color: '#0f172a', bg: '#fff' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '16px' }}>

        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '18px', height: 'fit-content' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '14px', paddingBottom: '8px', borderBottom: '0.5px solid #e2e8f0' }}>
            Add expense
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={labelStyle}>Date *</label>
                <input
                  type="date"
                  value={form.expenseDate}
                  onChange={e => setForm(p => ({ ...p, expenseDate: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Amount (₹) *</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Category *</label>
              <select
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                style={inputStyle}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Description *</label>
              <input
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="What was this expense for?"
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={labelStyle}>Paid by</label>
                <input
                  value={form.paidBy}
                  onChange={e => setForm(p => ({ ...p, paidBy: e.target.value }))}
                  placeholder="Person who paid"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Responsible person</label>
                <input
                  value={form.responsiblePerson}
                  onChange={e => setForm(p => ({ ...p, responsiblePerson: e.target.value }))}
                  placeholder="Who owns this?"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Owned by</label>
              <select
                value={form.ownedBy}
                onChange={e => setForm(p => ({ ...p, ownedBy: e.target.value }))}
                style={inputStyle}
              >
                <option value="company">Company</option>
                <option value="personal">Personal (reimbursable)</option>
                <option value="client">Client (billable)</option>
              </select>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Reference / bill no.</label>
              <input
                value={form.reference}
                onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
                placeholder="Bill or receipt number"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>File URL (receipt / invoice)</label>
              <input
                value={form.fileUrl}
                onChange={e => setForm(p => ({ ...p, fileUrl: e.target.value }))}
                placeholder="Paste Google Drive / Dropbox link"
                style={inputStyle}
              />
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                Upload file to Drive then paste the link here
              </div>
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
              {submitting ? 'Saving...' : '+ Add expense'}
            </button>
          </form>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <input
              placeholder="Search description, person..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, flex: 1, minWidth: '160px' }}
            />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              style={{ ...inputStyle, width: 'auto' }}
            >
              <option value="">All categories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={{ ...inputStyle, width: '140px' }}
              title="From date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={{ ...inputStyle, width: '140px' }}
              title="To date"
            />
            {(search || categoryFilter || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setSearch('')
                  setCategoryFilter('')
                  setDateFrom('')
                  setDateTo('')
                }}
                style={{
                  height: '36px', padding: '0 12px',
                  border: '0.5px solid #e2e8f0', borderRadius: '6px',
                  fontSize: '12px', color: '#64748b', background: '#f8f9fb', cursor: 'pointer',
                }}
              >
                Clear
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th
                    onClick={() => toggleSort('expenseDate')}
                    style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Date {sortField === 'expenseDate' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                  </th>
                  <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                    Category
                  </th>
                  <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Description
                  </th>
                  <th
                    onClick={() => toggleSort('amount')}
                    style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Amount {sortField === 'amount' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                  </th>
                  <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                    Paid by
                  </th>
                  <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                    Responsible
                  </th>
                  <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                    Owned by
                  </th>
                  <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    File
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      Loading...
                    </td>
                  </tr>
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      No expenses found
                    </td>
                  </tr>
                ) : sorted.map(exp => {
                  const cat = catColors[exp.category] || catColors['Other']
                  const ownedColor = exp.ownedBy === 'company'
                    ? { bg: '#e6f1fb', color: '#185fa5' }
                    : exp.ownedBy === 'personal'
                    ? { bg: '#faeeda', color: '#854f0b' }
                    : { bg: '#eaf3de', color: '#3b6d11' }
                  return (
                    <tr
                      key={exp.id}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatDate(exp.expenseDate)}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <span style={{ background: cat.bg, color: cat.color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>
                          {exp.category}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#0f172a' }}>
                        {exp.description}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#dc2626' }}>
                        {formatCurrency(exp.amount)}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>
                        {exp.paidBy || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>
                        {exp.responsiblePerson || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        {exp.ownedBy ? (
                          <span style={{ background: ownedColor.bg, color: ownedColor.color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>
                            {exp.ownedBy.charAt(0).toUpperCase() + exp.ownedBy.slice(1)}
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px' }}>
                        {exp.fileUrl ? (
                          <a href={exp.fileUrl} target="_blank" rel="noreferrer" style={fileLinkStyle}>
                            View file
                          </a>
                        ) : (
                          <span style={{ color: '#64748b' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {sorted.length > 0 && (
            <div style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '0.5px solid #e2e8f0', marginTop: '8px' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {sorted.length} records shown
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#dc2626' }}>
                Total: {formatCurrency(sorted.reduce((s, e) => s + e.amount, 0))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}