'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inputStyle = {
  width: '100%',
  height: '38px',
  padding: '0 12px',
  border: '0.5px solid #e2e8f0',
  borderRadius: '7px',
  fontSize: '13px',
  outline: 'none',
  background: '#fff',
  color: '#0f172a',
}

const labelStyle = {
  display: 'block' as const,
  fontSize: '12px',
  fontWeight: '500' as const,
  color: '#475569',
  marginBottom: '5px',
}

const sectionTitle = {
  fontSize: '13px',
  fontWeight: '600' as const,
  color: '#0f172a',
  borderBottom: '0.5px solid #e2e8f0',
  paddingBottom: '8px',
  marginBottom: '16px',
  marginTop: '20px',
}

const ID_PROOF_TYPES = [
  'Aadhaar Card',
  'PAN Card',
  'Passport',
  'Voter ID',
  'Driving License',
  'Employee ID',
  'Other',
]

export default function CreateEmployeePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingId, setUploadingId] = useState(false)

  const [form, setForm] = useState({
    name: '',
    designation: '',
    department: '',
    branch: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    emergencyContact: '',
    emergencyPhone: '',
    joinDate: '',
    salary: '',
    skill: '',
    idProofType: '',
    idProofNumber: '',
    idProofUrl: '',
    profilePhotoUrl: '',
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handlePhotoUpload(file: File) {
    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'employee-photos')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Photo upload failed'); setUploadingPhoto(false); return }
      setForm(prev => ({ ...prev, profilePhotoUrl: data.url }))
    } catch {
      setError('Photo upload failed. Please try again.')
    }
    setUploadingPhoto(false)
  }

  async function handleIdUpload(file: File) {
    setUploadingId(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'employee-id-proofs')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'ID upload failed'); setUploadingId(false); return }
      setForm(prev => ({ ...prev, idProofUrl: data.url }))
    } catch {
      setError('ID upload failed. Please try again.')
    }
    setUploadingId(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Failed to add employee')
        setLoading(false)
        return
      }
      router.push('/dashboard/hr/workforce')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Add employee</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            Add a new employee or technician to the workforce
          </p>
        </div>
        <button
          onClick={() => router.back()}
          style={{ padding: '8px 16px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}
        >
          ← Back
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '24px' }}>

          {/* Profile Photo Upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '0.5px solid #e2e8f0' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: form.profilePhotoUrl ? 'transparent' : '#e6f1fb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', fontWeight: '700', color: '#185fa5',
              border: '2px solid #bfdbfe', overflow: 'hidden', flexShrink: 0,
            }}>
              {form.profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.profilePhotoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                form.name ? form.name.charAt(0).toUpperCase() : '👤'
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
                Profile photo
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                Upload a photo — JPG, PNG or WEBP, max 5MB
              </div>
              {form.profilePhotoUrl ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '500' }}>✓ Photo uploaded</span>
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, profilePhotoUrl: '' }))}
                    style={{ fontSize: '11px', color: '#dc2626', background: '#fef2f2', padding: '3px 10px', borderRadius: '5px', border: '0.5px solid #fecaca', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label style={{ cursor: uploadingPhoto ? 'not-allowed' : 'pointer', display: 'inline-block' }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '7px 14px', background: uploadingPhoto ? '#f1f5f9' : '#fff',
                    border: '0.5px solid #bfdbfe', borderRadius: '7px',
                    fontSize: '12px', fontWeight: '500', color: uploadingPhoto ? '#94a3b8' : '#1a56db',
                  }}>
                    {uploadingPhoto ? '⏳ Uploading...' : '📷 Browse photo'}
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    disabled={uploadingPhoto}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handlePhotoUpload(file)
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Personal Information */}
          <div style={{ ...sectionTitle, marginTop: 0 }}>👤 Personal information</div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Full name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Employee full name"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Phone *</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="employee@company.com"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Address</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Residential address"
              rows={2}
              style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' as const }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>City</label>
              <input name="city" value={form.city} onChange={handleChange} placeholder="City" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>State</label>
              <input name="state" value={form.state} onChange={handleChange} placeholder="State" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Country</label>
              <input name="country" value={form.country} onChange={handleChange} placeholder="Country" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Emergency contact name</label>
              <input name="emergencyContact" value={form.emergencyContact} onChange={handleChange} placeholder="Contact person name" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Emergency contact phone</label>
              <input name="emergencyPhone" value={form.emergencyPhone} onChange={handleChange} placeholder="Emergency phone number" style={inputStyle} />
            </div>
          </div>

          {/* ID Proof */}
          <div style={sectionTitle}>🪪 ID proof</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>ID proof type</label>
              <select name="idProofType" value={form.idProofType} onChange={handleChange} style={inputStyle}>
                <option value="">— Select ID type —</option>
                {ID_PROOF_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>ID proof number</label>
              <input
                name="idProofNumber"
                value={form.idProofNumber}
                onChange={handleChange}
                placeholder="e.g. XXXX XXXX XXXX"
                style={inputStyle}
              />
            </div>
          </div>

          {/* ID Proof Upload */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>ID proof file</label>
            <div style={{ border: '0.5px dashed #bfdbfe', borderRadius: '7px', padding: '16px', background: '#f8fafc', textAlign: 'center' as const }}>
              {form.idProofUrl ? (
                <div>
                  <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: '500', marginBottom: '8px' }}>
                    ✓ ID proof uploaded
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => window.open(form.idProofUrl, '_blank')}
                      style={{ fontSize: '11px', color: '#1a56db', background: '#eff6ff', padding: '4px 12px', borderRadius: '5px', border: '0.5px solid #bfdbfe', cursor: 'pointer' }}
                    >
                      📎 View file
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, idProofUrl: '' }))}
                      style={{ fontSize: '11px', color: '#dc2626', background: '#fef2f2', padding: '4px 12px', borderRadius: '5px', border: '0.5px solid #fecaca', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label style={{ cursor: uploadingId ? 'not-allowed' : 'pointer' }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>🪪</div>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: uploadingId ? '#93c5fd' : '#1a56db', marginBottom: '2px' }}>
                    {uploadingId ? '⏳ Uploading...' : 'Click to browse ID proof'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>JPG, PNG, PDF — max 5MB</div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    style={{ display: 'none' }}
                    disabled={uploadingId}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleIdUpload(file)
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Employment Details */}
          <div style={sectionTitle}>💼 Employment details</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Designation</label>
              <input name="designation" value={form.designation} onChange={handleChange} placeholder="e.g. Senior Technician" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Department</label>
              <select name="department" value={form.department} onChange={handleChange} style={inputStyle}>
                <option value="">— Select department —</option>
                {['Operations', 'Technical', 'Finance', 'HR', 'Sales', 'Management', 'Admin'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Branch / location</label>
              <input name="branch" value={form.branch} onChange={handleChange} placeholder="e.g. Mumbai HQ, Pune Branch" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Join date</label>
              <input type="date" name="joinDate" value={form.joinDate} onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Monthly salary (₹)</label>
              <input type="number" name="salary" value={form.salary} onChange={handleChange} placeholder="0" min="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Technical skills</label>
              <input name="skill" value={form.skill} onChange={handleChange} placeholder="e.g. CNC, Electrical, Hydraulics" style={inputStyle} />
            </div>
          </div>

          <div style={{ background: '#f0f7ff', border: '0.5px solid #bfdbfe', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#185fa5' }}>
            💡 If technical skills are filled, this employee will also be added as a technician and can be assigned to jobs.
          </div>

        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', padding: '16px', background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px' }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{ padding: '9px 20px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || uploadingPhoto || uploadingId}
            style={{ padding: '9px 24px', background: loading ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Saving...' : '💾 Save employee'}
          </button>
        </div>
      </form>
    </div>
  )
}