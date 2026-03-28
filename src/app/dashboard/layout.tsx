import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import TechnicianSidebar from '@/components/layout/TechnicianSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/')

  const isTechnician = session.role === 'technician'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fb' }}>
      {isTechnician ? <TechnicianSidebar user={session} /> : <Sidebar user={session} />}

      <div style={{
        marginLeft: '220px', flex: 1,
        display: 'flex', flexDirection: 'column', minHeight: '100vh',
      }}>
        {/* Top header */}
        <div style={{
          height: '52px', background: '#fff',
          borderBottom: '0.5px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', position: 'sticky', top: 0, zIndex: 10,
        }}>
          {/* Left — tenant badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: isTechnician ? '#f0fdf4' : '#f0f7ff',
              border: `0.5px solid ${isTechnician ? '#bbf7d0' : '#bfdbfe'}`,
              borderRadius: '6px', padding: '4px 10px',
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
              <span style={{
                fontSize: '11px', fontWeight: '600',
                color: isTechnician ? '#16a34a' : '#1a56db',
                letterSpacing: '0.5px',
              }}>
                SPE DEMO
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#cbd5e1' }}>|</span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {isTechnician ? 'Technician Portal' : 'Service Pro ERP'}
            </span>
          </div>

          {/* Right — user info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              border: '0.5px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative', fontSize: '15px',
            }}>
              🔔
              <div style={{
                position: 'absolute', top: '6px', right: '6px',
                width: '7px', height: '7px',
                background: '#ef4444', borderRadius: '50%', border: '1.5px solid #fff',
              }} />
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '4px 10px', borderRadius: '8px', border: '0.5px solid #e2e8f0',
            }}>
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%',
                background: isTechnician ? '#0f2d17' : '#1a3060',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: '600',
                color: isTechnician ? '#4ade80' : '#4a9eff',
              }}>
                {session.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#0f172a' }}>
                  {session.name}
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'capitalize' }}>
                  {session.role}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main style={{ flex: 1, padding: '24px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}