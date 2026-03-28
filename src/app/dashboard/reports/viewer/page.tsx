'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'

const reportMeta: Record<string, { name: string; description: string; icon: string }> = {
  'okr-report':              { name: 'OKR dashboard', description: 'Monthly business KPIs and objectives', icon: '🎯' },
  'technician-performance':  { name: 'Technician performance', description: 'Scoring and grading per technician', icon: '👷' },
  'jobs-overdue':            { name: 'Overdue jobs', description: 'Jobs past deadline — severity and amount at risk', icon: '⚠️' },
  'work-orders-summary':     { name: 'Work orders summary', description: 'All work orders by status', icon: '🔧' },
  'jobs-summary':            { name: 'Jobs summary', description: 'All jobs by status, priority and technician', icon: '📋' },
  'payment-history':         { name: 'Payment history', description: 'All payments received', icon: '💳' },
  'expense-report':          { name: 'Expense report', description: 'Company expenses by category', icon: '🧾' },
  'refunds-report':          { name: 'Refunds report', description: 'All refunds with status and approval', icon: '↩️' },
  'revenue-summary':         { name: 'Revenue summary', description: 'Invoiced, collected and outstanding', icon: '💰' },
  'invoice-aging':           { name: 'Invoice aging', description: 'Outstanding invoices by age bucket', icon: '📅' },
  'stock-summary':           { name: 'Stock summary', description: 'Current stock levels and value', icon: '📦' },
  'spare-parts-usage':       { name: 'Spare parts usage', description: 'Most used parts across jobs', icon: '⚙️' },
  'stock-movement':          { name: 'Stock movement', description: 'All stock in/out transactions', icon: '🔄' },
  'payroll-summary':         { name: 'Payroll summary', description: 'Monthly payroll by employee', icon: '💵' },
  'workforce-summary':       { name: 'Workforce summary', description: 'Employees by department', icon: '👥' },
  'top-clients':             { name: 'Top clients by revenue', description: 'Clients ranked by billed amount', icon: '🏆' },
  'client-jobs':             { name: 'Client job history', description: 'All jobs per client', icon: '📁' },
}

// Columns that should be formatted as currency
const currencyCols = ['amount', 'revenue', 'salary', 'value', 'total', 'paid', 'balance', 'outstanding',
  'invoiced', 'collected', 'net', 'basic', 'allowances', 'deductions', 'gross', 'expenses',
  'refund', 'profit', 'estimated', 'stock_value', 'unit_price', 'avg_payment', 'reimbursable',
  'total_at_risk', 'total_value', 'company_expenses', 'pf_contribution', 'esic']

function isCurrencyCol(col: string) {
  return currencyCols.some(c => col.toLowerCase().includes(c))
}

function isDateCol(col: string) {
  return col.toLowerCase().includes('date') || col.toLowerCase() === 'period'
}

function getGradeColor(grade: string) {
  return grade === 'A' ? { bg: '#eaf3de', color: '#3b6d11' }
    : grade === 'B' ? { bg: '#e6f1fb', color: '#185fa5' }
    : grade === 'C' ? { bg: '#faeeda', color: '#854f0b' }
    : { bg: '#fef2f2', color: '#dc2626' }
}

function getStatusColor(status: string) {
  const s = String(status).toLowerCase()
  if (s.includes('✅') || s.includes('ok') || s.includes('active') || s.includes('paid') || s.includes('profitable')) return '#16a34a'
  if (s.includes('⚠️') || s.includes('at risk') || s.includes('monitor') || s.includes('low')) return '#92400e'
  if (s.includes('❌') || s.includes('behind') || s.includes('critical') || s.includes('loss') || s.includes('out of stock')) return '#dc2626'
  return '#475569'
}

function SummaryCards({ summary }: { summary: Record<string, unknown> }) {
  const entries = Object.entries(summary).filter(([k]) => k !== 'by_department' && k !== 'by_mode')
  if (entries.length === 0) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(entries.length, 5)}, 1fr)`, gap: '12px', marginBottom: '16px' }}>
      {entries.map(([key, value]) => {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        const isAmt = isCurrencyCol(key)
        const displayVal = isAmt && typeof value === 'number'
          ? formatCurrency(value)
          : String(value)
        return (
          <div key={key} style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>{label}</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>{displayVal}</div>
          </div>
        )
      })}
    </div>
  )
}

function ReportViewerContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reportId = searchParams.get('report') || ''
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [summary, setSummary] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const meta = reportMeta[reportId] || { name: 'Report', description: '', icon: '📊' }

  const fetchReport = useCallback(async () => {
    if (!reportId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ report: reportId })
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      const res = await fetch(`/api/reports?${params}`)
      const result = await res.json()
      setData(result.data || [])
      setSummary(result.summary || {})
    } catch {
      setData([])
      setSummary({})
    }
    setLoading(false)
  }, [reportId, dateFrom, dateTo])

  useEffect(() => { fetchReport() }, [fetchReport])

  function exportCsv() {
    if (data.length === 0) return
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportId}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function renderTable() {
    if (data.length === 0) return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
        No data found for this report. Try adjusting the date range.
      </div>
    )

    const columns = Object.keys(data[0])

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {columns.map(col => (
                <th key={col} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {columns.map(col => {
                  const val = row[col]
                  const strVal = String(val ?? '—')

                  // Grade column — colored badge
                  if (col === 'grade') {
                    const gc = getGradeColor(strVal)
                    return (
                      <td key={col} style={{ padding: '10px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <span style={{ background: gc.bg, color: gc.color, padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700' }}>{strVal}</span>
                      </td>
                    )
                  }

                  // Points column — blue badge
                  if (col === 'points') {
                    return (
                      <td key={col} style={{ padding: '10px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <span style={{ background: '#e6f1fb', color: '#185fa5', padding: '2px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}>⭐ {strVal}</span>
                      </td>
                    )
                  }

                  // Status/severity columns — colored
                  if (col === 'status' || col === 'severity') {
                    const color = getStatusColor(strVal)
                    const bg = color === '#16a34a' ? '#eaf3de' : color === '#92400e' ? '#faeeda' : color === '#dc2626' ? '#fef2f2' : '#f1f5f9'
                    return (
                      <td key={col} style={{ padding: '10px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <span style={{ background: bg, color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>{strVal}</span>
                      </td>
                    )
                  }

                  // OKR status column
                  if (col === 'okr') {
                    return (
                      <td key={col} style={{ padding: '10px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                        {strVal}
                      </td>
                    )
                  }

                  // Currency columns
                  if (isCurrencyCol(col) && typeof val === 'number' && !strVal.includes('%')) {
                    return (
                      <td key={col} style={{ padding: '10px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#16a34a', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        {formatCurrency(val as number)}
                      </td>
                    )
                  }

                  // Days overdue — red if high
                  if (col === 'days_overdue') {
                    const days = Number(val)
                    return (
                      <td key={col} style={{ padding: '10px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: days > 14 ? '#dc2626' : days > 7 ? '#92400e' : '#475569' }}>
                        {days} days
                      </td>
                    )
                  }

                  // Completion rate — colored
                  if (col === 'completion_rate') {
                    const pct = parseInt(strVal)
                    const color = pct >= 80 ? '#16a34a' : pct >= 60 ? '#92400e' : '#dc2626'
                    return (
                      <td key={col} style={{ padding: '10px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color }}>{strVal}</td>
                    )
                  }

                  // Default
                  return (
                    <td key={col} style={{ padding: '10px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {strVal}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!reportId) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
        No report selected.{' '}
        <span onClick={() => router.push('/dashboard/reports')} style={{ color: '#1a56db', cursor: 'pointer' }}>← Go to reports</span>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <button onClick={() => router.push('/dashboard/reports')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', padding: 0 }}>
              ← Reports
            </button>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>{meta.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>{meta.icon}</span>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>{meta.name}</h1>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{meta.description}</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchReport} style={{ padding: '8px 14px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>
            ↻ Refresh
          </button>
          <button onClick={exportCsv} disabled={data.length === 0} style={{ padding: '8px 14px', border: '0.5px solid #bfdbfe', borderRadius: '7px', fontSize: '13px', color: '#1a56db', background: '#eff6ff', cursor: data.length === 0 ? 'not-allowed' : 'pointer', opacity: data.length === 0 ? 0.5 : 1 }}>
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* Technician scoring legend */}
      {reportId === 'technician-performance' && (
        <div style={{ background: '#f0f7ff', border: '0.5px solid #bfdbfe', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', display: 'flex', gap: '20px', alignItems: 'center', fontSize: '12px', color: '#185fa5' }}>
          <span style={{ fontWeight: '600' }}>Scoring system:</span>
          <span>⭐ 1 pt — Open job</span>
          <span>⭐⭐ 2 pts — In progress</span>
          <span>⭐⭐⭐ 3 pts — Completed</span>
          <span style={{ marginLeft: 'auto' }}>
            Grade: <strong style={{ color: '#3b6d11' }}>A</strong> ≥30pts+80% · <strong style={{ color: '#185fa5' }}>B</strong> ≥20pts+60% · <strong style={{ color: '#854f0b' }}>C</strong> ≥10pts · <strong style={{ color: '#dc2626' }}>D</strong> below
          </span>
        </div>
      )}

      {/* OKR legend */}
      {reportId === 'okr-report' && (
        <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '12px', color: '#16a34a', display: 'flex', gap: '20px' }}>
          <span style={{ fontWeight: '600' }}>Status guide:</span>
          <span>✅ On track</span>
          <span style={{ color: '#92400e' }}>⚠️ At risk — needs attention</span>
          <span style={{ color: '#dc2626' }}>❌ Behind — immediate action needed</span>
          <span style={{ color: '#475569' }}>📊 Tracking only</span>
        </div>
      )}

      {/* Date Filters */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Date range:</span>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ height: '34px', padding: '0 10px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none' }} />
        <span style={{ color: '#94a3b8' }}>to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ height: '34px', padding: '0 10px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none' }} />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo('') }} style={{ padding: '5px 10px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#64748b', background: '#f8fafc', cursor: 'pointer' }}>Clear</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748b' }}>
          {loading ? 'Loading...' : `${data.length} records`}
        </span>
      </div>

      {/* Summary KPI cards */}
      {!loading && Object.keys(summary).length > 0 && <SummaryCards summary={summary} />}

      {/* Report Table */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>⏳</div>
            Loading report data...
          </div>
        ) : renderTable()}
      </div>
    </div>
  )
}

export default function ReportViewerPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading...</div>}>
      <ReportViewerContent />
    </Suspense>
  )
}