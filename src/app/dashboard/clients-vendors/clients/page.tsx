'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Job = { status: string; createdAt: string }
type Invoice = { status: string; totalAmount: number }
type Refund = { amount: number; refundType: string }

type Client = {
  id: string
  clientCode: string
  companyName: string
  contactPerson: string
  phone: string
  city: string | null
  industry: string | null
  creditLimit: number
  status: string
  clientType: string | null
  isActive: boolean
  createdAt: string
  _count: { jobs: number; invoices: number; refunds: number }
  jobs: Job[]
  invoices: Invoice[]
  refunds: Refund[]
}

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: '#eaf3de', color: '#3b6d11', label: 'Active' },
  hold: { bg: '#faeeda', color: '#854f0b', label: 'On Hold' },
  blacklist: { bg: '#fcebeb', color: '#a32d2d', label: 'Blacklisted' },
}

function getHealthScore(client: Client) {
  const totalJobs = client.jobs.length
  const completedJobs = client.jobs.filter(j => j.status === 'completed').length
  const outstanding = client.invoices
    .filter(i => i.status === 'unpaid' || i.status === 'overdue')
    .reduce((s, i) => s + i.totalAmount, 0)
  const successRatio = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 100
  const overLimit = client.creditLimit > 0 && outstanding > client.creditLimit

  if (client.status === 'blacklist') return 'red'
  if (overLimit || successRatio < 50) return 'red'
  if (client.status === 'hold' || successRatio < 80 || outstanding > 0) return 'amber'
  return 'green'
}

const healthColors = {
  green: { bg: '#eaf3de', color: '#3b6d11', label: '● Healthy' },
  amber: { bg: '#faeeda', color: '#854f0b', label: '● At Risk' },
  red: { bg: '#fcebeb', color: '#a32d2d', label: '● Critical' },
}

export default function ClientsListPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 10

  const fetchClients = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page), limit: String(limit),
      ...(search && { search }),
      ...(statusFilter && { status: statusFilter }),
    })
    const res = await fetch(`/api/clients?${params}`)
    const data = await res.json()
    setClients(data.clients || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [page, search, statusFilter])

  useEffect(() => { fetchClients() }, [fetchClients])

  const totalPages = Math.ceil(total / limit)

  const getOutstanding = (client: Client) =>
    client.invoices.filter(i => i.status === 'unpaid' || i.status === 'overdue').reduce((s, i) => s + i.totalAmount, 0)

  const getCompleted = (client: Client) => client.jobs.filter(j => j.status === 'completed').length
  const getOnHold = (client: Client) => client.jobs.filter(j => j.status === 'waiting_parts' || j.status === 'open').length
  const getSuccessRatio = (client: Client) => client.jobs.length > 0 ? Math.round((getCompleted(client) / client.jobs.length) * 100) : 0
  const getReturnRatio = (client: Client) => client.jobs.length > 0 ? Math.round((client.refunds.filter(r => r.refundType === 'return').length / client.jobs.length) * 100) : 0
  const getTotalRefundAmount = (client: Client) => client.refunds.reduce((s, r) => s + r.amount, 0)

  // Summary KPIs across all clients
  const totalJobs = clients.reduce((s, c) => s + c.jobs.length, 0)
  const totalCompleted = clients.reduce((s, c) => s + getCompleted(c), 0)
  const totalReturns = clients.reduce((s, c) => s + c.refunds.filter(r => r.refundType === 'return').length, 0)
  const totalRefunds = clients.reduce((s, c) => s + c.refunds.filter(r => r.refundType !== 'return').length, 0)
  const totalOnHold = clients.reduce((s, c) => s + getOnHold(c), 0)

  const thStyle = {
    padding: '9px 12px', textAlign: 'left' as const, fontSize: '10px',
    fontWeight: '500' as const, color: '#64748b', borderBottom: '0.5px solid #e2e8f0',
    textTransform: 'uppercase' as const, letterSpacing: '0.4px',
    background: '#f8fafc', whiteSpace: 'nowrap' as const,
  }
  const tdStyle = { padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px' }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Clients</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Client intelligence — jobs, performance, outstanding and health</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/clients-vendors/clients/create')}
          style={{ background: '#1a56db', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
        >
          + New client
        </button>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '16px' }}>
        {[
          { label: 'Total clients', value: total, color: '#0f172a', bg: '#fff' },
          { label: 'Total jobs', value: totalJobs, color: '#185fa5', bg: '#e6f1fb' },
          { label: 'Completed', value: totalCompleted, color: '#3b6d11', bg: '#eaf3de' },
          { label: 'On hold / open', value: totalOnHold, color: '#854f0b', bg: '#faeeda' },
          { label: 'Returns', value: totalReturns, color: '#993556', bg: '#fbeaf0' },
          { label: 'Refunds', value: totalRefunds, color: '#a32d2d', bg: '#fcebeb' },
        ].map(stat => (
          <div key={stat.label} style={{ background: stat.bg, border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{stat.label}</div>
            <div style={{ fontSize: '22px', fontWeight: '600', color: stat.color, marginTop: '4px' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          placeholder="Search company, contact, city, industry..."
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
          <option value="active">Active</option>
          <option value="hold">On Hold</option>
          <option value="blacklist">Blacklisted</option>
        </select>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setPage(1) }} style={{ height: '36px', padding: '0 12px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#64748b', background: '#f8f9fb', cursor: 'pointer' }}>Clear</button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
          <thead>
            <tr>
              {['Health', 'Client ID', 'Company', 'Industry', 'City', 'Credit limit', 'Outstanding', 'Credit status', 'Total jobs', 'Completed', 'Returns', 'Refunds', 'Success %', 'Return %', 'Status', 'Actions'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={16} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading clients...</td></tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={16} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  No clients found.{' '}
                  <span onClick={() => router.push('/dashboard/clients-vendors/clients/create')} style={{ color: '#1a56db', cursor: 'pointer' }}>Create your first client →</span>
                </td>
              </tr>
            ) : (
              clients.map(client => {
                const st = statusConfig[client.status] || statusConfig.active
                const health = getHealthScore(client)
                const hc = healthColors[health]
                const outstanding = getOutstanding(client)
                const overLimit = client.creditLimit > 0 && outstanding > client.creditLimit
                const completed = getCompleted(client)
                const returns = client.refunds.filter(r => r.refundType === 'return').length
                const refunds = client.refunds.filter(r => r.refundType !== 'return').length
                const successRatio = getSuccessRatio(client)
                const returnRatio = getReturnRatio(client)
                const totalRefundAmt = getTotalRefundAmount(client)

                return (
                  <tr key={client.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={tdStyle}>
                      <span style={{ background: hc.bg, color: hc.color, padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600', whiteSpace: 'nowrap' as const }}>
                        {hc.label}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#64748b' }}>{client.clientCode}</td>
                    <td style={{ ...tdStyle, fontWeight: '500', color: '#0f172a', whiteSpace: 'nowrap' as const }}>{client.companyName}</td>
                    <td style={{ ...tdStyle, color: '#475569' }}>{client.industry || '—'}</td>
                    <td style={{ ...tdStyle, color: '#64748b' }}>{client.city || '—'}</td>
                    <td style={{ ...tdStyle, color: '#0f172a' }}>
                      {client.creditLimit > 0 ? `₹${client.creditLimit.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: outstanding > 0 ? '600' : '400', color: outstanding > 0 ? '#dc2626' : '#64748b' }}>
                      {outstanding > 0 ? `₹${outstanding.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        background: overLimit ? '#fcebeb' : outstanding > 0 ? '#faeeda' : '#eaf3de',
                        color: overLimit ? '#a32d2d' : outstanding > 0 ? '#854f0b' : '#3b6d11',
                        padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600', whiteSpace: 'nowrap' as const,
                      }}>
                        {overLimit ? 'Over limit' : outstanding > 0 ? 'Has dues' : 'Clear'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' as const, fontWeight: '600', color: '#185fa5' }}>{client.jobs.length}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' as const, color: '#3b6d11', fontWeight: '500' }}>{completed}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' as const, color: returns > 0 ? '#993556' : '#64748b' }}>{returns}</td>
                    <td style={{ ...tdStyle, color: totalRefundAmt > 0 ? '#dc2626' : '#64748b' }}>
                      {totalRefundAmt > 0 ? `₹${totalRefundAmt.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        background: successRatio >= 80 ? '#eaf3de' : successRatio >= 50 ? '#faeeda' : '#fcebeb',
                        color: successRatio >= 80 ? '#3b6d11' : successRatio >= 50 ? '#854f0b' : '#a32d2d',
                        padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600',
                      }}>
                        {successRatio}%
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: returnRatio > 10 ? '#dc2626' : '#64748b' }}>{returnRatio}%</td>
                    <td style={tdStyle}>
                      <span style={{ background: st.bg, color: st.color, padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '500' }}>{st.label}</span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => router.push(`/dashboard/clients-vendors/clients/${client.id}`)} style={{ padding: '4px 8px', border: '0.5px solid #e2e8f0', borderRadius: '5px', fontSize: '11px', color: '#475569', background: '#f8fafc', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>View</button>
                        <button onClick={() => router.push(`/dashboard/clients-vendors/clients/${client.id}/edit`)} style={{ padding: '4px 8px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '11px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>Edit</button>
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
            <div style={{ fontSize: '12px', color: '#64748b' }}>Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} clients</div>
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