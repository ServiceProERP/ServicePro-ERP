'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inputStyle = {
  width: '100%', height: '38px', padding: '0 12px',
  border: '0.5px solid #e2e8f0', borderRadius: '7px',
  fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a',
}

const labelStyle = {
  display: 'block' as const, fontSize: '12px',
  fontWeight: '500' as const, color: '#475569', marginBottom: '5px',
}

const sectionTitle = {
  fontSize: '13px', fontWeight: '600' as const, color: '#0f172a',
  borderBottom: '0.5px solid #e2e8f0', paddingBottom: '8px',
  marginBottom: '14px', marginTop: '20px',
}

const selectStyle = {
  width: '100%', height: '38px', padding: '0 12px',
  border: '0.5px solid #e2e8f0', borderRadius: '7px',
  fontSize: '13px', outline: 'none', background: '#fff',
  color: '#0f172a', cursor: 'pointer',
}

export default function CreateVendorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    companyName: '', contactPerson: '', phone: '', email: '',
    address: '', city: '', postalCode: '', state: '', country: 'India',
    gstin: '', category: '', paymentTerms: 'immediate',
    leadTimeDays: '', rating: '', status: 'active', notes: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Failed to create vendor'); setLoading(false); return }
      router.push('/dashboard/clients-vendors/vendors')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Create vendor</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Add a new supplier or service vendor</p>
        </div>
        <button onClick={() => router.back()} style={{ padding: '8px 16px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>← Back</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '24px' }}>

          {/* Company Info */}
          <div style={{ ...sectionTitle, marginTop: 0 }}>Company information</div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Company name *</label>
            <input name="companyName" value={form.companyName} onChange={handleChange} placeholder="e.g. Sharma Spare Parts Pvt Ltd" required style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Contact person *</label>
              <input name="contactPerson" value={form.contactPerson} onChange={handleChange} placeholder="Primary contact name" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Phone *</label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="Mobile / office number" required style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="vendor@email.com" style={inputStyle} />
            </div>
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
            <textarea name="address" value={form.address} onChange={handleChange} placeholder="Full vendor address" rows={2} style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' as const }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>City</label>
              <input name="city" value={form.city} onChange={handleChange} placeholder="e.g. Pune" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Postal code</label>
              <input name="postalCode" value={form.postalCode} onChange={handleChange} placeholder="411001" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>State</label>
              <input name="state" value={form.state} onChange={handleChange} placeholder="e.g. Maharashtra" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Country</label>
              <input name="country" value={form.country} onChange={handleChange} placeholder="India" style={inputStyle} />
            </div>
          </div>

          {/* Business Terms */}
          <div style={sectionTitle}>Business terms & classification</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
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
            <div>
              <label style={labelStyle}>Lead time (days)</label>
              <input name="leadTimeDays" type="number" value={form.leadTimeDays} onChange={handleChange} placeholder="e.g. 3" min="0" style={inputStyle} />
            </div>
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
            <div>
              <label style={labelStyle}>Status</label>
              <select name="status" value={form.status} onChange={handleChange} style={selectStyle}>
                <option value="active">Active</option>
                <option value="hold">On Hold</option>
                <option value="blacklist">Blacklist</option>
              </select>
            </div>
          </div>

          {/* Billing */}
          <div style={sectionTitle}>Billing information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>GSTIN</label>
              <input name="gstin" value={form.gstin} onChange={handleChange} placeholder="GST number (optional)" style={inputStyle} />
            </div>
          </div>

          {/* Notes */}
          <div style={sectionTitle}>Internal notes</div>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Any internal notes about this vendor — reliability, special terms, etc." rows={3} style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' as const }} />
          </div>

        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginTop: '16px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', padding: '16px', background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px' }}>
          <button type="button" onClick={() => router.back()} style={{ padding: '9px 20px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" disabled={loading} style={{ padding: '9px 24px', background: loading ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Saving...' : '💾 Save vendor'}
          </button>
        </div>
      </form>
    </div>
  )
}