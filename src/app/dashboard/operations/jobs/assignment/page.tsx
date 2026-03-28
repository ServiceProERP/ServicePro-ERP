'use client'
import { useState, useEffect, useCallback } from 'react'

type Job = {
  id: string
  jobNo: string
  jobTitle: string
  priority: string
  status: string
  createdAt: string
  client: { companyName: string }
  technician: { id: string; name: string } | null
}

type Technician = {
  id: string
  name: string
  skill: string | null
}

type ActivityLog = {
  time: string
  action: string
  jobNo: string
  detail: string
  type: 'assign' | 'unassign' | 'reassign'
}

const priorityConfig: Record<string, { bg: string; color: string }> = {
  high: { bg: '#fcebeb', color: '#a32d2d' },
  medium: { bg: '#faeeda', color: '#854f0b' },
  low: { bg: '#eaf3de', color: '#3b6d11' },
}

const thStyle = {
  padding: '9px 12px',
  textAlign: 'left' as const,
  fontSize: '11px',
  fontWeight: '500' as const,
  color: '#64748b',
  borderBottom: '0.5px solid #e2e8f0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.4px',
  background: '#f8fafc',
  whiteSpace: 'nowrap' as const,
}

const tdStyle = {
  padding: '10px 12px',
  borderBottom: '0.5px solid #f1f5f9',
  fontSize: '13px',
}

export default function JobAssignmentPage() {
  const [unassignedJobs, setUnassignedJobs] = useState<Job[]>([])
  const [assignedJobs, setAssignedJobs] = useState<Job[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [techWorkload, setTechWorkload] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [message, setMessage] = useState({ text: '', type: 'success' })
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [totalActive, setTotalActive] = useState(0)

  const addLog = (log: ActivityLog) => {
    setLogs(prev => [log, ...prev].slice(0, 50))
  }

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: 'success' }), 3000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [jobsRes, techRes] = await Promise.all([
      fetch('/api/jobs?limit=200'),
      fetch('/api/technicians'),
    ])
    const jobsData = await jobsRes.json()
    const techData = await techRes.json()

    const allJobs: Job[] = jobsData.jobs || []
    const activeJobs = allJobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled')
    setUnassignedJobs(activeJobs.filter(j => !j.technician))
    setAssignedJobs(activeJobs.filter(j => j.technician))
    setTotalActive(activeJobs.length)

    const techs: Technician[] = techData.technicians || []
    setTechnicians(techs)

    const workload: Record<string, number> = {}
    techs.forEach(t => { workload[t.id] = 0 })
    activeJobs.forEach(j => {
      if (j.technician?.id) {
        workload[j.technician.id] = (workload[j.technician.id] || 0) + 1
      }
    })
    setTechWorkload(workload)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const nowTime = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

  async function assignTechnician(jobId: string, techId: string, jobNo: string, prevTechName?: string) {
    if (!techId) return
    setAssigning(jobId)
    const tech = technicians.find(t => t.id === techId)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicianId: techId, status: 'in_progress' }),
      })
      if (res.ok) {
        if (prevTechName) {
          showMessage(`${jobNo} reassigned from ${prevTechName} to ${tech?.name}`)
          addLog({ time: nowTime(), action: 'Reassigned', jobNo, detail: `${prevTechName} → ${tech?.name}`, type: 'reassign' })
        } else {
          showMessage(`${jobNo} assigned to ${tech?.name}`)
          addLog({ time: nowTime(), action: 'Assigned', jobNo, detail: `Assigned to ${tech?.name}`, type: 'assign' })
        }
        fetchData()
      } else {
        showMessage('Failed to assign. Try again.', 'error')
      }
    } catch {
      showMessage('Failed to assign. Try again.', 'error')
    }
    setAssigning(null)
  }

  async function unassignTechnician(jobId: string, jobNo: string, techName: string) {
    setAssigning(jobId)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicianId: null, status: 'open' }),
      })
      if (res.ok) {
        showMessage(`${jobNo} unassigned from ${techName}`)
        addLog({ time: nowTime(), action: 'Unassigned', jobNo, detail: `Removed from ${techName}`, type: 'unassign' })
        fetchData()
      } else {
        showMessage('Failed to unassign. Try again.', 'error')
      }
    } catch {
      showMessage('Failed to unassign. Try again.', 'error')
    }
    setAssigning(null)
  }

  const logColors = {
    assign: { bg: '#eaf3de', color: '#3b6d11', dot: '#16a34a' },
    unassign: { bg: '#fbeaf0', color: '#993556', dot: '#dc2626' },
    reassign: { bg: '#faeeda', color: '#854f0b', dot: '#d97706' },
  }

  return (
    <div>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Job assignment</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          Assign technicians to open jobs and manage workload
        </p>
      </div>

      {/* Message */}
      {message.text && (
        <div style={{
          background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: message.type === 'success' ? '#16a34a' : '#dc2626',
          padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px',
        }}>
          {message.type === 'success' ? '✓' : '✗'} {message.text}
        </div>
      )}

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total active jobs', value: loading ? '...' : totalActive, color: '#185fa5', bg: '#e6f1fb' },
          { label: 'Unassigned', value: loading ? '...' : unassignedJobs.length, color: unassignedJobs.length > 0 ? '#dc2626' : '#16a34a', bg: unassignedJobs.length > 0 ? '#fef2f2' : '#f0fdf4' },
          { label: 'Assigned', value: loading ? '...' : assignedJobs.length, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Total technicians', value: loading ? '...' : technicians.length, color: '#534ab7', bg: '#eeedfe' },
        ].map(stat => (
          <div key={stat.label} style={{ background: stat.bg, border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{stat.label}</div>
            <div style={{ fontSize: '28px', fontWeight: '600', color: stat.color, marginTop: '4px' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Technician Workload Panel */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>
          Technician workload — assign jobs to less busy technicians
        </div>
        {loading ? (
          <div style={{ fontSize: '13px', color: '#64748b' }}>Loading...</div>
        ) : technicians.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#64748b' }}>No technicians added yet. Add technicians from Workforce module.</div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {technicians.map(tech => {
              const count = techWorkload[tech.id] || 0
              const isHeavy = count >= 4
              const isIdle = count === 0
              const barColor = isIdle ? '#e2e8f0' : isHeavy ? '#dc2626' : '#1a56db'
              const labelColor = isIdle ? '#64748b' : isHeavy ? '#a32d2d' : '#185fa5'
              const labelBg = isIdle ? '#f8fafc' : isHeavy ? '#fcebeb' : '#e6f1fb'
              return (
                <div key={tech.id} style={{ background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', minWidth: '150px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{tech.name}</div>
                  {tech.skill && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>{tech.skill}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <div style={{ flex: 1, height: '4px', background: '#e2e8f0', borderRadius: '2px' }}>
                      <div style={{ width: `${Math.min(count * 20, 100)}%`, height: '100%', background: barColor, borderRadius: '2px' }} />
                    </div>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: '600', background: labelBg, color: labelColor, whiteSpace: 'nowrap' }}>
                      {count} job{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Unassigned + Assigned Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Unassigned Jobs */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>Unassigned jobs</div>
            <span style={{ background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
              {unassignedJobs.length} pending
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading...</div>
          ) : unassignedJobs.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#16a34a', fontSize: '13px', background: '#f0fdf4', borderRadius: '8px' }}>
              ✓ All jobs are assigned!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Job', 'Client', 'Priority', 'Assign to technician'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {unassignedJobs.map(job => {
                    const priority = priorityConfig[job.priority] || priorityConfig.medium
                    return (
                      <tr key={job.id} style={{ opacity: assigning === job.id ? 0.5 : 1 }}>
                        <td style={{ ...tdStyle, fontWeight: '600', color: '#1a56db' }}>
                          {job.jobNo}
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '400', marginTop: '2px' }}>
                            {job.jobTitle.length > 22 ? job.jobTitle.slice(0, 22) + '…' : job.jobTitle}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, color: '#475569', fontSize: '12px' }}>
                          {job.client.companyName.length > 14 ? job.client.companyName.slice(0, 14) + '…' : job.client.companyName}
                        </td>
                        <td style={tdStyle}>
                          <span style={{ background: priority.bg, color: priority.color, padding: '2px 7px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', textTransform: 'capitalize' }}>
                            {job.priority}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <select
                            disabled={assigning === job.id}
                            value=""
                            onChange={e => {
                              if (e.target.value) assignTechnician(job.id, e.target.value, job.jobNo)
                            }}
                            style={{ width: '100%', height: '32px', padding: '0 8px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#475569', background: '#fff', cursor: 'pointer' }}
                          >
                            <option value="">— Select technician —</option>
                            {technicians.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({techWorkload[t.id] || 0} job{(techWorkload[t.id] || 0) !== 1 ? 's' : ''})
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Assigned Jobs */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>Assigned jobs</div>
            <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
              {assignedJobs.length} active
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading...</div>
          ) : assignedJobs.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px', background: '#f8fafc', borderRadius: '8px' }}>
              No assigned jobs yet
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Job', 'Client', 'Current technician', 'Reassign / Unassign'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assignedJobs.map(job => (
                    <tr key={job.id} style={{ opacity: assigning === job.id ? 0.5 : 1 }}>
                      <td style={{ ...tdStyle, fontWeight: '600', color: '#1a56db' }}>
                        {job.jobNo}
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '400', marginTop: '2px' }}>
                          {job.jobTitle.length > 22 ? job.jobTitle.slice(0, 22) + '…' : job.jobTitle}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color: '#475569', fontSize: '12px' }}>
                        {job.client.companyName.length > 14 ? job.client.companyName.slice(0, 14) + '…' : job.client.companyName}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e6f1fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#185fa5', flexShrink: 0 }}>
                            {job.technician?.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: '500' }}>{job.technician?.name}</div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>
                              {techWorkload[job.technician?.id || ''] || 0} active jobs
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <select
                          disabled={assigning === job.id}
                          value=""
                          onChange={e => {
                            const val = e.target.value
                            if (!val) return
                            if (val === 'unassign') {
                              unassignTechnician(job.id, job.jobNo, job.technician?.name || '')
                            } else {
                              assignTechnician(job.id, val, job.jobNo, job.technician?.name)
                            }
                          }}
                          style={{ width: '100%', height: '32px', padding: '0 8px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#475569', background: '#fff', cursor: 'pointer' }}
                        >
                          <option value="">— Change —</option>
                          <option value="unassign">✕ Unassign</option>
                          {technicians
                            .filter(t => t.id !== job.technician?.id)
                            .map(t => (
                              <option key={t.id} value={t.id}>
                                → {t.name} ({techWorkload[t.id] || 0} job{(techWorkload[t.id] || 0) !== 1 ? 's' : ''})
                              </option>
                            ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Activity Log */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>
          Daily activity log
        </div>
        {logs.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', background: '#f8fafc', borderRadius: '8px' }}>
            No activity yet — assign or unassign a job to see logs here
          </div>
        ) : (
          <div>
            {logs.map((log, i) => {
              const c = logColors[log.type]
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: i < logs.length - 1 ? '0.5px solid #f1f5f9' : 'none' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                  <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{log.time}</div>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: '600', background: c.bg, color: c.color, whiteSpace: 'nowrap' }}>
                    {log.action}
                  </span>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#1a56db' }}>{log.jobNo}</div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>{log.detail}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}