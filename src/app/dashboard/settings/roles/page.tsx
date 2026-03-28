'use client'
import { useState, useEffect, useCallback } from 'react'

type User = { id: string; name: string; email: string; role: string; isActive: boolean }

const allPages = [
  { id: 'dashboard', label: 'Dashboard', module: 'General' },
  { id: 'jobs', label: 'Job list', module: 'Operations' },
  { id: 'jobs-create', label: 'Create job', module: 'Operations' },
  { id: 'jobs-assignment', label: 'Job assignment', module: 'Operations' },
  { id: 'jobs-tracking', label: 'Job tracking', module: 'Operations' },
  { id: 'work-orders', label: 'Work orders', module: 'Operations' },
  { id: 'clients', label: 'Clients list', module: 'Clients & Vendors' },
  { id: 'vendors', label: 'Vendors list', module: 'Clients & Vendors' },
  { id: 'workforce', label: 'Workforce', module: 'HR' },
  { id: 'hr-docs', label: 'HR Documents', module: 'HR' },
  { id: 'invoices', label: 'Invoices', module: 'Finance' },
  { id: 'payments', label: 'Payments', module: 'Finance' },
  { id: 'receivable', label: 'Receivable', module: 'Finance' },
  { id: 'payable', label: 'Payable', module: 'Finance' },
  { id: 'expenses', label: 'Expenses', module: 'Finance' },
  { id: 'refunds', label: 'Refunds', module: 'Finance' },
  { id: 'payroll', label: 'Payroll dashboard', module: 'Payroll' },
  { id: 'salary', label: 'Salary structure', module: 'Payroll' },
  { id: 'payslips', label: 'Payslips', module: 'Payroll' },
  { id: 'attendance', label: 'Attendance', module: 'Payroll' },
  { id: 'advances', label: 'Salary advances', module: 'Payroll' },
  { id: 'inventory', label: 'Inventory list', module: 'Inventory' },
  { id: 'purchase-orders', label: 'Purchase orders', module: 'Inventory' },
  { id: 'materials', label: 'Materials', module: 'Inventory' },
  { id: 'quotations', label: 'Quotations', module: 'Sales' },
  { id: 'reports', label: 'Reports', module: 'Reports' },
  { id: 'settings', label: 'Settings', module: 'Settings' },
]

const roleDefaults: Record<string, string[]> = {
  superadmin: allPages.map(p => p.id),
  admin: allPages.map(p => p.id),
  manager: ['dashboard','jobs','jobs-create','jobs-assignment','jobs-tracking','work-orders','clients','vendors','workforce','invoices','payments','receivable','payable','expenses','inventory','purchase-orders','materials','quotations','reports'],
  accountant: ['dashboard','clients','invoices','payments','receivable','payable','expenses','refunds','payroll','salary','payslips','reports'],
  technician: ['dashboard','jobs','jobs-tracking','work-orders','inventory'],
  hr: ['dashboard','jobs','workforce','hr-docs','payroll','salary','payslips','attendance','advances','reports'],

  staff: ['dashboard','jobs','clients','inventory'],
}

const roleColors: Record<string, { bg: string; color: string }> = {
  superadmin: { bg: '#fef2f2', color: '#dc2626' },
  admin:      { bg: '#fbeaf0', color: '#993556' },
  manager:    { bg: '#eeedfe', color: '#534ab7' },
  technician: { bg: '#faeeda', color: '#854f0b' },
  accountant: { bg: '#e1f5ee', color: '#0f6e56' },
  staff:      { bg: '#f1f5f9', color: '#475569' },
  hr:         { bg: '#fdf4ff', color: '#7e22ce' },
}

const modules = [...new Set(allPages.map(p => p.module))]

export default function RolesPermissionsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'roles' | 'overrides'>('roles')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userAccess, setUserAccess] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/users')
    const data = await res.json()
    setUsers(data.users || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  function showMsg(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  function selectUser(user: User) {
    setSelectedUser(user)
    // Load default access for their role, then apply any stored overrides
    const defaults = roleDefaults[user.role] || []
    const access: Record<string, boolean> = {}
    allPages.forEach(p => { access[p.id] = defaults.includes(p.id) })

    // Load stored overrides from localStorage (in production this would come from DB)
    try {
      const stored = localStorage.getItem(`user_access_${user.id}`)
      if (stored) {
        const overrides = JSON.parse(stored)
        Object.assign(access, overrides)
      }
    } catch { /* ignore */ }

    setUserAccess(access)
  }

  function togglePage(pageId: string) {
    setUserAccess(prev => ({ ...prev, [pageId]: !prev[pageId] }))
  }

  function grantAll() {
    const all: Record<string, boolean> = {}
    allPages.forEach(p => { all[p.id] = true })
    setUserAccess(all)
  }

  function resetToRole() {
    if (!selectedUser) return
    const defaults = roleDefaults[selectedUser.role] || []
    const access: Record<string, boolean> = {}
    allPages.forEach(p => { access[p.id] = defaults.includes(p.id) })
    setUserAccess(access)
  }

  function revokeAll() {
    const none: Record<string, boolean> = {}
    allPages.forEach(p => { none[p.id] = false })
    setUserAccess(none)
  }

  async function saveOverrides() {
    if (!selectedUser) return
    setSaving(true)
    try {
      // Save to localStorage (in production: save to DB user_permissions table)
      localStorage.setItem(`user_access_${selectedUser.id}`, JSON.stringify(userAccess))
      showMsg(`Access saved for ${selectedUser.name}`, 'success')
    } catch {
      showMsg('Failed to save', 'error')
    }
    setSaving(false)
  }

  const grantedCount = Object.values(userAccess).filter(Boolean).length
  const roleDefault = selectedUser ? (roleDefaults[selectedUser.role] || []) : []
  const overrideCount = selectedUser ? allPages.filter(p => {
    const roleHas = roleDefault.includes(p.id)
    const userHas = userAccess[p.id]
    return roleHas !== userHas
  }).length : 0

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Roles & permissions</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          Role-based access control + per-user page overrides for special cases
        </p>
      </div>

      {message.text && (
        <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#16a34a' : '#dc2626', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', background: '#f8fafc', borderRadius: '8px', padding: '4px', width: 'fit-content' }}>
        {[
          { id: 'roles', label: '📋 Role matrix' },
          { id: 'overrides', label: '⚡ Per-user overrides' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as 'roles' | 'overrides')}
            style={{ padding: '7px 18px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', background: activeTab === tab.id ? '#fff' : 'transparent', color: activeTab === tab.id ? '#0f172a' : '#64748b', boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ROLE MATRIX TAB */}
      {activeTab === 'roles' && (
        <>
          <div style={{ background: '#f0f7ff', border: '0.5px solid #bfdbfe', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#185fa5' }}>
            💡 This matrix shows default page access per role. Use the <strong>Per-user overrides</strong> tab to grant or block specific pages for individual users regardless of their role.
          </div>

          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#0f172a', borderBottom: '0.5px solid #e2e8f0', position: 'sticky' as const, left: 0, background: '#f8fafc', zIndex: 1 }}>
                    PAGE
                  </th>
                  {Object.keys(roleDefaults).map(role => {
                    const rc = roleColors[role] || roleColors.staff
                    return (
                      <th key={role} style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: rc.color, borderBottom: '0.5px solid #e2e8f0', background: rc.bg }}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {modules.map(module => (
                  <>
                    <tr key={`module-${module}`} style={{ background: '#f8fafc' }}>
                      <td colSpan={Object.keys(roleDefaults).length + 1} style={{ padding: '6px 14px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '0.5px solid #e2e8f0' }}>
                        {module}
                      </td>
                    </tr>
                    {allPages.filter(p => p.module === module).map(page => (
                      <tr key={page.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '9px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#0f172a', position: 'sticky' as const, left: 0, background: 'inherit', zIndex: 1 }}>
                          {page.label}
                        </td>
                        {Object.keys(roleDefaults).map(role => {
                          const hasAccess = (roleDefaults[role] || []).includes(page.id)
                          return (
                            <td key={role} style={{ padding: '9px 14px', borderBottom: '0.5px solid #f1f5f9', textAlign: 'center' as const }}>
                              {hasAccess
                                ? <span style={{ color: '#16a34a', fontSize: '16px' }}>✓</span>
                                : <span style={{ color: '#e2e8f0', fontSize: '14px' }}>—</span>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* PER-USER OVERRIDES TAB */}
      {activeTab === 'overrides' && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '16px' }}>

          {/* User list */}
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px', height: 'fit-content' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>Select user</div>
            {loading ? (
              <div style={{ fontSize: '13px', color: '#64748b' }}>Loading...</div>
            ) : users.map(user => {
              const rc = roleColors[user.role] || roleColors.staff
              const isSelected = selectedUser?.id === user.id
              const hasOverride = (() => {
                try { return !!localStorage.getItem(`user_access_${user.id}`) } catch { return false }
              })()
              return (
                <div key={user.id} onClick={() => selectUser(user)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', cursor: 'pointer', marginBottom: '4px', background: isSelected ? '#eff6ff' : 'transparent', border: isSelected ? '0.5px solid #bfdbfe' : '0.5px solid transparent' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: rc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', color: rc.color, flexShrink: 0 }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                      <span style={{ fontSize: '10px', background: rc.bg, color: rc.color, padding: '1px 5px', borderRadius: '4px' }}>{user.role}</span>
                      {hasOverride && <span style={{ fontSize: '10px', background: '#faeeda', color: '#854f0b', padding: '1px 5px', borderRadius: '4px' }}>overrides</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Access matrix for selected user */}
          {selectedUser ? (
            <div>
              {/* Header */}
              <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{selectedUser.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Role: <strong>{selectedUser.role}</strong> · {grantedCount}/{allPages.length} pages · {overrideCount} override{overrideCount !== 1 ? 's' : ''} from role default
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={resetToRole} style={{ padding: '6px 12px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#475569', background: '#f8fafc', cursor: 'pointer' }}>↺ Reset to role</button>
                    <button onClick={grantAll} style={{ padding: '6px 12px', border: '0.5px solid #bbf7d0', borderRadius: '6px', fontSize: '12px', color: '#16a34a', background: '#f0fdf4', cursor: 'pointer' }}>✓ Grant all</button>
                    <button onClick={revokeAll} style={{ padding: '6px 12px', border: '0.5px solid #fecaca', borderRadius: '6px', fontSize: '12px', color: '#dc2626', background: '#fef2f2', cursor: 'pointer' }}>✕ Revoke all</button>
                    <button onClick={saveOverrides} disabled={saving} style={{ padding: '6px 16px', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#fff', background: saving ? '#93c5fd' : '#1a56db', cursor: 'pointer', fontWeight: '500' }}>
                      {saving ? 'Saving...' : '💾 Save overrides'}
                    </button>
                  </div>
                </div>

                {overrideCount > 0 && (
                  <div style={{ marginTop: '10px', background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', color: '#92400e' }}>
                    ⚡ {overrideCount} page{overrideCount !== 1 ? 's' : ''} deviate from the default {selectedUser.role} role — highlighted below
                  </div>
                )}
              </div>

              {/* Page access toggles */}
              <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                {modules.map(module => (
                  <div key={module} style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', paddingBottom: '4px', borderBottom: '0.5px solid #f1f5f9' }}>
                      {module}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {allPages.filter(p => p.module === module).map(page => {
                        const hasAccess = userAccess[page.id] || false
                        const roleHas = roleDefault.includes(page.id)
                        const isOverride = roleHas !== hasAccess
                        return (
                          <div key={page.id} onClick={() => togglePage(page.id)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '7px', border: `0.5px solid ${isOverride ? '#fde68a' : '#e2e8f0'}`, cursor: 'pointer', background: isOverride ? '#fffbeb' : hasAccess ? '#f0fdf4' : '#f8fafc' }}>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: '500', color: '#0f172a' }}>{page.label}</div>
                              {isOverride && (
                                <div style={{ fontSize: '10px', color: '#92400e', marginTop: '1px' }}>
                                  ⚡ {hasAccess ? 'Granted (role blocks)' : 'Blocked (role allows)'}
                                </div>
                              )}
                            </div>
                            <div style={{ width: '36px', height: '20px', background: hasAccess ? '#16a34a' : '#e2e8f0', borderRadius: '10px', position: 'relative' as const, flexShrink: 0, transition: 'background 0.2s' }}>
                              <div style={{ width: '14px', height: '14px', background: '#fff', borderRadius: '50%', position: 'absolute' as const, top: '3px', left: hasAccess ? '19px' : '3px', transition: 'left 0.2s' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              ← Select a user to configure their page access
            </div>
          )}
        </div>
      )}
    </div>
  )
}