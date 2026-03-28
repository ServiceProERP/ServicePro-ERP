'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'

type User = {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  password?: string
}

type Employee = {
  id: string
  empCode: string
  name: string
  designation: string | null
  department: string | null
  email: string | null
}

const roleColors: Record<string, { bg: string; color: string }> = {
  superadmin: { bg: '#fef2f2', color: '#dc2626' },
  admin:      { bg: '#fbeaf0', color: '#993556' },
  manager:    { bg: '#eeedfe', color: '#534ab7' },
  technician: { bg: '#faeeda', color: '#854f0b' },
  accountant: { bg: '#e1f5ee', color: '#0f6e56' },
  staff:      { bg: '#f1f5f9', color: '#475569' },
}

const inputStyle = {
  width: '100%', height: '38px', padding: '0 12px',
  border: '0.5px solid #e2e8f0', borderRadius: '7px',
  fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a',
}

const labelStyle = {
  display: 'block' as const,
  fontSize: '12px', fontWeight: '500' as const,
  color: '#475569', marginBottom: '5px',
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [showPasswords, setShowPasswords] = useState(false)
  const [loadingPasswords, setLoadingPasswords] = useState(false)
  const [resetModal, setResetModal] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [selectedEmpId, setSelectedEmpId] = useState('')
  const [userMode, setUserMode] = useState<'employee' | 'manual'>('employee')

  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'staff', empCode: '',
  })

  const fetchUsers = useCallback(async (withPwd = false) => {
    setLoading(true)
    const url = withPwd ? '/api/users?includePasswords=true' : '/api/users'
    const res = await fetch(url)
    const data = await res.json()
    setUsers(data.users || [])
    setLoading(false)
  }, [])

  const fetchEmployees = useCallback(async () => {
    const res = await fetch('/api/employees?limit=200')
    const data = await res.json()
    setEmployees(data.employees || [])
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchEmployees()
  }, [fetchUsers, fetchEmployees])

  function showMsg(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 4000)
  }

  function selectEmployee(empId: string) {
    const emp = employees.find(e => e.id === empId)
    if (!emp) return
    setSelectedEmpId(empId)
    setForm(p => ({
      ...p,
      name: emp.name,
      email: emp.email || '',
      empCode: emp.empCode,
    }))
  }

  async function handleShowPasswords() {
    if (showPasswords) { setShowPasswords(false); fetchUsers(false); return }
    setLoadingPasswords(true)
    const res = await fetch('/api/users?includePasswords=true')
    const data = await res.json()
    setUsers(data.users || [])
    setShowPasswords(true)
    setLoadingPasswords(false)
  }

  // Decode bcrypt hash to show original — not possible, show placeholder
  // Instead we show a "Reset password" option for admin
  function maskPassword(hash: string) {
    // Show first 8 chars of hash so admin can identify if password was changed
    return `[hashed] ${hash?.slice(0, 16)}...`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) {
      showMsg('Name, email and password are required', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        showMsg(data.message || 'Failed to create user', 'error')
      } else {
        showMsg('User created successfully!', 'success')
        setForm({ name: '', email: '', password: '', role: 'staff', empCode: '' })
        setSelectedEmpId('')
        setShowForm(false)
        fetchUsers()
      }
    } catch {
      showMsg('Something went wrong', 'error')
    }
    setSubmitting(false)
  }

  async function toggleStatus(id: string, isActive: boolean) {
    await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    fetchUsers(showPasswords)
    showMsg(`User ${isActive ? 'deactivated' : 'activated'}`, 'success')
  }

  async function updateRole(id: string, role: string) {
    await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    fetchUsers(showPasswords)
    showMsg('Role updated successfully', 'success')
  }

  async function resetPassword() {
    if (!resetModal || !newPassword) return
    if (newPassword.length < 6) { showMsg('Password must be at least 6 characters', 'error'); return }
    setResetting(true)
    try {
      const res = await fetch(`/api/users/${resetModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetPassword: newPassword }),
      })
      if (res.ok) {
        showMsg(`Password reset for ${resetModal.name}`, 'success')
        setResetModal(null)
        setNewPassword('')
        fetchUsers(showPasswords)
      } else {
        showMsg('Failed to reset password', 'error')
      }
    } catch {
      showMsg('Something went wrong', 'error')
    }
    setResetting(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>User management</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Manage system users, roles and access</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleShowPasswords}
            disabled={loadingPasswords}
            style={{ padding: '9px 14px', border: `0.5px solid ${showPasswords ? '#fecaca' : '#e2e8f0'}`, borderRadius: '8px', fontSize: '13px', color: showPasswords ? '#dc2626' : '#475569', background: showPasswords ? '#fef2f2' : '#fff', cursor: 'pointer' }}
          >
            {loadingPasswords ? '...' : showPasswords ? '🔒 Hide passwords' : '👁 View passwords'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ background: '#1a56db', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
          >
            + Add user
          </button>
        </div>
      </div>

      {showPasswords && (
        <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#dc2626' }}>
          🔒 Password view mode — passwords are hashed (bcrypt) and cannot be reversed. Use Reset Password to set a new one.
        </div>
      )}

      {message.text && (
        <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#16a34a' : '#dc2626', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Total users', value: users.length, color: '#0f172a', bg: '#fff' },
          { label: 'Active', value: users.filter(u => u.isActive).length, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Admins', value: users.filter(u => u.role === 'admin' || u.role === 'superadmin').length, color: '#993556', bg: '#fbeaf0' },
          { label: 'Technicians', value: users.filter(u => u.role === 'technician').length, color: '#854f0b', bg: '#faeeda' },
          { label: 'Inactive', value: users.filter(u => !u.isActive).length, color: '#94a3b8', bg: '#f8fafc' },
        ].map(stat => (
          <div key={stat.label} style={{ background: stat.bg, border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{stat.label}</div>
            <div style={{ fontSize: '22px', fontWeight: '600', color: stat.color, marginTop: '4px' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Add User Form */}
      {showForm && (
        <div style={{ background: '#fff', border: '0.5px solid #bfdbfe', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '16px', paddingBottom: '8px', borderBottom: '0.5px solid #e2e8f0' }}>
            Create new user
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button type="button" onClick={() => setUserMode('employee')}
              style={{ padding: '6px 14px', border: `0.5px solid ${userMode === 'employee' ? '#1a56db' : '#e2e8f0'}`, borderRadius: '6px', fontSize: '12px', color: userMode === 'employee' ? '#1a56db' : '#475569', background: userMode === 'employee' ? '#eff6ff' : '#fff', cursor: 'pointer', fontWeight: userMode === 'employee' ? '600' : '400' }}>
              👷 Link to existing employee
            </button>
            <button type="button" onClick={() => setUserMode('manual')}
              style={{ padding: '6px 14px', border: `0.5px solid ${userMode === 'manual' ? '#1a56db' : '#e2e8f0'}`, borderRadius: '6px', fontSize: '12px', color: userMode === 'manual' ? '#1a56db' : '#475569', background: userMode === 'manual' ? '#eff6ff' : '#fff', cursor: 'pointer', fontWeight: userMode === 'manual' ? '600' : '400' }}>
              ✏️ Create manually
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {userMode === 'employee' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Select employee *</label>
                <select value={selectedEmpId} onChange={e => selectEmployee(e.target.value)} style={inputStyle}>
                  <option value="">— Choose from employee database —</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.empCode} — {e.name} {e.designation ? `(${e.designation})` : ''}
                    </option>
                  ))}
                </select>
                {selectedEmpId && (
                  <div style={{ marginTop: '8px', background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '6px', padding: '10px 12px', fontSize: '12px' }}>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{form.name}</div>
                    <div style={{ color: '#64748b', marginTop: '2px' }}>
                      ID: {form.empCode} {form.email ? `· ${form.email}` : '· No email on file'}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '14px' }}>
              {userMode === 'manual' && (
                <div>
                  <label style={labelStyle}>Full name *</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="User full name" style={inputStyle} />
                </div>
              )}
              <div>
                <label style={labelStyle}>Login email *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="user@company.com" style={inputStyle} />
                {userMode === 'employee' && !form.email && selectedEmpId && (
                  <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '3px' }}>⚠️ No email in employee record — enter manually</div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Password *</label>
                <input type="text" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Set login password" style={inputStyle} />
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>Share this password with the employee to log in</div>
              </div>
              <div>
                <label style={labelStyle}>Role *</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={inputStyle}>
                  {['superadmin', 'admin', 'manager', 'technician', 'accountant', 'staff'].map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Role description */}
            <div style={{ background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px', marginBottom: '14px', fontSize: '12px', color: '#475569' }}>
              {form.role === 'superadmin' && '🔴 Superadmin — Full unrestricted access to everything including all settings and user passwords'}
              {form.role === 'admin' && '🟣 Admin — Full access to all modules and settings'}
              {form.role === 'manager' && '🟣 Manager — Operations, finance, reports. No settings access'}
              {form.role === 'technician' && '🟡 Technician — Can view and update their assigned jobs only'}
              {form.role === 'accountant' && '🟢 Accountant — Full finance and payroll access'}
              {form.role === 'staff' && '⚪ Staff — View-only access to basic modules'}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={submitting || (userMode === 'employee' && !selectedEmpId)} style={{ padding: '9px 20px', background: submitting ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                {submitting ? 'Creating...' : '+ Create user'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setSelectedEmpId(''); setForm({ name: '', email: '', password: '', role: 'staff', empCode: '' }) }} style={{ padding: '9px 20px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['User', 'Email', showPasswords ? 'Password hash' : '', 'Role', 'Status', 'Created', 'Actions'].filter(Boolean).map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading users...</td></tr>
            ) : users.map(user => {
              const role = roleColors[user.role] || roleColors.staff
              return (
                <tr key={user.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e6f1fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '600', color: '#185fa5', flexShrink: 0 }}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{user.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#475569' }}>{user.email}</td>
                  {showPasswords && (
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {user.password ? maskPassword(user.password) : '—'}
                    </td>
                  )}
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <select
                      value={user.role}
                      onChange={e => updateRole(user.id, e.target.value)}
                      style={{ height: '28px', padding: '0 6px', border: `0.5px solid ${role.color}20`, borderRadius: '5px', fontSize: '11px', color: role.color, background: role.bg, cursor: 'pointer', outline: 'none' }}
                    >
                      {['superadmin', 'admin', 'manager', 'technician', 'accountant', 'staff'].map(r => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <span style={{ background: user.isActive ? '#eaf3de' : '#f1f5f9', color: user.isActive ? '#3b6d11' : '#94a3b8', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' as const }}>{formatDate(user.createdAt)}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => { setResetModal(user); setNewPassword('') }} style={{ padding: '4px 8px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '11px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}>
                        🔑 Reset pwd
                      </button>
                      <button onClick={() => toggleStatus(user.id, user.isActive)} style={{ padding: '4px 8px', border: `0.5px solid ${user.isActive ? '#fecaca' : '#bbf7d0'}`, borderRadius: '5px', fontSize: '11px', color: user.isActive ? '#dc2626' : '#16a34a', background: user.isActive ? '#fef2f2' : '#f0fdf4', cursor: 'pointer' }}>
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Reset Password Modal */}
      {resetModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>Reset password</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>{resetModal.name} — {resetModal.email}</div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>New password *</label>
              <input
                type="text"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                style={inputStyle}
              />
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>Share this new password with the user after resetting</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={resetPassword} disabled={resetting || !newPassword} style={{ flex: 1, padding: '9px', background: '#1a56db', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                {resetting ? 'Resetting...' : '🔑 Reset password'}
              </button>
              <button onClick={() => setResetModal(null)} style={{ flex: 1, padding: '9px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function maskPassword(hash: string) {
  return `[bcrypt] ${hash?.slice(0, 20)}...`
}