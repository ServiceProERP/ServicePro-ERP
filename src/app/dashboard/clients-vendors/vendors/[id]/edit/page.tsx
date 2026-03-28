'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

const inputStyle = {
  width: '100%', height: '38px', padding: '0 12px',
  border: '0.5px solid #e2e8f0', borderRadius: '7px',
  fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a',
}
const labelStyle = { display: 'block' as const, fontSize: '12px', fontWeight: '500' as const, color: '#475569', marginBottom: '5px' }
const sectionTitle = { fontSize: '13px', fontWeight: '600' as const, color: '#0f172a', borderBottom: '0.5px solid #e2e8f0', paddingBottom: '8px', marginBottom: '14px', marginTop: '20px' }
const selectStyle = { width: '100%', height: '38px', padding: '0 12px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a', cursor: 'pointer' }

export default function EditVendorPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    companyName: '', contactPerson: '', phone: '', email: '',
    address: '', city: '', postalCode: '', state: '', country: 'India',
    gstin: '', category: '', paymentTerms: 'immediate',
    leadTimeDays: '', rating: '', status: 'active', notes: '',
  })

  useEffect(() => {
    async function fetchVendor() {
      const res = await fetch(`/api/vendors/${id}`)
      const data = await res.json()
      if (data.vendor) {
        const v = data.vendor
        setForm({
          companyName: v.companyName || '',
          contactPerson: v.contactPerson || '',
          phone: v.phone || '',
          email: v.email || '',
          address: v.address || '',
          city: v.city || '',
          postalCode: v.postalCode || '',
          state: v.state || '',
          country: v.country || 'India',
          gstin: v.gstin || '',
          category: v.category || '',
          paymentTerms: v.paymentTerms || 'immediate',
          leadTimeDays: v.leadTimeDays?.toString() || '',
          rating: v.rating?.toString() || '',
          status: v.status || 'active',
          notes: v.notes || '',
        })
      }
      setLoading(false)
    }
    fetchVendor()
  }, [id])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/vendors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Failed to update'); setSaving(false); return }
      setSuccess('Vendor updated successfully!')
      setTimeout(() => router.push(`/dashboard/clients-vendors/vendors/${id}`), 1500)
    } catch {
      setError('Something went wrong.')
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Loading...</div>

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Edit vendor</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{form.companyName}</p>
        </div>
        <button onClick={() => router.back()} style={{ padding: '8px 16px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>← Back</button>
      </div>

      {/* Status buttons */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Vendor status</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[
            { value: 'active', label: '✓ Active', activeBg: '#eaf3de', activeColor: '#3b6d11', activeBorder: '#3b6d11' },
            { value: 'hold', label: '⏸ On Hold', activeBg: '#faeeda', activeColor: '#854f0b', activeBorder: '#854f0b' },
            { value: 'blacklist', label: '✗ Blacklist', activeBg: '#fcebeb', activeColor: '#a32d2d', activeBorder: '#a32d2d' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setForm(prev => ({ ...prev, status: opt.value }))}
              style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                background: form.status === opt.value ? opt.activeBg : '#f8fafc',
                color: form.status === opt.value ? opt.activeColor : '#64748b',
                border: `1px solid ${form.status === opt.value ? opt.activeBorder : '#e2e8f0'}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginLeft: 'auto' }}>
          {form.status === 'hold' && '⚠ Vendor on hold — pause new purchase orders'}
          {form.status === 'blacklist' && '🚫 Vendor blacklisted — block all transactions'}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '24px' }}>

          <div style={{ ...sectionTitle, marginTop: 0 }}>Company information</div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Company name *</label>
            <input name="companyName" value={form.companyName} onChange={handleChange} required style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div><label style={labelStyle}>Contact person *</label><input name="contactPerson" value={form.contactPerson} onChange={handleChange} required style={inputStyle} /></div>
            <div><label style={labelStyle}>Phone *</label><input name="phone" value={form.phone} onChange={handleChange} required style={inputStyle} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div><label style={labelStyle}>Email</label><input name="email" type="email" value={form.email} onChange={handleChange} style={inputStyle} /></div>
            <div>
              <label style={labelStyle}>Category</label>
              <select name="category" value={form.category} onChange={handleChange} style={selectStyle}>
                <option value="">— Select category —</option>
                <option value="Electronics">Electronics</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Electrical">Electrical</option>
                <option value="Tools">Tools</option>
                <option value="Consumables">Consumables</option>
                <option value="Software">Software</option>
                <option value="Services">Services</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Address</label>
            <textarea name="address" value={form.address} onChange={handleChange} rows={2} style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' as const }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div><label style={labelStyle}>City</label><input name="city" value={form.city} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>Postal code</label><input name="postalCode" value={form.postalCode} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>State</label><input name="state" value={form.state} onChange={handleChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>Country</label><input name="country" value={form.country} onChange={handleChange} style={inputStyle} /></div>
          </div>

          <div style={sectionTitle}>Business terms</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Payment terms</label>
              <select name="paymentTerms" value={form.paymentTerms} onChange={handleChange} style={selectStyle}>
                <option value="immediate">Immediate</option>
                <option value="net-15">Net 15 days</option>
                <option value="net-30">Net 30 days</option>
                <option value="net-45">Net 45 days</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <div><label style={labelStyle}>Lead time (days)</label><input name="leadTimeDays" type="number" value={form.leadTimeDays} onChange={handleChange} min="0" style={inputStyle} /></div>
            <div>
              <label style={labelStyle}>Rating (1–5)</label>
              <select name="rating" value={form.rating} onChange={handleChange} style={selectStyle}>
                <option value="">— No rating —</option>
                <option value="5">★★★★★ Excellent</option>
                <option value="4">★★★★☆ Good</option>
                <option value="3">★★★☆☆ Average</option>
                <option value="2">★★☆☆☆ Below avg</option>
                <option value="1">★☆☆☆☆ Poor</option>
              </select>
            </div>
          </div>

          <div style={sectionTitle}>Billing</div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>GSTIN</label>
            <input name="gstin" value={form.gstin} onChange={handleChange} style={{ ...inputStyle, maxWidth: '300px' }} />
          </div>

          <div style={sectionTitle}>Internal notes</div>
          <div style={{ marginBottom: '14px' }}>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} placeholder="Internal notes about this vendor..." style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' as const }} />
          </div>
        </div>

        {error && <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginTop: '16px' }}>{error}</div>}
        {success && <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', color: '#16a34a', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginTop: '16px' }}>✓ {success}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', padding: '16px', background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px' }}>
          <button type="button" onClick={() => router.back()} style={{ padding: '9px 20px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" disabled={saving} style={{ padding: '9px 24px', background: saving ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving...' : '💾 Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}