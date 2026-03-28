'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

type Job = {
  id: string; jobNo: string; jobTitle: string; jobType: string
  priority: string; status: string; deadline: string | null
  client: { companyName: string; phone: string }
}

type Request = {
  id: string; requestNo: string; type: string; subject: string; status: string; createdAt: string
}

const priorityColor: Record<string, { bg: string; color: string }> = {
  high:   { bg: '#fef2f2', color: '#dc2626' },
  medium: { bg: '#faeeda', color: '#854f0b' },
  low:    { bg: '#f1f5f9', color: '#475569' },
  urgent: { bg: '#fdf2f8', color: '#9d174d' },
}

const statusColor: Record<string, { bg: string; color: string }> = {
  open:          { bg: '#e6f1fb', color: '#185fa5' },
  in_progress:   { bg: '#faeeda', color: '#854f0b' },
  waiting_parts: { bg: '#fdf4ff', color: '#7e22ce' },
  completed:     { bg: '#eaf3de', color: '#3b6d11' },
  cancelled:     { bg: '#f1f5f9', color: '#94a3b8' },
}

export default function TechnicianDashboard() {
  const router = useRouter()
  const [data, setData] = useState<{
    stats: { total: number; open: number; inProgress: number; completed: number; overdue: number }
    todayJobs: Job[]
    upcomingJobs: Job[]
    recentRequests: Request[]
    technician: { name: string; skill: string; empCode: string } | null
  }>({
    stats: { total: 0, open: 0, inProgress: 0, completed: 0, overdue: 0 },
    todayJobs: [], upcomingJobs: [], recentRequests: [], technician: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/technician/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function isOverdue(deadline: string | null) {
    return deadline && new Date(deadline) < new Date()
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#64748b', fontSize: '14px' }}>
      Loading your dashboard...
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'} 👋
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
          {data.technician?.name || 'Technician'} · {data.technician?.skill || 'Field Service'} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total jobs', value: data.stats.total, color: '#0f172a', bg: '#fff' },
          { label: 'Open', value: data.stats.open, color: '#185fa5', bg: '#e6f1fb' },
          { label: 'In progress', value: data.stats.inProgress, color: '#854f0b', bg: '#faeeda' },
          { label: 'Completed', value: data.stats.completed, color: '#3b6d11', bg: '#eaf3de' },
          { label: 'Overdue', value: data.stats.overdue, color: data.stats.overdue > 0 ? '#dc2626' : '#16a34a', bg: data.stats.overdue > 0 ? '#fef2f2' : '#f0fdf4' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {data.stats.overdue > 0 && (
        <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '13px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ⚠️ You have <strong>{data.stats.overdue} overdue job{data.stats.overdue > 1 ? 's' : ''}</strong> — please update or contact your manager
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px' }}>

        {/* My active jobs */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>My active jobs</div>
            <button onClick={() => router.push('/dashboard/technician/jobs')} style={{ fontSize: '12px', color: '#1a56db', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
          </div>

          {data.todayJobs.length === 0 ? (
            <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
              No active jobs right now. Great work!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.todayJobs.map(job => {
                const overdue = isOverdue(job.deadline)
                const sc = statusColor[job.status] || statusColor.open
                const pc = priorityColor[job.priority] || priorityColor.medium
                return (
                  <div
                    key={job.id}
                    onClick={() => router.push(`/dashboard/technician/jobs/${job.id}`)}
                    style={{ background: '#fff', border: `0.5px solid ${overdue ? '#fecaca' : '#e2e8f0'}`, borderRadius: '10px', padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a56db'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = overdue ? '#fecaca' : '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#1a56db', fontWeight: '600', marginBottom: '2px' }}>{job.jobNo}</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{job.jobTitle}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{job.client.companyName}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>
                          {job.status.replace('_', ' ')}
                        </span>
                        <span style={{ background: pc.bg, color: pc.color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>
                          {job.priority}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{job.jobType}</span>
                      {job.deadline && (
                        <span style={{ fontSize: '11px', color: overdue ? '#dc2626' : '#64748b', fontWeight: overdue ? '600' : '400' }}>
                          {overdue ? '⚠️ OVERDUE — ' : '📅 '}{formatDate(job.deadline)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                      <button
                        onClick={e => { e.stopPropagation(); router.push(`/dashboard/technician/jobs/${job.id}`) }}
                        style={{ flex: 1, padding: '6px', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '6px', color: '#1a56db', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                        Update status
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); window.open(`tel:${job.client.phone}`) }}
                        style={{ padding: '6px 10px', background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '6px', color: '#16a34a', fontSize: '12px', cursor: 'pointer' }}>
                        📞 Call
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Upcoming deadlines */}
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>📅 Upcoming deadlines</div>
            {data.upcomingJobs.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>No upcoming deadlines in next 7 days</div>
            ) : data.upcomingJobs.map(job => {
              const daysLeft = job.deadline ? Math.ceil((new Date(job.deadline).getTime() - Date.now()) / 86400000) : null
              return (
                <div key={job.id} onClick={() => router.push(`/dashboard/technician/jobs/${job.id}`)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid #f1f5f9', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#0f172a' }}>{job.jobNo}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{job.client.companyName}</div>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: daysLeft !== null && daysLeft <= 1 ? '#dc2626' : daysLeft !== null && daysLeft <= 2 ? '#854f0b' : '#16a34a' }}>
                    {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Recent requests */}
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>📝 My requests</div>
              <button onClick={() => router.push('/dashboard/technician/requests/new')} style={{ fontSize: '11px', color: '#1a56db', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer' }}>+ New</button>
            </div>
            {data.recentRequests.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>No requests yet</div>
            ) : data.recentRequests.map(req => {
              const sc = req.status === 'approved' ? { bg: '#eaf3de', color: '#3b6d11' } : req.status === 'rejected' ? { bg: '#fef2f2', color: '#dc2626' } : { bg: '#faeeda', color: '#854f0b' }
              return (
                <div key={req.id} onClick={() => router.push('/dashboard/technician/requests')}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid #f1f5f9', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#0f172a' }}>{req.subject}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{req.type.replace('_', ' ')} · {req.requestNo}</div>
                  </div>
                  <span style={{ background: sc.bg, color: sc.color, padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: '500' }}>{req.status}</span>
                </div>
              )
            })}
            <button onClick={() => router.push('/dashboard/technician/requests')} style={{ width: '100%', marginTop: '10px', padding: '7px', background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#475569', cursor: 'pointer' }}>
              View all requests →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}