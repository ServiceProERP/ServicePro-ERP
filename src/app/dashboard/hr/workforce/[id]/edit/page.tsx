'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

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
  'Aadhaar Card', 'PAN Card', 'Passport',
  'Voter ID', 'Driving License', 'Employee ID', 'Other',
]

type Employee = {
  id: string
  empCode: string
  name: string
  designation: string | null
  department: string | null
  branch: string | null
  phone: string
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  emergencyContact: string | null
  emergencyPhone: string | null
  joinDate: string | null
  salary: number
  skill: string | null
  idProofType: string | null
  idProofNumber: string | null
  idProofUrl: string | null
  profilePhotoUrl: string | null
  status: string
}

export default function EditEmployeePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
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
    status: 'active',
  })

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/employees/${id}`)
        const data = await res.json()
        if (!res.ok) { setError('Failed to load employee'); setLoading(false); return }
        const emp: Employee = data.employee
        setForm({
          name: emp.name || '',
          designation: emp.designation || '',
          department: emp.department || '',
          branch: emp.branch || '',
          phone: emp.phone || '',
          email: emp.email || '',
          address: emp.address || '',
          city: emp.city || '',
          state: emp.state || '',
          country: emp.country || 'India',
          emergencyContact: emp.emergencyContact || '',
          emergencyPhone: emp.emergencyPhone || '',
          joinDate: emp.joinDate ? emp.joinDate.slice(0, 10) : '',
          salary: emp.salary ? String(emp.salary) : '',
          skill: emp.skill || '',
          idProofType: emp.idProofType || '',
          idProofNumber: emp.idProofNumber || '',
          idProofUrl: emp.idProofUrl || '',
          profilePhotoUrl: emp.profilePhotoUrl || '',
          status: emp.status || 'active',
        })
      } catch {
        setError('Something went wrong')
      }
      setLoading(false)
    }
    if (id) load()
  }, [id])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleFileUpload(
    file: File,
    folder: string,
    field: 'profilePhotoUrl' | 'idProofUrl',
    setUploading: (v: boolean) => void
  ) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Upload failed')
        setUploading(false)
        return
      }
      set(field, data.url)
    } catch {
      setError('Upload failed. Please try again.')
    }
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Failed to update employee')
        setSaving(false)
        return
      }
      setSuccess('Employee updated successfully!')
      setTimeout(() => router.push('/dashboard/hr/workforce'), 1500)
    } catch {
      setError('Something went wrong')
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
      Loading employee...
    </div>
  )

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Edit employee</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Update employee information</p>
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

      {success && (
        <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', color: '#16a34a', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '24px' }}>

          {/* Profile Photo Upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '0.5px solid #e2e8f0' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
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
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>Profile photo</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>JPG, PNG or WEBP — max 5MB</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{
                  padding: '7px 14px',
                  background: uploadingPhoto ? '#93c5fd' : '#1a56db',
                  color: '#fff', borderRadius: '7px', fontSize: '12px',
                  fontWeight: '500', cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
                  display: 'inline-block',
                }}>
                  {uploadingPhoto ? 'Uploading...' : '📷 Browse photo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    disabled={uploadingPhoto}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file, 'profile-photos', 'profilePhotoUrl', setUploadingPhoto)
                    }}
                  />
                </label>
                {form.profilePhotoUrl && (
                  <button
                    type="button"
                    onClick={() => set('profilePhotoUrl', '')}
                    style={{ padding: '7px 12px', border: '0.5px solid #fecaca', borderRadius: '7px', fontSize: '12px', color: '#dc2626', background: '#fef2f2', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Employee status</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { value: 'active', label: '✓ Active', bg: '#eaf3de', color: '#3b6d11', border: '#bbf7d0' },
                { value: 'blocked', label: '⏸ Blocked', bg: '#faeeda', color: '#854f0b', border: '#fde68a' },
                { value: 'blacklisted', label: '✕ Blacklisted', bg: '#fcebeb', color: '#a32d2d', border: '#fecaca' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('status', opt.value)}
                  style={{
                    padding: '7px 16px',
                    background: form.status === opt.value ? opt.bg : '#fff',
                    color: form.status === opt.value ? opt.color : '#475569',
                    border: `0.5px solid ${form.status === opt.value ? opt.border : '#e2e8f0'}`,
                    borderRadius: '7px', fontSize: '12px',
                    fontWeight: form.status === opt.value ? '600' : '400',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Personal Info */}
          <div style={{ ...sectionTitle, marginTop: 0 }}>👤 Personal information</div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Full name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Employee full name" required style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Phone *</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="employee@company.com" style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Address</label>
            <textarea value={form.address} onChange={e => set('address', e.target.value)} placeholder="Residential address" rows={2} style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' as const }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>City</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>State</label>
              <input value={form.state} onChange={e => set('state', e.target.value)} placeholder="State" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Country</label>
              <input value={form.country} onChange={e => set('country', e.target.value)} placeholder="Country" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Emergency contact name</label>
              <input value={form.emergencyContact} onChange={e => set('emergencyContact', e.target.value)} placeholder="Contact person name" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Emergency contact phone</label>
              <input value={form.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} placeholder="Emergency phone number" style={inputStyle} />
            </div>
          </div>

          {/* ID Proof */}
          <div style={sectionTitle}>🪪 ID proof</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>ID proof type</label>
              <select value={form.idProofType} onChange={e => set('idProofType', e.target.value)} style={inputStyle}>
                <option value="">— Select ID type —</option>
                {ID_PROOF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>ID proof number</label>
              <input value={form.idProofNumber} onChange={e => set('idProofNumber', e.target.value)} placeholder="e.g. XXXX XXXX XXXX" style={inputStyle} />
            </div>
          </div>

          {/* ID Proof Upload */}
          <div style={{ marginBottom: '20px', padding: '14px', background: '#f8fafc', borderRadius: '8px', border: '0.5px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>ID proof document</div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{
                padding: '7px 14px',
                background: uploadingId ? '#93c5fd' : '#fff',
                color: uploadingId ? '#fff' : '#475569',
                border: '0.5px solid #e2e8f0',
                borderRadius: '7px', fontSize: '12px', cursor: uploadingId ? 'not-allowed' : 'pointer',
                display: 'inline-block',
              }}>
                {uploadingId ? 'Uploading...' : '📎 Browse ID proof'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  style={{ display: 'none' }}
                  disabled={uploadingId}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file, 'id-proofs', 'idProofUrl', setUploadingId)
                  }}
                />
              </label>
              {form.idProofUrl && (
                <>
                  <a href={form.idProofUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#1a56db', textDecoration: 'none', background: '#eff6ff', padding: '7px 12px', borderRadius: '7px', border: '0.5px solid #bfdbfe' }}>
                    📄 View uploaded file
                  </a>
                  <button type="button" onClick={() => set('idProofUrl', '')} style={{ padding: '7px 12px', border: '0.5px solid #fecaca', borderRadius: '7px', fontSize: '12px', color: '#dc2626', background: '#fef2f2', cursor: 'pointer' }}>
                    Remove
                  </button>
                </>
              )}
            </div>
            {form.idProofUrl && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#16a34a' }}>
                ✓ ID proof uploaded successfully
              </div>
            )}
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
              Accepted: JPG, PNG, WEBP, PDF — max 5MB
            </div>
          </div>

          {/* Employment Details */}
          <div style={sectionTitle}>💼 Employment details</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Designation</label>
              <input value={form.designation} onChange={e => set('designation', e.target.value)} placeholder="e.g. Senior Technician" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Department</label>
              <select value={form.department} onChange={e => set('department', e.target.value)} style={inputStyle}>
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
              <input value={form.branch} onChange={e => set('branch', e.target.value)} placeholder="e.g. Mumbai HQ, Pune Branch" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Join date</label>
              <input type="date" value={form.joinDate} onChange={e => set('joinDate', e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Monthly salary (₹)</label>
              <input type="number" value={form.salary} onChange={e => set('salary', e.target.value)} placeholder="0" min="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Technical skills</label>
              <input value={form.skill} onChange={e => set('skill', e.target.value)} placeholder="e.g. CNC, Electrical, Hydraulics" style={inputStyle} />
            </div>
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
            disabled={saving}
            style={{ padding: '9px 24px', background: saving ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Saving...' : '💾 Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}