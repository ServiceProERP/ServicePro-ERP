'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'

type Employee = {
  id: string
  empCode: string
  name: string
  designation: string | null
  department: string | null
  branch: string | null
  phone: string
  email: string | null
  joinDate: string | null
  salary: number
  skill: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  emergencyContact: string | null
  emergencyPhone: string | null
  idProofType: string | null
  idProofNumber: string | null
  idProofUrl: string | null
  profilePhotoUrl: string | null
  status: string
  isActive: boolean
}

type Job = {
  id: string
  jobNo: string
  jobTitle: string
  status: string
  priority: string
  jobDate: string
  deadline: string | null
  client: { companyName: string }
}

type Performance = {
  totalJobs: number
  completedJobs: number
  inProgressJobs: number
  openJobs: number
  completionRate: number
  overdueJobs: number
}

type EmployeeDetail = {
  employee: Employee
  jobs: Job[]
  performance: Performance
}

const statusColors: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: '#eaf3de', color: '#3b6d11', label: 'Active' },
  blocked: { bg: '#faeeda', color: '#854f0b', label: 'Blocked' },
  blacklisted: { bg: '#fcebeb', color: '#a32d2d', label: 'Blacklisted' },
}

const departmentColors: Record<string, { bg: string; color: string }> = {
  'Operations': { bg: '#faeeda', color: '#854f0b' },
  'Finance': { bg: '#e1f5ee', color: '#0f6e56' },
  'HR': { bg: '#eeedfe', color: '#534ab7' },
  'Sales': { bg: '#e6f1fb', color: '#185fa5' },
  'Technical': { bg: '#eaf3de', color: '#3b6d11' },
  'Management': { bg: '#fbeaf0', color: '#993556' },
  'Admin': { bg: '#f1efe8', color: '#5f5e5a' },
}

const jobStatusColors: Record<string, { bg: string; color: string }> = {
  open: { bg: '#e6f1fb', color: '#185fa5' },
  in_progress: { bg: '#faeeda', color: '#854f0b' },
  completed: { bg: '#eaf3de', color: '#3b6d11' },
  waiting_parts: { bg: '#eeedfe', color: '#534ab7' },
  cancelled: { bg: '#f1f5f9', color: '#475569' },
}

const inputStyle = {
  height: '36px',
  padding: '0 10px',
  border: '0.5px solid #e2e8f0',
  borderRadius: '6px',
  fontSize: '13px',
  outline: 'none',
  background: '#fff',
  color: '#0f172a',
}

const labelSt = {
  fontSize: '11px',
  color: '#64748b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.4px',
  marginBottom: '3px',
}

const valueSt = {
  fontSize: '13px',
  color: '#0f172a',
  fontWeight: '500' as const,
}

export default function WorkforceListPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [selectedEmp, setSelectedEmp] = useState<EmployeeDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [activeTab, setActiveTab] = useState<'info' | 'performance' | 'workload'>('info')
  const limit = 10

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
      ...(deptFilter && { department: deptFilter }),
      ...(statusFilter && { status: statusFilter }),
    })
    const res = await fetch(`/api/employees?${params}`)
    const data = await res.json()
    setEmployees(data.employees || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [page, search, deptFilter, statusFilter])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  async function loadEmployeeDetail(emp: Employee) {
    if (selectedEmp?.employee.id === emp.id) {
      setSelectedEmp(null)
      return
    }
    setLoadingDetail(true)
    setActiveTab('info')
    try {
      const res = await fetch(`/api/employees/${emp.id}`)
      const data = await res.json()
      setSelectedEmp(data)
    } catch {
      showMsg('Failed to load employee details', 'error')
    }
    setLoadingDetail(false)
  }

  function showMsg(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  async function updateStatus(id: string, status: string) {
    setStatusUpdating(true)
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        showMsg(`Status updated to ${status}`, 'success')
        fetchEmployees()
        if (selectedEmp) {
          setSelectedEmp(prev => prev ? {
            ...prev,
            employee: { ...prev.employee, status, isActive: status === 'active' }
          } : null)
        }
      }
    } catch {
      showMsg('Failed to update status', 'error')
    }
    setStatusUpdating(false)
  }

  const totalPages = Math.ceil(total / limit)
  const activeCount = employees.filter(e => e.status === 'active').length
  const blockedCount = employees.filter(e => e.status === 'blocked').length
  const monthlySalary = employees.filter(e => e.isActive).reduce((s, e) => s + e.salary, 0)

  const tabStyle = (tab: string) => ({
    padding: '7px 14px',
    border: 'none',
    borderBottom: `2px solid ${activeTab === tab ? '#1a56db' : 'transparent'}`,
    background: 'none',
    fontSize: '12px',
    fontWeight: activeTab === tab ? '600' : '400' as const,
    color: activeTab === tab ? '#1a56db' : '#64748b',
    cursor: 'pointer',
  })

  return (
    <div style={{ display: 'flex', gap: '16px' }}>

      {/* Main List */}
      <div style={{ flex: 1, minWidth: 0 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Workforce</h1>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Manage all employees and staff</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/hr/workforce/create')}
            style={{ background: '#1a56db', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
          >
            + Add employee
          </button>
        </div>

        {message.text && (
          <div style={{
            background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            color: message.type === 'success' ? '#16a34a' : '#dc2626',
            padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px',
          }}>
            {message.text}
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
          {[
            { label: 'Total staff', value: String(total), color: '#0f172a', bg: '#fff' },
            { label: 'Active', value: String(activeCount), color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Blocked', value: String(blockedCount), color: '#854f0b', bg: '#faeeda' },
            { label: 'Monthly salary', value: formatCurrency(monthlySalary), color: '#185fa5', bg: '#e6f1fb' },
          ].map(stat => (
            <div key={stat.label} style={{ background: stat.bg, border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: stat.color, marginTop: '4px' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            placeholder="Search name, designation, branch..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ ...inputStyle, flex: 1, minWidth: '180px' }}
          />
          <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1) }} style={inputStyle}>
            <option value="">All departments</option>
            {['Operations', 'Technical', 'Finance', 'HR', 'Sales', 'Management', 'Admin'].map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={inputStyle}>
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
            <option value="blacklisted">Blacklisted</option>
          </select>
          {(search || deptFilter || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setDeptFilter(''); setStatusFilter(''); setPage(1) }}
              style={{ ...inputStyle, padding: '0 12px', color: '#64748b', cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Employee', 'Designation', 'Department', 'Branch', 'Phone', 'Join date', 'Salary', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading employees...</td></tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    No employees found.{' '}
                    <span onClick={() => router.push('/dashboard/hr/workforce/create')} style={{ color: '#1a56db', cursor: 'pointer' }}>
                      Add your first employee →
                    </span>
                  </td>
                </tr>
              ) : employees.map(emp => {
                const dept = departmentColors[emp.department || ''] || { bg: '#f1f5f9', color: '#475569' }
                const st = statusColors[emp.status] || statusColors.active
                const isSelected = selectedEmp?.employee.id === emp.id
                return (
                  <tr
                    key={emp.id}
                    style={{ background: isSelected ? '#eff6ff' : 'transparent', cursor: 'pointer' }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }} onClick={() => loadEmployeeDetail(emp)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '50%',
                          background: emp.profilePhotoUrl ? 'transparent' : '#e6f1fb',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', fontWeight: '600', color: '#185fa5',
                          flexShrink: 0, overflow: 'hidden', border: '1px solid #bfdbfe',
                        }}>
                          {emp.profilePhotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={emp.profilePhotoUrl} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            emp.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a56db', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>{emp.name}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{emp.empCode}</div>
                        </div>
                      </div>
                    </td>
                    <td onClick={() => loadEmployeeDetail(emp)} style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#475569' }}>{emp.designation || '—'}</td>
                    <td onClick={() => loadEmployeeDetail(emp)} style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                      {emp.department ? (
                        <span style={{ background: dept.bg, color: dept.color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>
                          {emp.department}
                        </span>
                      ) : '—'}
                    </td>
                    <td onClick={() => loadEmployeeDetail(emp)} style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>{emp.branch || '—'}</td>
                    <td onClick={() => loadEmployeeDetail(emp)} style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#475569' }}>{emp.phone}</td>
                    <td onClick={() => loadEmployeeDetail(emp)} style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>{emp.joinDate ? formatDate(emp.joinDate) : '—'}</td>
                    <td onClick={() => loadEmployeeDetail(emp)} style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{emp.salary > 0 ? formatCurrency(emp.salary) : '—'}</td>
                    <td onClick={() => loadEmployeeDetail(emp)} style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                      <span style={{ background: st.bg, color: st.color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => router.push(`/dashboard/hr/workforce/${emp.id}/edit`)}
                          style={{ padding: '4px 8px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '11px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => loadEmployeeDetail(emp)}
                          style={{ padding: '4px 8px', border: '0.5px solid #e2e8f0', borderRadius: '5px', fontSize: '11px', color: '#475569', background: '#f8fafc', cursor: 'pointer' }}
                        >
                          {isSelected ? 'Close' : 'View'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '0.5px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} employees
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '5px 12px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: page === 1 ? '#cbd5e1' : '#475569', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '5px 12px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: page === totalPages ? '#cbd5e1' : '#475569', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {(selectedEmp || loadingDetail) && (
        <div style={{ width: '360px', flexShrink: 0 }}>
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', position: 'sticky', top: '20px', overflow: 'hidden' }}>

            {loadingDetail ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                Loading profile...
              </div>
            ) : selectedEmp ? (
              <>
                {/* Panel Header */}
                <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Employee profile</div>
                  <button onClick={() => setSelectedEmp(null)} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                </div>

                {/* Avatar + Name */}
                <div style={{ padding: '20px', textAlign: 'center', borderBottom: '0.5px solid #f1f5f9' }}>
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    background: selectedEmp.employee.profilePhotoUrl ? 'transparent' : '#e6f1fb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '30px', fontWeight: '700', color: '#185fa5',
                    margin: '0 auto 12px', border: '2px solid #bfdbfe', overflow: 'hidden',
                  }}>
                    {selectedEmp.employee.profilePhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedEmp.employee.profilePhotoUrl} alt={selectedEmp.employee.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      selectedEmp.employee.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{selectedEmp.employee.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{selectedEmp.employee.designation || 'No designation'}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontFamily: 'monospace' }}>{selectedEmp.employee.empCode}</div>
                  <div style={{ marginTop: '10px', display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {[
                      { status: 'active', label: '✓ Active', bg: '#eaf3de', color: '#3b6d11', border: '#bbf7d0' },
                      { status: 'blocked', label: '⏸ Block', bg: '#faeeda', color: '#854f0b', border: '#fde68a' },
                      { status: 'blacklisted', label: '✕ Blacklist', bg: '#fcebeb', color: '#a32d2d', border: '#fecaca' },
                    ].map(action => (
                      <button
                        key={action.status}
                        onClick={() => updateStatus(selectedEmp.employee.id, action.status)}
                        disabled={statusUpdating || selectedEmp.employee.status === action.status}
                        style={{
                          padding: '5px 10px',
                          background: selectedEmp.employee.status === action.status ? action.bg : '#fff',
                          color: selectedEmp.employee.status === action.status ? action.color : '#475569',
                          border: `0.5px solid ${selectedEmp.employee.status === action.status ? action.border : '#e2e8f0'}`,
                          borderRadius: '6px', fontSize: '11px',
                          fontWeight: selectedEmp.employee.status === action.status ? '600' : '400',
                          cursor: selectedEmp.employee.status === action.status ? 'default' : 'pointer',
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '0.5px solid #e2e8f0', padding: '0 8px' }}>
                  <button style={tabStyle('info')} onClick={() => setActiveTab('info')}>Info</button>
                  <button style={tabStyle('performance')} onClick={() => setActiveTab('performance')}>Performance</button>
                  <button style={tabStyle('workload')} onClick={() => setActiveTab('workload')}>Workload</button>
                </div>

                {/* Tab Content */}
                <div style={{ padding: '16px 20px', maxHeight: '480px', overflowY: 'auto' }}>

                  {/* INFO TAB */}
                  {activeTab === 'info' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                      <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '10px' }}>Contact</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div><div style={labelSt}>Phone</div><div style={valueSt}>{selectedEmp.employee.phone}</div></div>
                          {selectedEmp.employee.email && <div><div style={labelSt}>Email</div><div style={valueSt}>{selectedEmp.employee.email}</div></div>}
                          {selectedEmp.employee.emergencyContact && (
                            <div>
                              <div style={labelSt}>Emergency</div>
                              <div style={valueSt}>{selectedEmp.employee.emergencyContact} · {selectedEmp.employee.emergencyPhone || '—'}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {(selectedEmp.employee.address || selectedEmp.employee.city) && (
                        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '10px' }}>Location</div>
                          {selectedEmp.employee.address && <div style={{ marginBottom: '6px' }}><div style={labelSt}>Address</div><div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>{selectedEmp.employee.address}</div></div>}
                          {selectedEmp.employee.city && (
                            <div><div style={labelSt}>City / State</div>
                              <div style={valueSt}>{selectedEmp.employee.city}{selectedEmp.employee.state ? `, ${selectedEmp.employee.state}` : ''}{selectedEmp.employee.country ? ` — ${selectedEmp.employee.country}` : ''}</div>
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '10px' }}>Employment</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          {[
                            { label: 'Department', value: selectedEmp.employee.department || '—' },
                            { label: 'Branch', value: selectedEmp.employee.branch || '—' },
                            { label: 'Join date', value: selectedEmp.employee.joinDate ? formatDate(selectedEmp.employee.joinDate) : '—' },
                            { label: 'Salary', value: selectedEmp.employee.salary > 0 ? formatCurrency(selectedEmp.employee.salary) : '—' },
                          ].map(f => (
                            <div key={f.label}>
                              <div style={labelSt}>{f.label}</div>
                              <div style={valueSt}>{f.value}</div>
                            </div>
                          ))}
                        </div>
                        {selectedEmp.employee.skill && (
                          <div style={{ marginTop: '10px' }}>
                            <div style={labelSt}>Skills</div>
                            <div style={valueSt}>{selectedEmp.employee.skill}</div>
                          </div>
                        )}
                      </div>

                      {(selectedEmp.employee.idProofType || selectedEmp.employee.idProofNumber) && (
                        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '10px' }}>ID proof</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                            {selectedEmp.employee.idProofType && <div><div style={labelSt}>Type</div><div style={valueSt}>{selectedEmp.employee.idProofType}</div></div>}
                            {selectedEmp.employee.idProofNumber && <div><div style={labelSt}>Number</div><div style={valueSt}>{selectedEmp.employee.idProofNumber}</div></div>}
                          </div>
                          {selectedEmp.employee.idProofUrl && (
                            <a href={selectedEmp.employee.idProofUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#1a56db', textDecoration: 'none', background: '#eff6ff', padding: '5px 10px', borderRadius: '5px', border: '0.5px solid #bfdbfe', display: 'inline-block' }}>
                              📎 View ID proof
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PERFORMANCE TAB */}
                  {activeTab === 'performance' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                      {/* Completion Rate Circle */}
                      <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '12px' }}>Completion rate</div>
                        <div style={{ fontSize: '48px', fontWeight: '700', color: selectedEmp.performance.completionRate >= 70 ? '#16a34a' : selectedEmp.performance.completionRate >= 40 ? '#854f0b' : '#dc2626' }}>
                          {selectedEmp.performance.completionRate}%
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          {selectedEmp.performance.completedJobs} of {selectedEmp.performance.totalJobs} jobs completed
                        </div>
                        {/* Progress bar */}
                        <div style={{ marginTop: '12px', background: '#e2e8f0', borderRadius: '10px', height: '8px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${selectedEmp.performance.completionRate}%`,
                            background: selectedEmp.performance.completionRate >= 70 ? '#16a34a' : selectedEmp.performance.completionRate >= 40 ? '#f59e0b' : '#dc2626',
                            borderRadius: '10px',
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {[
                          { label: 'Total jobs', value: selectedEmp.performance.totalJobs, color: '#0f172a', bg: '#fff' },
                          { label: 'Completed', value: selectedEmp.performance.completedJobs, color: '#16a34a', bg: '#f0fdf4' },
                          { label: 'In progress', value: selectedEmp.performance.inProgressJobs, color: '#854f0b', bg: '#faeeda' },
                          { label: 'Overdue', value: selectedEmp.performance.overdueJobs, color: '#dc2626', bg: '#fef2f2' },
                        ].map(stat => (
                          <div key={stat.label} style={{ background: stat.bg, border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' }}>{stat.label}</div>
                          </div>
                        ))}
                      </div>

                      {selectedEmp.performance.overdueJobs > 0 && (
                        <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#dc2626' }}>
                          ⚠️ {selectedEmp.performance.overdueJobs} overdue job{selectedEmp.performance.overdueJobs > 1 ? 's' : ''} — needs attention
                        </div>
                      )}
                    </div>
                  )}

                  {/* WORKLOAD TAB */}
                  {activeTab === 'workload' && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                        {selectedEmp.jobs.length > 0
                          ? `${selectedEmp.jobs.length} jobs assigned (last 20 shown)`
                          : 'No jobs assigned yet'}
                      </div>

                      {selectedEmp.jobs.length === 0 ? (
                        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                          No jobs assigned to this employee yet
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {selectedEmp.jobs.map(job => {
                            const jsc = jobStatusColors[job.status] || jobStatusColors.open
                            const isOverdue = job.deadline && new Date(job.deadline) < new Date() && job.status !== 'completed'
                            return (
                              <div
                                key={job.id}
                                style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px', border: `0.5px solid ${isOverdue ? '#fecaca' : '#e2e8f0'}` }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#1a56db' }}>{job.jobNo}</div>
                                  <span style={{ background: jsc.bg, color: jsc.color, padding: '1px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: '500', textTransform: 'capitalize' }}>
                                    {job.status.replace('_', ' ')}
                                  </span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#0f172a', marginBottom: '2px' }}>{job.jobTitle}</div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>{job.client.companyName}</div>
                                {job.deadline && (
                                  <div style={{ fontSize: '11px', color: isOverdue ? '#dc2626' : '#64748b', marginTop: '4px', fontWeight: isOverdue ? '600' : '400' }}>
                                    {isOverdue ? '⚠ Overdue — ' : 'Due: '}{formatDate(job.deadline)}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Edit Button */}
                <div style={{ padding: '12px 20px', borderTop: '0.5px solid #e2e8f0' }}>
                  <button
                    onClick={() => router.push(`/dashboard/hr/workforce/${selectedEmp.employee.id}/edit`)}
                    style={{ width: '100%', padding: '9px', background: '#1a56db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
                  >
                    ✏️ Edit employee
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}