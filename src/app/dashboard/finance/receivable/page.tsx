'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'

type ReceivableItem = {
  id: string
  invoiceNo: string
  invoiceDate: string
  dueDate: string | null
  totalAmount: number
  paidAmount: number
  status: string
  client: { id: string; companyName: string; phone: string }
}

export default function AccountsReceivablePage() {
  const router = useRouter()
  const [items, setItems] = useState<ReceivableItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [summary, setSummary] = useState({
    total: 0, overdue: 0, dueSoon: 0, collected: 0
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/invoices?limit=200')
    const data = await res.json()
    const invoices = data.invoices || []

    const enriched = invoices.map((inv: ReceivableItem & {
      payments: { amount: number }[]
    }) => ({
      ...inv,
      paidAmount: inv.payments?.reduce((s: number, p: { amount: number }) => s + p.amount, 0) || 0,
    }))

    setItems(enriched)

    const now = new Date()
    const soon = new Date()
    soon.setDate(soon.getDate() + 7)

    setSummary({
      total: enriched.filter((i: ReceivableItem) => i.status !== 'paid').reduce((s: number, i: ReceivableItem) => s + (i.totalAmount - i.paidAmount), 0),
      overdue: enriched.filter((i: ReceivableItem) => i.dueDate && new Date(i.dueDate) < now && i.status !== 'paid').reduce((s: number, i: ReceivableItem) => s + (i.totalAmount - i.paidAmount), 0),
      dueSoon: enriched.filter((i: ReceivableItem) => i.dueDate && new Date(i.dueDate) >= now && new Date(i.dueDate) <= soon && i.status !== 'paid').reduce((s: number, i: ReceivableItem) => s + (i.totalAmount - i.paidAmount), 0),
      collected: data.summary?.paidAmount || 0,
    })

    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const now = new Date()
  const soon = new Date()
  soon.setDate(soon.getDate() + 7)

  const filtered = items.filter(item => {
    if (filter === 'overdue') return item.dueDate && new Date(item.dueDate) < now && item.status !== 'paid'
    if (filter === 'due_soon') return item.dueDate && new Date(item.dueDate) >= now && new Date(item.dueDate) <= soon && item.status !== 'paid'
    if (filter === 'unpaid') return item.status === 'unpaid'
    if (filter === 'partial') return item.status === 'partial'
    if (filter === 'paid') return item.status === 'paid'
    return true
  })

  const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
    unpaid: { bg: '#fcebeb', color: '#a32d2d', label: 'Unpaid' },
    paid: { bg: '#eaf3de', color: '#3b6d11', label: 'Paid' },
    partial: { bg: '#faeeda', color: '#854f0b', label: 'Partial' },
    overdue: { bg: '#fbeaf0', color: '#993556', label: 'Overdue' },
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Accounts receivable</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          Track all outstanding amounts due from clients
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '16px',
      }}>
        {[
          { label: 'Total outstanding', value: formatCurrency(summary.total), color: '#dc2626', bg: '#fef2f2', filter: 'unpaid' },
          { label: 'Overdue', value: formatCurrency(summary.overdue), color: '#993556', bg: '#fbeaf0', filter: 'overdue' },
          { label: 'Due in 7 days', value: formatCurrency(summary.dueSoon), color: '#854f0b', bg: '#faeeda', filter: 'due_soon' },
          { label: 'Total collected', value: formatCurrency(summary.collected), color: '#16a34a', bg: '#f0fdf4', filter: 'paid' },
        ].map(card => (
          <div
            key={card.label}
            onClick={() => setFilter(filter === card.filter ? 'all' : card.filter)}
            style={{
              background: card.bg,
              border: `0.5px solid ${filter === card.filter ? card.color : '#e2e8f0'}`,
              borderRadius: '10px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: card.color }}>
              {card.value}
            </div>
            {filter === card.filter && (
              <div style={{ fontSize: '10px', color: card.color, marginTop: '4px' }}>Filtered ✓</div>
            )}
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '12px',
      }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'overdue', label: 'Overdue' },
          { key: 'due_soon', label: 'Due soon' },
          { key: 'unpaid', label: 'Unpaid' },
          { key: 'partial', label: 'Partial' },
          { key: 'paid', label: 'Paid' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '6px 14px',
              border: '0.5px solid',
              borderColor: filter === tab.key ? '#1a56db' : '#e2e8f0',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: filter === tab.key ? '600' : '400',
              color: filter === tab.key ? '#1a56db' : '#475569',
              background: filter === tab.key ? '#eff6ff' : '#fff',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{
        background: '#fff',
        border: '0.5px solid #e2e8f0',
        borderRadius: '10px',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Invoice', 'Client', 'Phone', 'Invoice date', 'Due date', 'Total', 'Paid', 'Balance', 'Status', 'Action'].map(h => (
                <th key={h} style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#64748b',
                  borderBottom: '0.5px solid #e2e8f0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  whiteSpace: 'nowrap',
                }}>
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
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  No records found
                </td>
              </tr>
            ) : (
              filtered.map(item => {
                const isOverdue = item.dueDate && new Date(item.dueDate) < now && item.status !== 'paid'
                const balance = item.totalAmount - item.paidAmount
                const status = statusConfig[item.status] || statusConfig.unpaid
                return (
                  <tr
                    key={item.id}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = isOverdue ? '#fff9f9' : 'transparent')}
                    style={{
                      background: isOverdue ? '#fff9f9' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', fontWeight: '600', color: '#1a56db' }}>
                      {item.invoiceNo}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>
                      {item.client.companyName}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>
                      {item.client.phone}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatDate(item.invoiceDate)}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: isOverdue ? '#dc2626' : '#64748b', fontWeight: isOverdue ? '600' : '400', whiteSpace: 'nowrap' }}>
                      {item.dueDate ? formatDate(item.dueDate) : '—'}
                      {isOverdue && ' ⚠'}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#475569' }}>
                      {formatCurrency(item.totalAmount)}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#16a34a' }}>
                      {formatCurrency(item.paidAmount)}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: balance > 0 ? '#dc2626' : '#16a34a' }}>
                      {formatCurrency(balance)}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                      <span style={{
                        background: status.bg,
                        color: status.color,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '500',
                      }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                      {item.status !== 'paid' && (
                        <button
                          onClick={() => router.push(`/dashboard/finance/payments?invoiceId=${item.id}`)}
                          style={{
                            padding: '4px 10px',
                            border: '0.5px solid #bbf7d0',
                            borderRadius: '5px',
                            fontSize: '11px',
                            color: '#16a34a',
                            background: '#f0fdf4',
                            cursor: 'pointer',
                          }}
                        >
                          Collect
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
