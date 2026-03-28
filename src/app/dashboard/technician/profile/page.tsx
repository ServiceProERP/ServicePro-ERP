'use client'
import { useState, useEffect } from 'react'

type Profile = {
  id: string; name: string; empCode: string; designation: string | null
  department: string | null; phone: string; email: string | null
  skill: string | null; experience: number | null; joinDate: string | null
  address: string | null; isActive: boolean; profilePhoto: string | null
}

const inputStyle = {
  width: '100%', height: '38px', padding: '0 12px',
  border: '0.5px solid #e2e8f0', borderRadius: '7px',
  fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a',
}
const labelStyle = { display: 'block' as const, fontSize: '12px', fontWeight: '500' as const, color: '#475569', marginBottom: '5px' }

export default function MyProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [editForm, setEditForm] = useState({ phone: '', email: '' })

  useEffect(() => {
    fetch('/api/technician/profile')
      .then(r => r.json())
      .then(d => {
        setProfile(d.technician || null)
        if (d.technician) setEditForm({ phone: d.technician.phone || '', email: d.technician.email || '' })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/technician/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      setMessage({ text: 'Profile updated!', type: 'success' })
      setEditing(false)
      const data = await res.json()
      setProfile(data.technician)
    } else {
      setMessage({ text: 'Failed to update', type: 'error' })
    }
    setSaving(false)
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading profile...</div>
  if (!profile) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
      Profile not found. Contact HR to link your employee record to your user account.
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>My profile</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Your employee information — contact HR to update designation, salary or department</p>
      </div>

      {message.text && (
        <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#16a34a' : '#dc2626', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '16px' }}>

        {/* Avatar card */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '24px', textAlign: 'center', height: 'fit-content' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#0f2d17', border: '3px solid #4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '700', color: '#4ade80', margin: '0 auto 14px' }}>
            {profile.profilePhoto
              ? <img src={profile.profilePhoto} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : profile.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>{profile.name}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>{profile.designation || 'Technician'}</div>
          <div style={{ fontSize: '11px', background: '#eaf3de', color: '#3b6d11', padding: '3px 10px', borderRadius: '10px', display: 'inline-block', marginBottom: '4px' }}>
            {profile.isActive ? '✓ Active' : 'Inactive'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>{profile.empCode}</div>
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '8px', borderBottom: '0.5px solid #f1f5f9' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Personal information</div>
              {!editing ? (
                <button onClick={() => setEditing(true)} style={{ padding: '5px 12px', border: '0.5px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}>✏️ Edit contact</button>
              ) : (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={handleSave} disabled={saving} style={{ padding: '5px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#fff', background: '#1a56db', cursor: 'pointer' }}>{saving ? 'Saving...' : '💾 Save'}</button>
                  <button onClick={() => setEditing(false)} style={{ padding: '5px 12px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#475569', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Employee ID', value: profile.empCode, editable: false },
                { label: 'Department', value: profile.department || '—', editable: false },
                { label: 'Designation', value: profile.designation || '—', editable: false },
                { label: 'Join date', value: profile.joinDate ? new Date(profile.joinDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—', editable: false },
                { label: 'Skill / specialization', value: profile.skill || '—', editable: false },
                { label: 'Experience', value: profile.experience ? `${profile.experience} years` : '—', editable: false },
              ].map(f => (
                <div key={f.label}>
                  <label style={labelStyle}>{f.label}</label>
                  <div style={{ fontSize: '13px', color: '#0f172a', padding: '6px 0' }}>{f.value}</div>
                </div>
              ))}
              <div>
                <label style={labelStyle}>Phone {editing && <span style={{ color: '#1a56db' }}>(editable)</span>}</label>
                {editing ? <input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} style={inputStyle} /> : <div style={{ fontSize: '13px', color: '#0f172a', padding: '6px 0' }}>{profile.phone}</div>}
              </div>
              <div>
                <label style={labelStyle}>Email {editing && <span style={{ color: '#1a56db' }}>(editable)</span>}</label>
                {editing ? <input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} /> : <div style={{ fontSize: '13px', color: '#0f172a', padding: '6px 0' }}>{profile.email || '—'}</div>}
              </div>
            </div>
            {editing && (
              <div style={{ marginTop: '10px', background: '#f0f7ff', border: '0.5px solid #bfdbfe', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', color: '#185fa5' }}>
                💡 You can only update your phone and email. Contact HR to change name, designation, salary or department.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}