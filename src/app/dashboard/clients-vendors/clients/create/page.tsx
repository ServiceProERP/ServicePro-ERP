'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inputStyle = {
  width: '100%', height: '38px', padding: '0 12px',
  border: '0.5px solid #e2e8f0', borderRadius: '7px',
  fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a',
}
const labelStyle = { display: 'block' as const, fontSize: '12px', fontWeight: '500' as const, color: '#475569', marginBottom: '5px' }
const sectionTitle = { fontSize: '13px', fontWeight: '600' as const, color: '#0f172a', borderBottom: '0.5px solid #e2e8f0', paddingBottom: '8px', marginBottom: '14px', marginTop: '20px' }
const selectStyle = { width: '100%', height: '38px', padding: '0 12px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a', cursor: 'pointer' }

export default function CreateClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    companyName: '', contactPerson: '', phone: '', email: '',
    address: '', city: '', postalCode: '', state: '', country: 'India',
    gstin: '', creditLimit: '', clientType: 'walk-in',
    status: 'active', preferredContact: 'phone', industry: '', notes: '',
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
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Failed to create client'); setLoading(false); return }
      router.push('/dashboard/clients-vendors/clients')
    } catch {
      setError('Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Create client</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Add a new customer to your client master</p>
        </div>
        <button onClick={() => router.back()} style={{ padding: '8px 16px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>← Back</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '24px' }}>

          <div style={{ ...sectionTitle, marginTop: 0 }}>Company information</div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Company name *</label>
            <input name="companyName" value={form.companyName} onChange={handleChange} placeholder="e.g. Soham Technologies Pvt Ltd" required style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div><label style={labelStyle}>Contact person *</label><input name="contactPerson" value={form.contactPerson} onChange={handleChange} placeholder="Primary contact name" required style={inputStyle} /></div>
            <div><label style={labelStyle}>Phone *</label><input name="phone" value={form.phone} onChange={handleChange} placeholder="Mobile / office number" required style={inputStyle} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div><label style={labelStyle}>Email</label><input name="email" type="email" value={form.email} onChange={handleChange} placeholder="company@email.com" style={inputStyle} /></div>
            <div>
              <label style={labelStyle}>Preferred contact</label>
              <select name="preferredContact" value={form.preferredContact} onChange={handleChange} style={selectStyle}>
                <option value="phone">Phone</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Address</label>
            <textarea name="address" value={form.address} onChange={handleChange} placeholder="Full company address" rows={2} style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' as const }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div><label style={labelStyle}>City</label><input name="city" value={form.city} onChange={handleChange} placeholder="Mumbai" style={inputStyle} /></div>
            <div><label style={labelStyle}>Postal code</label><input name="postalCode" value={form.postalCode} onChange={handleChange} placeholder="400001" style={inputStyle} /></div>
            <div><label style={labelStyle}>State</label><input name="state" value={form.state} onChange={handleChange} placeholder="Maharashtra" style={inputStyle} /></div>
            <div><label style={labelStyle}>Country</label><input name="country" value={form.country} onChange={handleChange} placeholder="India" style={inputStyle} /></div>
          </div>

          <div style={sectionTitle}>Classification & status</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Client type</label>
              <select name="clientType" value={form.clientType} onChange={handleChange} style={selectStyle}>
                <option value="walk-in">Walk-in</option>
                <option value="contract">Contract</option>
                <option value="amc">AMC</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Industry</label>
              <select name="industry" value={form.industry} onChange={handleChange} style={selectStyle}>
                <option value="">— Select —</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Hospitality">Hospitality</option>
                <option value="Government">Government</option>
                <option value="Retail">Retail</option>
                <option value="IT">IT</option>
                <option value="Education">Education</option>
                <option value="Construction">Construction</option>
                <option value="Transport">Transport</option>
                <option value="Other">Other</option>
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
            <div><label style={labelStyle}>Credit limit (₹)</label><input name="creditLimit" type="number" value={form.creditLimit} onChange={handleChange} placeholder="0" min="0" style={inputStyle} /></div>
          </div>

          <div style={sectionTitle}>Billing information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div><label style={labelStyle}>GSTIN</label><input name="gstin" value={form.gstin} onChange={handleChange} placeholder="GST number (optional)" style={inputStyle} /></div>
          </div>

          <div style={sectionTitle}>Internal notes</div>
          <div style={{ marginBottom: '14px' }}>
            <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Any internal notes about this client..." rows={3} style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' as const }} />
          </div>

        </div>

        {error && <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginTop: '16px' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', padding: '16px', background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px' }}>
          <button type="button" onClick={() => router.back()} style={{ padding: '9px 20px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" disabled={loading} style={{ padding: '9px 24px', background: loading ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Saving...' : '💾 Save client'}
          </button>
        </div>
      </form>
    </div>
  )
}