'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  open: { bg: '#e6f1fb', color: '#185fa5', label: 'Open' },
  in_progress: { bg: '#faeeda', color: '#854f0b', label: 'In Progress' },
  completed: { bg: '#eaf3de', color: '#3b6d11', label: 'Completed' },
  waiting_parts: { bg: '#fbeaf0', color: '#993556', label: 'Waiting Parts' },
  cancelled: { bg: '#f1efe8', color: '#5f5e5a', label: 'Cancelled' },
}

const priorityConfig: Record<string, { bg: string; color: string }> = {
  high: { bg: '#fcebeb', color: '#a32d2d' },
  medium: { bg: '#faeeda', color: '#854f0b' },
  low: { bg: '#eaf3de', color: '#3b6d11' },
}

type Job = {
  id: string
  jobNo: string
  jobDate: string
  jobTitle: string
  jobType: string
  priority: string
  status: string
  deadline: string | null
  createdAt: string
  client: { companyName: string }
  technician: { name: string } | null
}

function isInPeriod(dateStr: string, period: string, customFrom: string, customTo: string): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (period === 'daily') {
    const todayEnd = new Date(todayStart.getTime() + 86400000 - 1)
    return date >= todayStart && date <= todayEnd
  }
  if (period === 'weekly') {
    const day = todayStart.getDay()
    const weekStart = new Date(todayStart)
    weekStart.setDate(todayStart.getDate() - day)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59)
    return date >= weekStart && date <= weekEnd
  }
  if (period === 'monthly') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    return date >= monthStart && date <= monthEnd
  }
  if (period === 'yearly') {
    const yearStart = new Date(now.getFullYear(), 0, 1)
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
    return date >= yearStart && date <= yearEnd
  }
  if (period === 'custom') {
    const from = customFrom ? new Date(customFrom) : null
    const to = customTo ? new Date(customTo + 'T23:59:59') : null
    if (from && date < from) return false
    if (to && date > to) return false
    return true
  }
  return true
}

export default function JobListPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [period, setPeriod] = useState('daily')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
      ...(statusFilter && { status: statusFilter }),
      ...(priorityFilter && { priority: priorityFilter }),
      ...(typeFilter && { type: typeFilter }),
    })
    const res = await fetch(`/api/jobs?${params}`)
    const data = await res.json()
    setJobs(data.jobs || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [page, search, statusFilter, priorityFilter, typeFilter])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const filteredJobs = jobs.filter(j => isInPeriod(j.createdAt, period, customFrom, customTo))

  const highPriority = filteredJobs.filter(j => j.priority === 'high' && j.status !== 'completed' && j.status !== 'cancelled').length
  const totalPages = Math.ceil(total / limit)

  const periodButtons = ['daily', 'weekly', 'monthly', 'yearly', 'custom']

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Job list</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>All inward service jobs — onsite and workshop</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/operations/jobs/create')}
          style={{
            background: '#1a56db', color: '#fff', border: 'none',
            padding: '9px 16px', borderRadius: '8px', fontSize: '13px',
            fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          + New job
        </button>
      </div>

      {/* Period Filter Bar */}
      <div style={{
        background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px',
        padding: '12px 16px', marginBottom: '12px',
        display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', marginRight: '4px' }}>Period:</span>
        {periodButtons.map(p => (
          <button
            key={p}
            onClick={() => { setPeriod(p); setPage(1) }}
            style={{
              padding: '5px 14px', borderRadius: '20px', fontSize: '12px',
              fontWeight: '500', border: '0.5px solid', cursor: 'pointer',
              textTransform: 'capitalize',
              borderColor: period === p ? '#1a56db' : '#e2e8f0',
              background: period === p ? '#1a56db' : '#f8f9fb',
              color: period === p ? '#fff' : '#475569',
            }}
          >
            {p}
          </button>
        ))}
        {period === 'custom' && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              style={{ height: '32px', padding: '0 10px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', outline: 'none', color: '#0f172a' }}
            />
            <span style={{ fontSize: '12px', color: '#64748b' }}>to</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              style={{ height: '32px', padding: '0 10px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', outline: 'none', color: '#0f172a' }}
            />
          </>
        )}
      </div>

      {/* KPI Strip — 6 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '16px' }}>
        {[
          { label: 'Total', value: total, color: '#0f172a' },
          { label: 'Open', value: filteredJobs.filter(j => j.status === 'open').length, color: '#185fa5' },
          { label: 'In progress', value: filteredJobs.filter(j => j.status === 'in_progress').length, color: '#854f0b' },
          { label: 'Waiting parts', value: filteredJobs.filter(j => j.status === 'waiting_parts').length, color: '#993556' },
          { label: 'Completed', value: filteredJobs.filter(j => j.status === 'completed').length, color: '#3b6d11' },
          { label: '🔴 High priority', value: highPriority, color: '#a32d2d' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{kpi.label}</div>
            <div style={{ fontSize: '22px', fontWeight: '600', color: kpi.color, marginTop: '4px' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px',
        padding: '14px 16px', marginBottom: '12px',
        display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center',
      }}>
        <input
          placeholder="Search job no, client, title..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{
            flex: 1, minWidth: '200px', height: '36px', padding: '0 12px',
            border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', outline: 'none',
          }}
        />
        {[
          {
            value: statusFilter,
            onChange: (v: string) => { setStatusFilter(v); setPage(1) },
            placeholder: 'All status',
            options: [
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'waiting_parts', label: 'Waiting Parts' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ],
          },
          {
            value: priorityFilter,
            onChange: (v: string) => { setPriorityFilter(v); setPage(1) },
            placeholder: 'All priority',
            options: [
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ],
          },
          {
            value: typeFilter,
            onChange: (v: string) => { setTypeFilter(v); setPage(1) },
            placeholder: 'All types',
            options: [
              { value: 'onsite', label: 'Onsite' },
              { value: 'workshop', label: 'Workshop' },
            ],
          },
        ].map((filter, i) => (
          <select
            key={i}
            value={filter.value}
            onChange={e => filter.onChange(e.target.value)}
            style={{
              height: '36px', padding: '0 10px', border: '0.5px solid #e2e8f0',
              borderRadius: '6px', fontSize: '13px', color: '#475569',
              background: '#fff', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">{filter.placeholder}</option>
            {filter.options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ))}
        {(search || statusFilter || priorityFilter || typeFilter) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); setTypeFilter(''); setPage(1) }}
            style={{
              height: '36px', padding: '0 12px', border: '0.5px solid #e2e8f0',
              borderRadius: '6px', fontSize: '12px', color: '#64748b',
              background: '#f8f9fb', cursor: 'pointer',
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Job no', 'Date', 'Client', 'Title', 'Type', 'Priority', 'Status', 'Technician', 'Deadline', 'Actions'].map(h => (
                <th key={h} style={{
                  padding: '10px 14px', textAlign: 'left', fontSize: '11px',
                  fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0',
                  textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  Loading jobs...
                </td>
              </tr>
            ) : filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  No jobs found.{' '}
                  <span
                    onClick={() => router.push('/dashboard/operations/jobs/create')}
                    style={{ color: '#1a56db', cursor: 'pointer' }}
                  >
                    Create your first job →
                  </span>
                </td>
              </tr>
            ) : (
              filteredJobs.map(job => {
                const status = statusConfig[job.status] || statusConfig.open
                const priority = priorityConfig[job.priority] || priorityConfig.medium
                const isOverdue = job.deadline && new Date(job.deadline) < new Date() && job.status !== 'completed'
                return (
                  <tr
                    key={job.id}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#1a56db', whiteSpace: 'nowrap' }}>
                      {job.jobNo}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatDate(job.jobDate || job.createdAt)}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#0f172a' }}>
                      {job.client.companyName}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#475569', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.jobTitle}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', textTransform: 'capitalize' }}>
                      {job.jobType}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                      <span style={{ background: priority.bg, color: priority.color, padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', textTransform: 'capitalize' }}>
                        {job.priority}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                      <span style={{ background: status.bg, color: status.color, padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', whiteSpace: 'nowrap' }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#64748b' }}>
                      {job.technician?.name || '—'}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: isOverdue ? '#dc2626' : '#64748b', fontWeight: isOverdue ? '600' : '400', whiteSpace: 'nowrap' }}>
                      {job.deadline ? formatDate(job.deadline) : '—'}
                      {isOverdue && <span style={{ marginLeft: '4px' }}>⚠</span>}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/dashboard/operations/jobs/${job.id}`) }}
                          style={{ padding: '4px 10px', border: '0.5px solid #e2e8f0', borderRadius: '5px', fontSize: '11px', color: '#475569', background: '#f8fafc', cursor: 'pointer' }}
                        >
                          View
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/dashboard/operations/jobs/${job.id}/edit`) }}
                          style={{ padding: '4px 10px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '11px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '0.5px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} jobs
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: '5px 12px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: page === 1 ? '#cbd5e1' : '#475569', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ padding: '5px 12px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: page === totalPages ? '#cbd5e1' : '#475569', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}