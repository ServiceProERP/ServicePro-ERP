'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

type Job = {
  id: string; jobNo: string; jobTitle: string; jobType: string
  priority: string; status: string; deadline: string | null
  createdAt: string
  client: { companyName: string; phone: string; address: string | null }
  spareParts: { id: string }[]
}

const statusColor: Record<string, { bg: string; color: string; label: string }> = {
  open:          { bg: '#e6f1fb', color: '#185fa5', label: 'Open' },
  in_progress:   { bg: '#faeeda', color: '#854f0b', label: 'In Progress' },
  waiting_parts: { bg: '#fdf4ff', color: '#7e22ce', label: 'Waiting Parts' },
  completed:     { bg: '#eaf3de', color: '#3b6d11', label: 'Completed' },
  cancelled:     { bg: '#f1f5f9', color: '#94a3b8', label: 'Cancelled' },
}

const priorityColor: Record<string, { bg: string; color: string }> = {
  urgent: { bg: '#fdf2f8', color: '#9d174d' },
  high:   { bg: '#fef2f2', color: '#dc2626' },
  medium: { bg: '#faeeda', color: '#854f0b' },
  low:    { bg: '#f1f5f9', color: '#475569' },
}

export default function MyJobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (periodFilter) params.set('period', periodFilter)
    const res = await fetch(`/api/jobs/my-jobs?${params}`)
    const data = await res.json()
    setJobs(data.jobs || [])
    setLoading(false)
  }, [statusFilter, periodFilter])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const filtered = typeFilter ? jobs.filter(j => j.jobType === typeFilter) : jobs

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>My jobs</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>All jobs assigned to you</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Total', value: jobs.length, color: '#0f172a', bg: '#fff', filter: '' },
          { label: 'Open', value: jobs.filter(j => j.status === 'open').length, color: '#185fa5', bg: '#e6f1fb', filter: 'open' },
          { label: 'In progress', value: jobs.filter(j => j.status === 'in_progress').length, color: '#854f0b', bg: '#faeeda', filter: 'in_progress' },
          { label: 'Completed', value: jobs.filter(j => j.status === 'completed').length, color: '#3b6d11', bg: '#eaf3de', filter: 'completed' },
        ].map(s => (
          <div key={s.label} onClick={() => setStatusFilter(statusFilter === s.filter ? '' : s.filter)}
            style={{ background: s.bg, border: `0.5px solid ${statusFilter === s.filter ? s.color : '#e2e8f0'}`, borderRadius: '10px', padding: '12px 16px', cursor: 'pointer' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: s.color, marginTop: '4px' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', display: 'flex', gap: '10px' }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ height: '34px', padding: '0 10px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#475569', background: '#fff', outline: 'none' }}>
          <option value="">All status</option>
          {Object.entries(statusColor).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} style={{ height: '34px', padding: '0 10px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#475569', background: '#fff', outline: 'none' }}>
          <option value="">All time</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ height: '34px', padding: '0 10px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#475569', background: '#fff', outline: 'none' }}>
          <option value="">All types</option>
          <option value="onsite">Onsite</option>
          <option value="workshop">Workshop</option>
        </select>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748b', alignSelf: 'center' }}>{filtered.length} jobs</span>
      </div>

      {/* Jobs table */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Job no', 'Title', 'Client', 'Type', 'Priority', 'Status', 'Deadline', 'Action'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading your jobs...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No jobs found</td></tr>
            ) : filtered.map(job => {
              const sc = statusColor[job.status] || statusColor.open
              const pc = priorityColor[job.priority] || priorityColor.medium
              const overdue = job.deadline && new Date(job.deadline) < new Date() && job.status !== 'completed'
              return (
                <tr key={job.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', fontWeight: '600', color: '#1a56db', cursor: 'pointer' }} onClick={() => router.push(`/dashboard/technician/jobs/${job.id}`)}>
                    {job.jobNo}
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '500', color: '#0f172a', maxWidth: '180px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.jobTitle}</div>
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#475569' }}>{job.client.companyName}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '8px' }}>{job.jobType}</span>
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <span style={{ fontSize: '11px', background: pc.bg, color: pc.color, padding: '2px 8px', borderRadius: '8px', fontWeight: '500' }}>{job.priority}</span>
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <span style={{ fontSize: '11px', background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: '8px', fontWeight: '500' }}>{sc.label}</span>
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: overdue ? '#dc2626' : '#64748b', fontWeight: overdue ? '600' : '400', whiteSpace: 'nowrap' }}>
                    {job.deadline ? `${overdue ? '⚠️ ' : ''}${formatDate(job.deadline)}` : '—'}
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <button onClick={() => router.push(`/dashboard/technician/jobs/${job.id}`)} style={{ padding: '4px 12px', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '11px', color: '#1a56db', cursor: 'pointer', fontWeight: '500' }}>
                      Open →
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}