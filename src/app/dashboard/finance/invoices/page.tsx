'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'

type Invoice = {
  id: string
  invoiceNo: string
  invoiceDate: string
  status: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  additionalTax: number
  totalAmount: number
  dueDate: string | null
  paidAt: string | null
  client: { companyName: string }
  job: { jobNo: string } | null
  payments: { amount: number }[]
}

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  unpaid: { bg: '#fcebeb', color: '#a32d2d', label: 'Unpaid' },
  paid: { bg: '#eaf3de', color: '#3b6d11', label: 'Paid' },
  partial: { bg: '#faeeda', color: '#854f0b', label: 'Partial' },
  overdue: { bg: '#fbeaf0', color: '#993556', label: 'Overdue' },
  cancelled: { bg: '#f1efe8', color: '#5f5e5a', label: 'Cancelled' },
}

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [summary, setSummary] = useState({
    totalAmount: 0, paidAmount: 0, unpaidAmount: 0,
    overdueAmount: 0, totalDues: 0,
  })
  const limit = 10

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page), limit: String(limit),
      ...(search && { search }),
      ...(statusFilter && { status: statusFilter }),
    })
    const res = await fetch(`/api/invoices?${params}`)
    const data = await res.json()
    setInvoices(data.invoices || [])
    setTotal(data.total || 0)
    setSummary(data.summary || { totalAmount: 0, paidAmount: 0, unpaidAmount: 0, overdueAmount: 0, totalDues: 0 })
    setLoading(false)
  }, [page, search, statusFilter])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const totalPages = Math.ceil(total / limit)

  const getPaid = (inv: Invoice) => inv.payments.reduce((s, p) => s + p.amount, 0)
  const getRemaining = (inv: Invoice) => Math.max(0, inv.totalAmount - getPaid(inv))

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Invoices</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Generate and manage all client invoices</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/finance/invoices/create')}
          style={{ background: '#1a56db', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
        >
          + New invoice
        </button>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Total invoiced', value: formatCurrency(summary.totalAmount), color: '#0f172a', bg: '#fff' },
          { label: 'Paid', value: formatCurrency(summary.paidAmount), color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Unpaid / partial', value: formatCurrency(summary.unpaidAmount), color: '#dc2626', bg: '#fef2f2' },
          { label: 'Overdue', value: formatCurrency(summary.overdueAmount), color: '#993556', bg: '#fbeaf0' },
          { label: 'Total dues', value: formatCurrency(summary.totalDues), color: '#a32d2d', bg: '#fcebeb' },
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>{card.label}</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', display: 'flex', gap: '10px' }}>
        <input
          placeholder="Search invoice no, client..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ flex: 1, height: '36px', padding: '0 12px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          style={{ height: '36px', padding: '0 10px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#475569', background: '#fff', outline: 'none', cursor: 'pointer' }}
        >
          <option value="">All status</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setPage(1) }} style={{ height: '36px', padding: '0 12px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#64748b', background: '#f8f9fb', cursor: 'pointer' }}>Clear</button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Invoice no', 'Date', 'Client', 'Job', 'Total', 'Paid', 'Remaining', 'Due date', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading invoices...</td></tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  No invoices found.{' '}
                  <span onClick={() => router.push('/dashboard/finance/invoices/create')} style={{ color: '#1a56db', cursor: 'pointer' }}>Create your first invoice →</span>
                </td>
              </tr>
            ) : (
              invoices.map(inv => {
                const status = statusConfig[inv.status] || statusConfig.unpaid
                const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== 'paid'
                const paid = getPaid(inv)
                const remaining = getRemaining(inv)
                return (
                  <tr key={inv.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#1a56db' }}>{inv.invoiceNo}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(inv.invoiceDate)}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#0f172a' }}>{inv.client.companyName}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>{inv.job?.jobNo || '—'}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{formatCurrency(inv.totalAmount)}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#16a34a', fontWeight: '500' }}>
                      {paid > 0 ? formatCurrency(paid) : '—'}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: remaining > 0 ? '600' : '400', color: remaining > 0 ? '#dc2626' : '#64748b' }}>
                      {remaining > 0 ? formatCurrency(remaining) : '✓ Cleared'}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: isOverdue ? '#dc2626' : '#64748b', whiteSpace: 'nowrap' }}>
                      {inv.dueDate ? formatDate(inv.dueDate) : '—'}
                      {isOverdue && <span style={{ marginLeft: '4px' }}>⚠</span>}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                      <span style={{ background: status.bg, color: status.color, padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => router.push(`/dashboard/finance/invoices/${inv.id}`)}
                          style={{ padding: '4px 10px', border: '0.5px solid #e2e8f0', borderRadius: '5px', fontSize: '11px', color: '#475569', background: '#f8fafc', cursor: 'pointer' }}
                        >
                          View
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/finance/invoices/${inv.id}/print`)}
                          style={{ padding: '4px 10px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '11px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}
                        >
                          Print
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '0.5px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} invoices</div>
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