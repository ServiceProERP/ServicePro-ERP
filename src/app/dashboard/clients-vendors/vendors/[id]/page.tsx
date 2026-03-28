'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { formatDate } from '@/lib/utils'

type Vendor = {
  id: string
  vendorCode: string
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
  category: string | null
  paymentTerms: string | null
  leadTimeDays: number | null
  rating: number | null
  status: string
  notes: string | null
  isActive: boolean
  createdAt: string
}

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: '#eaf3de', color: '#3b6d11', label: 'Active' },
  hold: { bg: '#faeeda', color: '#854f0b', label: 'On Hold' },
  blacklist: { bg: '#fcebeb', color: '#a32d2d', label: 'Blacklisted' },
}

function RatingStars({ rating }: { rating: number | null }) {
  if (!rating) return <span style={{ color: '#94a3b8', fontSize: '13px' }}>No rating</span>
  return (
    <span style={{ fontSize: '18px' }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < rating ? '#f59e0b' : '#e2e8f0' }}>★</span>
      ))}
      <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '6px' }}>({rating}/5)</span>
    </span>
  )
}

export default function VendorViewPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchVendor() {
      try {
        const res = await fetch(`/api/vendors/${id}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.message || 'Failed to load vendor')
        } else {
          setVendor(data.vendor)
        }
      } catch {
        setError('Something went wrong')
      }
      setLoading(false)
    }
    if (id) fetchVendor()
  }, [id])

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading vendor...</div>
  )

  if (error || !vendor) return (
    <div style={{ padding: '60px', textAlign: 'center', fontSize: '13px' }}>
      <div style={{ color: '#dc2626', marginBottom: '12px' }}>{error || 'Vendor not found.'}</div>
      <button onClick={() => router.back()} style={{ padding: '8px 16px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '12px', color: '#475569', background: '#fff', cursor: 'pointer' }}>← Go back</button>
    </div>
  )

  const st = statusConfig[vendor.status] || statusConfig.active
  const cardStyle = { background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '20px' }
  const labelStyle = { fontSize: '11px', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.4px', marginBottom: '3px' }
  const valueStyle = { fontSize: '13px', color: '#0f172a', fontWeight: '500' as const }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.back()} style={{ padding: '7px 14px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '12px', color: '#475569', background: '#fff', cursor: 'pointer' }}>← Back</button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>{vendor.companyName}</h1>
              <span style={{ background: st.bg, color: st.color, padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>{st.label}</span>
              {vendor.category && (
                <span style={{ background: '#eeedfe', color: '#534ab7', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>{vendor.category}</span>
              )}
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{vendor.vendorCode} · Added {formatDate(vendor.createdAt)}</p>
          </div>
        </div>
        <button
          onClick={() => router.push(`/dashboard/clients-vendors/vendors/${vendor.id}/edit`)}
          style={{ background: '#1a56db', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
        >
          Edit vendor
        </button>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Rating', value: vendor.rating ? `${vendor.rating}/5` : 'Not rated', color: vendor.rating && vendor.rating >= 4 ? '#3b6d11' : '#64748b', bg: '#fff' },
          { label: 'Payment terms', value: vendor.paymentTerms ? vendor.paymentTerms.replace('-', ' ') : 'Immediate', color: '#185fa5', bg: '#e6f1fb' },
          { label: 'Lead time', value: vendor.leadTimeDays ? `${vendor.leadTimeDays} days` : 'Not set', color: '#854f0b', bg: '#faeeda' },
          { label: 'Status', value: st.label, color: st.color, bg: st.bg },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: kpi.bg, border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>{kpi.label}</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: kpi.color, textTransform: 'capitalize' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Contact Info */}
        <div style={cardStyle}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>Contact information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {[
              { label: 'Contact person', value: vendor.contactPerson },
              { label: 'Phone', value: vendor.phone },
              { label: 'Email', value: vendor.email || '—' },
              { label: 'City', value: vendor.city || '—' },
              { label: 'State', value: vendor.state || '—' },
              { label: 'Postal code', value: vendor.postalCode || '—' },
              { label: 'Country', value: vendor.country || '—' },
              { label: 'GSTIN', value: vendor.gstin || '—' },
            ].map(f => (
              <div key={f.label}>
                <div style={labelStyle}>{f.label}</div>
                <div style={valueStyle}>{f.value}</div>
              </div>
            ))}
          </div>
          {vendor.address && (
            <div style={{ marginTop: '14px' }}>
              <div style={labelStyle}>Address</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>{vendor.address}</div>
            </div>
          )}
        </div>

        {/* Business Info + Notes + Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={cardStyle}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>Business information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {[
                { label: 'Category', value: vendor.category || '—' },
                { label: 'Payment terms', value: vendor.paymentTerms?.replace('-', ' ') || 'Immediate' },
                { label: 'Lead time', value: vendor.leadTimeDays ? `${vendor.leadTimeDays} days` : '—' },
                { label: 'Status', value: st.label },
              ].map(f => (
                <div key={f.label}>
                  <div style={labelStyle}>{f.label}</div>
                  <div style={{ ...valueStyle, textTransform: 'capitalize' }}>{f.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '14px' }}>
              <div style={labelStyle}>Rating</div>
              <div style={{ marginTop: '4px' }}><RatingStars rating={vendor.rating} /></div>
            </div>
          </div>

          {vendor.notes && (
            <div style={cardStyle}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '8px' }}>Internal notes</div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>{vendor.notes}</div>
            </div>
          )}

          <div style={cardStyle}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>Quick actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => router.push(`/dashboard/inventory/purchase-orders`)}
                style={{ padding: '9px 14px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '12px', color: '#475569', background: '#f8fafc', cursor: 'pointer', textAlign: 'left' as const }}
              >
                📦 View purchase orders
              </button>
              <button
                onClick={() => router.push(`/dashboard/clients-vendors/vendors/${vendor.id}/edit`)}
                style={{ padding: '9px 14px', border: '0.5px solid #bfdbfe', borderRadius: '7px', fontSize: '12px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer', textAlign: 'left' as const }}
              >
                ✏️ Edit vendor details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}