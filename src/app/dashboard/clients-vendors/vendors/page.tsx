'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Vendor = {
  id: string
  vendorCode: string
  companyName: string
  contactPerson: string
  phone: string
  email: string | null
  city: string | null
  gstin: string | null
  category: string | null
  paymentTerms: string | null
  rating: number | null
  leadTimeDays: number | null
  status: string
  isActive: boolean
}

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: '#eaf3de', color: '#3b6d11', label: 'Active' },
  hold: { bg: '#faeeda', color: '#854f0b', label: 'On Hold' },
  blacklist: { bg: '#fcebeb', color: '#a32d2d', label: 'Blacklisted' },
}

function RatingStars({ rating }: { rating: number | null }) {
  if (!rating) return <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
  return (
    <span style={{ fontSize: '13px' }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < rating ? '#f59e0b' : '#e2e8f0' }}>★</span>
      ))}
    </span>
  )
}

export default function VendorsListPage() {
  const router = useRouter()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 10

  const fetchVendors = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page), limit: String(limit),
      ...(search && { search }),
      ...(statusFilter && { status: statusFilter }),
    })
    const res = await fetch(`/api/vendors?${params}`)
    const data = await res.json()
    setVendors(data.vendors || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [page, search, statusFilter])

  useEffect(() => { fetchVendors() }, [fetchVendors])

  const totalPages = Math.ceil(total / limit)
  const activeCount = vendors.filter(v => v.status === 'active').length
  const holdCount = vendors.filter(v => v.status === 'hold').length
  const inactiveCount = vendors.filter(v => !v.isActive).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Vendors</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Manage all suppliers and service vendors</p>
        </div>
        <button onClick={() => router.push('/dashboard/clients-vendors/vendors/create')} style={{ background: '#1a56db', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          + New vendor
        </button>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Total vendors', value: total, color: '#0f172a', bg: '#fff' },
          { label: 'Active', value: activeCount, color: '#3b6d11', bg: '#eaf3de' },
          { label: 'On hold', value: holdCount, color: '#854f0b', bg: '#faeeda' },
          { label: 'Inactive', value: inactiveCount, color: '#64748b', bg: '#f8fafc' },
        ].map(stat => (
          <div key={stat.label} style={{ background: stat.bg, border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{stat.label}</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: stat.color, marginTop: '4px' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          placeholder="Search by company, contact, category..."
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
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Code', 'Company', 'Category', 'Contact', 'Phone', 'City', 'Payment terms', 'Lead time', 'Rating', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading vendors...</td></tr>
            ) : vendors.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  No vendors found.{' '}
                  <span onClick={() => router.push('/dashboard/clients-vendors/vendors/create')} style={{ color: '#1a56db', cursor: 'pointer' }}>Create your first vendor →</span>
                </td>
              </tr>
            ) : (
              vendors.map(vendor => {
                const st = statusConfig[vendor.status] || statusConfig.active
                return (
                  <tr key={vendor.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{vendor.vendorCode}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{vendor.companyName}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                      {vendor.category ? (
                        <span style={{ background: '#eeedfe', color: '#534ab7', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>{vendor.category}</span>
                      ) : <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#475569' }}>{vendor.contactPerson}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#475569' }}>{vendor.phone}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#64748b' }}>{vendor.city || '—'}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#475569', textTransform: 'capitalize' }}>
                      {vendor.paymentTerms ? vendor.paymentTerms.replace('-', ' ') : '—'}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>
                      {vendor.leadTimeDays ? `${vendor.leadTimeDays} days` : '—'}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                      <RatingStars rating={vendor.rating} />
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                      <span style={{ background: st.bg, color: st.color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => router.push(`/dashboard/clients-vendors/vendors/${vendor.id}`)} style={{ padding: '4px 10px', border: '0.5px solid #e2e8f0', borderRadius: '5px', fontSize: '11px', color: '#475569', background: '#f8fafc', cursor: 'pointer' }}>View</button>
                        <button onClick={() => router.push(`/dashboard/clients-vendors/vendors/${vendor.id}/edit`)} style={{ padding: '4px 10px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '11px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}>Edit</button>
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
            <div style={{ fontSize: '12px', color: '#64748b' }}>Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} vendors</div>
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