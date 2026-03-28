'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

type MenuItem = {
  label: string
  icon?: string
  href?: string
  single?: boolean
  roles?: string[]
  children?: { label: string; href: string; roles?: string[] }[]
}

const menuItems: MenuItem[] = [
  { label: 'Dashboard', icon: '▦', href: '/dashboard', single: true },
  {
    label: 'Operations', icon: '⚙',
    roles: ['superadmin', 'admin', 'manager', 'staff'],
    children: [
      { label: 'Job list',       href: '/dashboard/operations/jobs' },
      { label: 'Create job',     href: '/dashboard/operations/jobs/create',     roles: ['superadmin', 'admin', 'manager'] },
      { label: 'Job assignment', href: '/dashboard/operations/jobs/assignment', roles: ['superadmin', 'admin', 'manager'] },
      { label: 'Job tracking',   href: '/dashboard/operations/jobs/tracking' },
      { label: 'Work orders',    href: '/dashboard/operations/work-orders' },
    ],
  },
  {
    label: 'Clients & vendors', icon: '👥',
    roles: ['superadmin', 'admin', 'manager', 'accountant', 'hr', 'staff'],
    children: [
      { label: 'Clients list',   href: '/dashboard/clients-vendors/clients' },
      { label: 'Create client',  href: '/dashboard/clients-vendors/clients/create', roles: ['superadmin', 'admin', 'manager'] },
      { label: 'Vendors list',   href: '/dashboard/clients-vendors/vendors',        roles: ['superadmin', 'admin', 'manager'] },
      { label: 'Create vendor',  href: '/dashboard/clients-vendors/vendors/create', roles: ['superadmin', 'admin', 'manager'] },
    ],
  },
  {
    label: 'Workforce & HR', icon: '👷',
    roles: ['superadmin', 'admin', 'manager', 'hr'],
    children: [
      { label: 'Workforce list',       href: '/dashboard/hr/workforce' },
      { label: 'HR docs',              href: '/dashboard/hr/docs' },
      { label: 'Technician requests',  href: '/dashboard/hr/technician-requests' },
    ],
  },
  {
    label: 'Finance & accounts', icon: '💰',
    roles: ['superadmin', 'admin', 'manager', 'accountant'],
    children: [
      { label: 'Invoices',             href: '/dashboard/finance/invoices' },
      { label: 'Payments',             href: '/dashboard/finance/payments' },
      { label: 'Accounts receivable',  href: '/dashboard/finance/receivable' },
      { label: 'Accounts payable',     href: '/dashboard/finance/payable' },
      { label: 'Expenses',             href: '/dashboard/finance/expenses' },
      { label: 'Refunds',              href: '/dashboard/finance/refunds' },
    ],
  },
  {
    label: 'Payroll', icon: '🧾',
    roles: ['superadmin', 'admin', 'manager', 'accountant', 'hr'],
    children: [
      { label: 'Payroll dashboard', href: '/dashboard/payroll' },
      { label: 'Salary structure',  href: '/dashboard/payroll/salary' },
      { label: 'Payslips',          href: '/dashboard/payroll/payslips' },
      { label: 'Attendance',        href: '/dashboard/payroll/attendance' },
      { label: 'Salary advances',   href: '/dashboard/payroll/advances' },
      { label: 'Bank transfer',     href: '/dashboard/payroll/bank-transfer',  roles: ['superadmin', 'admin', 'accountant'] },
      { label: 'PF & ESIC challan', href: '/dashboard/payroll/pf-esic',        roles: ['superadmin', 'admin', 'accountant'] },
      { label: 'Form 16',           href: '/dashboard/payroll/form16',          roles: ['superadmin', 'admin', 'accountant'] },
      { label: 'Salary history',    href: '/dashboard/payroll/salary-history' },
    ],
  },
  {
    label: 'Inventory', icon: '📦',
    roles: ['superadmin', 'admin', 'manager', 'staff'],
    children: [
      { label: 'Inventory list',       href: '/dashboard/inventory' },
      { label: 'Stock transactions',   href: '/dashboard/inventory/transactions' },
      { label: 'Purchase orders',      href: '/dashboard/inventory/purchase-orders', roles: ['superadmin', 'admin', 'manager'] },
      { label: 'Material requirement', href: '/dashboard/inventory/materials' },
    ],
  },
  {
    label: 'Sales', icon: '📈',
    roles: ['superadmin', 'admin', 'manager'],
    children: [
      { label: 'Quotations', href: '/dashboard/sales/quotations' },
    ],
  },
  {
    label: 'Reports', icon: '📊',
    roles: ['superadmin', 'admin', 'manager', 'accountant', 'hr'],
    children: [
      { label: 'Reports list',  href: '/dashboard/reports' },
      { label: 'Report viewer', href: '/dashboard/reports/viewer' },
    ],
  },
  {
    label: 'Settings', icon: '⚙',
    roles: ['superadmin', 'admin'],
    children: [
      { label: 'User management',     href: '/dashboard/settings/users' },
      { label: 'Roles & permissions', href: '/dashboard/settings/roles' },
      { label: 'System config',       href: '/dashboard/settings/config' },
    ],
  },
]

function filterMenu(items: MenuItem[], role: string): MenuItem[] {
  return items
    .filter(item => !item.roles || item.roles.includes(role))
    .map(item => ({
      ...item,
      children: item.children?.filter(c => !c.roles || c.roles.includes(role)),
    }))
    .filter(item => item.single || (item.children && item.children.length > 0))
}

export default function Sidebar({ user }: { user: { name: string; role: string } }) {
  const pathname = usePathname()
  const router = useRouter()
  const [openGroups, setOpenGroups] = useState<string[]>([])

  const visibleMenu = filterMenu(menuItems, user.role)

  function toggleGroup(label: string) {
    setOpenGroups(prev =>
      prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]
    )
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <>
      <style>{`
        .sidebar-nav::-webkit-scrollbar { width: 4px; }
        .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
        .sidebar-nav::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 4px; }
        .sidebar-nav::-webkit-scrollbar-thumb:hover { background: #2a4a70; }
        .nav-item:hover { background: #1a2740 !important; color: #fff !important; }
        .nav-child:hover { background: #111827 !important; color: #a0c0e0 !important; }
        .logout-btn:hover { background: #1e2d4a !important; color: #fff !important; }
      `}</style>

      <div style={{
        width: '220px', height: '100vh', position: 'fixed', top: 0, left: 0,
        background: '#0f1729', display: 'flex', flexDirection: 'column',
        zIndex: 100, borderRight: '0.5px solid #1e2d4a',
      }}>

        {/* Logo */}
        <div style={{ padding: '16px', borderBottom: '0.5px solid #1e2d4a', flexShrink: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#fff', letterSpacing: '0.2px' }}>
            Service Pro <span style={{ color: '#4a9eff' }}>ERP</span>
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '6px',
            background: '#1a2f50', border: '0.5px solid #2a4a70', borderRadius: '4px', padding: '3px 8px',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: '10px', color: '#7ab0d8', letterSpacing: '0.5px' }}>SPE DEMO</span>
          </div>
        </div>

        {/* Nav */}
        <div className="sidebar-nav" style={{
          flex: 1, overflowY: 'auto', padding: '6px 0',
          scrollbarWidth: 'thin', scrollbarColor: '#1e3a5f transparent',
        }}>
          {visibleMenu.map(item => {
            if (item.single) {
              const active = pathname === item.href
              return (
                <div key={item.href} className="nav-item" onClick={() => router.push(item.href!)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 16px', cursor: 'pointer',
                    color: active ? '#fff' : '#8aa4c0',
                    background: active ? '#1a2f50' : 'transparent',
                    borderLeft: active ? '2px solid #4a9eff' : '2px solid transparent',
                    fontSize: '13px', transition: 'all 0.15s',
                  }}>
                  <span style={{ fontSize: '13px' }}>{item.icon}</span>
                  {item.label}
                </div>
              )
            }

            const isOpen = openGroups.includes(item.label)
            const hasActive = item.children?.some(c => pathname.startsWith(c.href))

            return (
              <div key={item.label}>
                <div className="nav-item" onClick={() => toggleGroup(item.label)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 16px', cursor: 'pointer',
                    color: hasActive ? '#fff' : '#8aa4c0',
                    background: hasActive ? '#1a2740' : 'transparent',
                    borderLeft: hasActive ? '2px solid #4a9eff' : '2px solid transparent',
                    fontSize: '13px', transition: 'all 0.15s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px' }}>{item.icon}</span>
                    {item.label}
                  </div>
                  <span style={{
                    fontSize: '9px', color: '#4a6080', transition: 'transform 0.2s',
                    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block',
                  }}>▶</span>
                </div>

                {isOpen && (
                  <div style={{ background: '#080e1a' }}>
                    {item.children?.map(child => {
                      const active = pathname === child.href || pathname.startsWith(child.href + '/')
                      return (
                        <div key={child.href} className="nav-child" onClick={() => router.push(child.href)}
                          style={{
                            padding: '7px 16px 7px 38px', cursor: 'pointer',
                            color: active ? '#4a9eff' : '#5a7a9a',
                            fontSize: '12px',
                            borderLeft: active ? '2px solid #4a9eff' : '2px solid transparent',
                            transition: 'all 0.15s',
                          }}>
                          {child.label}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px', borderTop: '0.5px solid #1e2d4a',
          flexShrink: 0, background: '#0a1020',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: '#1a3060', border: '1.5px solid #2a4a80',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: '600', color: '#4a9eff', flexShrink: 0,
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', color: '#fff', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '10px', color: '#4a6080', textTransform: 'capitalize', marginTop: '1px' }}>
                {user.role}
              </div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}
            style={{
              width: '100%', padding: '7px 12px', background: 'transparent',
              border: '0.5px solid #1e2d4a', borderRadius: '6px', color: '#5a7a9a',
              fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}>
            <span>⎋</span> Sign out
          </button>
        </div>
      </div>
    </>
  )
}