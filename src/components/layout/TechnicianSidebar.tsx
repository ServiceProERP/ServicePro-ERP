'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const menu = [
  { label: 'My dashboard',  icon: '▦',  href: '/dashboard/technician',          exact: true },
  { label: 'My jobs',       icon: '📋', href: '/dashboard/technician/jobs' },
  { label: 'My requests',   icon: '📝', href: '/dashboard/technician/requests' },
  { label: 'My payslips',   icon: '💵', href: '/dashboard/technician/payslips' },
  { label: 'My profile',    icon: '👤', href: '/dashboard/technician/profile' },
]

const quickActions = [
  { label: 'Apply for leave',      icon: '🏖', type: 'leave' },
  { label: 'Request job transfer', icon: '🔄', type: 'job_transfer' },
  { label: 'Claim expense',        icon: '💸', type: 'expense' },
  { label: 'Need material/parts',  icon: '🔩', type: 'material' },
]

export default function TechnicianSidebar({ user }: { user: { name: string; role: string } }) {
  const pathname = usePathname()
  const router = useRouter()
  const [pendingCount, setPendingCount] = useState(0)
  const [overdueCount, setOverdueCount] = useState(0)

  // Load notification counts
  useEffect(() => {
    fetch('/api/technician/dashboard')
      .then(r => r.json())
      .then(d => {
        setOverdueCount(d.stats?.overdue || 0)
      })
      .catch(() => {})

    fetch('/api/technician-requests')
      .then(r => r.json())
      .then(d => {
        const pending = (d.requests || []).filter((r: { status: string }) => r.status === 'pending').length
        setPendingCount(pending)
      })
      .catch(() => {})
  }, [pathname]) // refresh on route change

  function isActive(item: { href: string; exact?: boolean }) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  function getBadge(href: string) {
    if (href === '/dashboard/technician/requests' && pendingCount > 0) return pendingCount
    if (href === '/dashboard/technician/jobs' && overdueCount > 0) return overdueCount
    return null
  }

  return (
    <>
      <style>{`
        .tech-nav-item:hover { background: #1a2740 !important; color: #fff !important; }
        .tech-child:hover { background: #111827 !important; color: #a0c0e0 !important; }
        .tech-quick:hover { background: #1a2740 !important; color: #a0c0e0 !important; }
        .tech-logout:hover { background: #1e2d4a !important; color: #fff !important; }
        .sidebar-nav::-webkit-scrollbar { width: 4px; }
        .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
        .sidebar-nav::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 4px; }
      `}</style>

      <div style={{
        width: '220px', height: '100vh', position: 'fixed', top: 0, left: 0,
        background: '#0f1729',
        display: 'flex', flexDirection: 'column',
        zIndex: 100, borderRight: '0.5px solid #1e2d4a',
      }}>

        {/* Logo */}
        <div style={{ padding: '16px', borderBottom: '0.5px solid #1e2d4a', flexShrink: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#fff', letterSpacing: '0.2px' }}>
            Service Pro <span style={{ color: '#4a9eff' }}>ERP</span>
          </div>
          {/* Technician badge — same style as admin SPE DEMO badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '6px',
            background: '#1a2f50', border: '0.5px solid #2a4a70',
            borderRadius: '4px', padding: '3px 8px',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4a9eff' }} />
            <span style={{ fontSize: '10px', color: '#7ab0d8', letterSpacing: '0.5px', fontWeight: '600' }}>
              TECHNICIAN
            </span>
          </div>
        </div>

        {/* Nav */}
        <div className="sidebar-nav" style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>

          {/* Main menu */}
          <div style={{ padding: '0 8px', marginBottom: '4px' }}>
            {menu.map(item => {
              const active = isActive(item)
              const badge = getBadge(item.href)
              return (
                <div
                  key={item.href}
                  className="tech-nav-item"
                  onClick={() => router.push(item.href)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '9px',
                    padding: '9px 10px', borderRadius: '6px', cursor: 'pointer',
                    marginBottom: '2px',
                    color: active ? '#fff' : '#8aa4c0',
                    background: active ? '#1a2f50' : 'transparent',
                    borderLeft: active ? '2px solid #4a9eff' : '2px solid transparent',
                    fontSize: '13px', fontWeight: active ? '500' : '400',
                    transition: 'all 0.15s',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <span style={{ fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>
                    {item.label}
                  </div>
                  {badge !== null && (
                    <span style={{
                      background: item.href.includes('jobs') ? '#dc2626' : '#f59e0b',
                      color: '#fff', fontSize: '10px', fontWeight: '700',
                      padding: '1px 6px', borderRadius: '10px', flexShrink: 0,
                    }}>
                      {badge}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Divider */}
          <div style={{ margin: '8px 16px', height: '0.5px', background: '#1e2d4a' }} />

          {/* Quick actions */}
          <div style={{ padding: '0 8px' }}>
            <div style={{
              fontSize: '10px', color: '#4a6080', fontWeight: '600',
              textTransform: 'uppercase', letterSpacing: '0.6px',
              padding: '4px 10px 8px',
            }}>
              Quick actions
            </div>
            {quickActions.map(qa => (
              <div
                key={qa.type}
                className="tech-quick"
                onClick={() => router.push(`/dashboard/technician/requests/new?type=${qa.type}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '7px 10px', borderRadius: '6px', cursor: 'pointer',
                  color: '#5a7a9a', fontSize: '12px', marginBottom: '2px',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '13px' }}>{qa.icon}</span>
                {qa.label}
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ margin: '8px 16px', height: '0.5px', background: '#1e2d4a' }} />

          {/* Overdue alert if any */}
          {overdueCount > 0 && (
            <div
              onClick={() => router.push('/dashboard/technician/jobs?status=open')}
              style={{
                margin: '0 10px 8px', padding: '10px 12px',
                background: '#2d1515', border: '0.5px solid #7f1d1d',
                borderRadius: '8px', cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#fca5a5', marginBottom: '2px' }}>
                ⚠️ {overdueCount} overdue job{overdueCount > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '10px', color: '#7f1d1d' }}>Tap to view → action needed</div>
            </div>
          )}

          {/* Pending requests alert if any */}
          {pendingCount > 0 && (
            <div
              onClick={() => router.push('/dashboard/technician/requests')}
              style={{
                margin: '0 10px 8px', padding: '10px 12px',
                background: '#1c1a00', border: '0.5px solid #713f12',
                borderRadius: '8px', cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#fde68a', marginBottom: '2px' }}>
                📝 {pendingCount} pending request{pendingCount > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '10px', color: '#713f12' }}>Awaiting manager approval</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px', borderTop: '0.5px solid #1e2d4a',
          flexShrink: 0, background: '#0a1020',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: '#1a3060', border: '1.5px solid #2a4a80',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: '700', color: '#4a9eff', flexShrink: 0,
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '12px', fontWeight: '600', color: '#fff',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user.name}
              </div>
              <div style={{ fontSize: '10px', color: '#4a6080', marginTop: '1px' }}>Technician</div>
            </div>
          </div>
          <button
            className="tech-logout"
            onClick={handleLogout}
            style={{
              width: '100%', padding: '7px 12px',
              background: 'transparent', border: '0.5px solid #1e2d4a',
              borderRadius: '6px', color: '#5a7a9a', fontSize: '12px',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '6px', transition: 'all 0.15s',
            }}
          >
            <span>⎋</span> Sign out
          </button>
        </div>
      </div>
    </>
  )
}