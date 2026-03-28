'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { formatDate } from '@/lib/utils'

type Client = {
  id: string
  clientCode: string
  companyName: string
  contactPerson: string
  phone: string
  email: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  state: string | null
  country: string | null
  gstin: string | null
  creditLimit: number
  clientType: string | null
  status: string
  preferredContact: string | null
  industry: string | null
  notes: string | null
  createdAt: string
  jobs: {
    id: string
    jobNo: string
    jobTitle: string
    status: string
    priority: string
    createdAt: string
    deadline: string | null
    technician: { name: string } | null
  }[]
  invoices: {
    id: string
    invoiceNo: string
    totalAmount: number
    status: string
    createdAt: string
    dueDate: string | null
  }[]
  refunds: {
    id: string
    refundNo: string
    amount: number
    reason: string
    refundType: string
    status: string
    createdAt: string
  }[]
}

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: '#eaf3de', color: '#3b6d11', label: 'Active' },
  hold: { bg: '#faeeda', color: '#854f0b', label: 'On Hold' },
  blacklist: { bg: '#fcebeb', color: '#a32d2d', label: 'Blacklisted' },
}

const jobStatusColors: Record<string, { bg: string; color: string; label: string }> = {
  open: { bg: '#e6f1fb', color: '#185fa5', label: 'Open' },
  in_progress: { bg: '#faeeda', color: '#854f0b', label: 'In Progress' },
  completed: { bg: '#eaf3de', color: '#3b6d11', label: 'Completed' },
  waiting_parts: { bg: '#fbeaf0', color: '#993556', label: 'Waiting Parts' },
  cancelled: { bg: '#f1efe8', color: '#5f5e5a', label: 'Cancelled' },
}

export default function ClientViewPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'jobs' | 'invoices' | 'refunds'>('jobs')

  useEffect(() => {
    async function fetchClient() {
      const res = await fetch(`/api/clients/${id}`)
      const data = await res.json()
      setClient(data.client)
      setLoading(false)
    }
    fetchClient()
  }, [id])

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading client...</div>
  )

  if (!client) return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#dc2626', fontSize: '13px' }}>Client not found.</div>
  )

  const st = statusConfig[client.status] || statusConfig.active
  const outstanding = client.invoices.filter(i => i.status === 'unpaid' || i.status === 'overdue').reduce((s, i) => s + i.totalAmount, 0)
  const completed = client.jobs.filter(j => j.status === 'completed').length
  const successRatio = client.jobs.length > 0 ? Math.round((completed / client.jobs.length) * 100) : 0
  const totalRefunds = client.refunds.reduce((s, r) => s + r.amount, 0)
  const overLimit = client.creditLimit > 0 && outstanding > client.creditLimit

  const cardStyle = { background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }
  const labelStyle = { fontSize: '11px', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.4px', marginBottom: '2px' }
  const valueStyle = { fontSize: '13px', color: '#0f172a', fontWeight: '500' as const }
  const thStyle = { padding: '8px 12px', textAlign: 'left' as const, fontSize: '10px', fontWeight: '500' as const, color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase' as const, letterSpacing: '0.4px', background: '#f8fafc', whiteSpace: 'nowrap' as const }
  const tdStyle = { padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#475569' }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.back()} style={{ padding: '7px 14px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '12px', color: '#475569', background: '#fff', cursor: 'pointer' }}>← Back</button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>{client.companyName}</h1>
              <span style={{ background: st.bg, color: st.color, padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>{st.label}</span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{client.clientCode} · {client.clientType || 'Walk-in'} {client.industry ? `· ${client.industry}` : ''}</p>
          </div>
        </div>
        <button onClick={() => router.push(`/dashboard/clients-vendors/clients/${client.id}/edit`)} style={{ background: '#1a56db', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          Edit client
        </button>
      </div>

      {/* Performance KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '16px' }}>
        {[
          { label: 'Total jobs', value: client.jobs.length, color: '#185fa5', bg: '#e6f1fb' },
          { label: 'Completed', value: completed, color: '#3b6d11', bg: '#eaf3de' },
          { label: 'Success ratio', value: `${successRatio}%`, color: successRatio >= 80 ? '#3b6d11' : successRatio >= 50 ? '#854f0b' : '#dc2626', bg: '#fff' },
          { label: 'Outstanding', value: outstanding > 0 ? `₹${outstanding.toLocaleString('en-IN')}` : '₹0', color: outstanding > 0 ? '#dc2626' : '#3b6d11', bg: outstanding > 0 ? '#fef2f2' : '#f0fdf4' },
          { label: 'Total refunds', value: totalRefunds > 0 ? `₹${totalRefunds.toLocaleString('en-IN')}` : '₹0', color: totalRefunds > 0 ? '#993556' : '#64748b', bg: '#fff' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: kpi.bg, border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{kpi.label}</div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: kpi.color, marginTop: '4px' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Credit Status Alert */}
      {overLimit && (
        <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#dc2626', fontWeight: '500' }}>
          ⚠ Credit limit exceeded — Outstanding ₹{outstanding.toLocaleString('en-IN')} is over the limit of ₹{client.creditLimit.toLocaleString('en-IN')}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Contact Info */}
        <div style={cardStyle}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '14px' }}>Contact information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'Contact person', value: client.contactPerson },
              { label: 'Phone', value: client.phone },
              { label: 'Email', value: client.email || '—' },
              { label: 'Preferred contact', value: client.preferredContact || '—' },
              { label: 'City', value: client.city || '—' },
              { label: 'State', value: client.state || '—' },
              { label: 'Postal code', value: client.postalCode || '—' },
              { label: 'Country', value: client.country || '—' },
              { label: 'GSTIN', value: client.gstin || '—' },
              { label: 'Member since', value: formatDate(client.createdAt) },
            ].map(f => (
              <div key={f.label}>
                <div style={labelStyle}>{f.label}</div>
                <div style={valueStyle}>{f.value}</div>
              </div>
            ))}
          </div>
          {client.address && (
            <div style={{ marginTop: '12px' }}>
              <div style={labelStyle}>Address</div>
              <div style={{ ...valueStyle, fontSize: '12px', lineHeight: '1.5' }}>{client.address}</div>
            </div>
          )}
        </div>

        {/* Business Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={cardStyle}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '14px' }}>Business information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Client type', value: client.clientType || 'Walk-in' },
                { label: 'Industry', value: client.industry || '—' },
                { label: 'Credit limit', value: client.creditLimit > 0 ? `₹${client.creditLimit.toLocaleString('en-IN')}` : 'No limit' },
                { label: 'Credit status', value: overLimit ? 'Over limit' : outstanding > 0 ? 'Has dues' : 'Clear' },
              ].map(f => (
                <div key={f.label}>
                  <div style={labelStyle}>{f.label}</div>
                  <div style={valueStyle}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>
          {client.notes && (
            <div style={cardStyle}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '8px' }}>Internal notes</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>{client.notes}</div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '0.5px solid #e2e8f0' }}>
          {([
            { key: 'jobs', label: `Jobs (${client.jobs.length})` },
            { key: 'invoices', label: `Invoices (${client.invoices.length})` },
            { key: 'refunds', label: `Refunds (${client.refunds.length})` },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
                background: activeTab === tab.key ? '#fff' : '#f8fafc',
                color: activeTab === tab.key ? '#1a56db' : '#64748b',
                borderBottom: activeTab === tab.key ? '2px solid #1a56db' : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '16px' }}>

          {/* Jobs Tab */}
          {activeTab === 'jobs' && (
            client.jobs.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No jobs for this client yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Job no', 'Title', 'Status', 'Priority', 'Technician', 'Created', 'Deadline'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {client.jobs.map(job => {
                    const js = jobStatusColors[job.status] || jobStatusColors.open
                    return (
                      <tr key={job.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ ...tdStyle, fontWeight: '600', color: '#1a56db' }}>{job.jobNo}</td>
                        <td style={tdStyle}>{job.jobTitle}</td>
                        <td style={tdStyle}><span style={{ background: js.bg, color: js.color, padding: '2px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: '500' }}>{js.label}</span></td>
                        <td style={{ ...tdStyle, textTransform: 'capitalize' }}>{job.priority}</td>
                        <td style={tdStyle}>{job.technician?.name || '—'}</td>
                        <td style={tdStyle}>{formatDate(job.createdAt)}</td>
                        <td style={{ ...tdStyle, color: job.deadline && new Date(job.deadline) < new Date() && job.status !== 'completed' ? '#dc2626' : '#475569' }}>
                          {job.deadline ? formatDate(job.deadline) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            client.invoices.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No invoices for this client yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Invoice no', 'Amount', 'Status', 'Date', 'Due date'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {client.invoices.map(inv => {
                    const isOverdue = inv.status === 'unpaid' && inv.dueDate && new Date(inv.dueDate) < new Date()
                    return (
                      <tr key={inv.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ ...tdStyle, fontWeight: '600', color: '#1a56db' }}>{inv.invoiceNo}</td>
                        <td style={{ ...tdStyle, fontWeight: '500', color: '#0f172a' }}>₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                        <td style={tdStyle}>
                          <span style={{
                            background: inv.status === 'paid' ? '#eaf3de' : inv.status === 'unpaid' ? '#fef2f2' : '#faeeda',
                            color: inv.status === 'paid' ? '#3b6d11' : inv.status === 'unpaid' ? '#dc2626' : '#854f0b',
                            padding: '2px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: '500', textTransform: 'capitalize',
                          }}>
                            {isOverdue ? 'Overdue' : inv.status}
                          </span>
                        </td>
                        <td style={tdStyle}>{formatDate(inv.createdAt)}</td>
                        <td style={{ ...tdStyle, color: isOverdue ? '#dc2626' : '#475569' }}>{inv.dueDate ? formatDate(inv.dueDate) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )
          )}

          {/* Refunds Tab */}
          {activeTab === 'refunds' && (
            client.refunds.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No refunds for this client.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Refund no', 'Amount', 'Type', 'Reason', 'Status', 'Date'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {client.refunds.map(ref => (
                    <tr key={ref.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ ...tdStyle, fontWeight: '600', color: '#1a56db' }}>{ref.refundNo}</td>
                      <td style={{ ...tdStyle, fontWeight: '500', color: '#dc2626' }}>₹{ref.amount.toLocaleString('en-IN')}</td>
                      <td style={{ ...tdStyle, textTransform: 'capitalize' }}>{ref.refundType}</td>
                      <td style={tdStyle}>{ref.reason}</td>
                      <td style={tdStyle}>
                        <span style={{
                          background: ref.status === 'approved' ? '#eaf3de' : ref.status === 'pending' ? '#faeeda' : '#fef2f2',
                          color: ref.status === 'approved' ? '#3b6d11' : ref.status === 'pending' ? '#854f0b' : '#dc2626',
                          padding: '2px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: '500', textTransform: 'capitalize',
                        }}>
                          {ref.status}
                        </span>
                      </td>
                      <td style={tdStyle}>{formatDate(ref.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  )
}