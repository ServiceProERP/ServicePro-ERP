'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { formatDate } from '@/lib/utils'

type Job = {
  id: string
  jobNo: string
  jobTitle: string
  priority: string
  status: string
  deadline: string | null
  client: { companyName: string }
  technician: { name: string } | null
}

type ConfirmPopup = {
  jobId: string
  jobNo: string
  currentStatus: string
  targetStatus: string
} | null

const columns = [
  { key: 'open', label: 'Open', color: '#185fa5', bg: '#e6f1fb' },
  { key: 'in_progress', label: 'In Progress', color: '#854f0b', bg: '#faeeda' },
  { key: 'waiting_parts', label: 'Waiting Parts', color: '#993556', bg: '#fbeaf0' },
  { key: 'completed', label: 'Completed', color: '#3b6d11', bg: '#eaf3de' },
]

const allowedTransitions: Record<string, string[]> = {
  open: ['in_progress', 'cancelled'],
  in_progress: ['waiting_parts', 'completed', 'open'],
  waiting_parts: ['in_progress', 'cancelled'],
  completed: [],
  cancelled: [],
}

const statusLabels: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting_parts: 'Waiting Parts',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const priorityColors: Record<string, { bg: string; color: string }> = {
  high: { bg: '#fcebeb', color: '#a32d2d' },
  medium: { bg: '#faeeda', color: '#854f0b' },
  low: { bg: '#eaf3de', color: '#3b6d11' },
}

const AUTO_REFRESH_SECONDS = 30

export default function JobTrackingPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [confirm, setConfirm] = useState<ConfirmPopup>(null)
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECONDS)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  const fetchJobs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const res = await fetch('/api/jobs?limit=200')
    const data = await res.json()
    setJobs(data.jobs || [])
    if (!silent) setLoading(false)
  }, [])

  const resetTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    setCountdown(AUTO_REFRESH_SECONDS)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? AUTO_REFRESH_SECONDS : prev - 1))
    }, 1000)
    intervalRef.current = setInterval(() => {
      fetchJobs(true)
      setCountdown(AUTO_REFRESH_SECONDS)
    }, AUTO_REFRESH_SECONDS * 1000)
  }, [fetchJobs])

  useEffect(() => {
    fetchJobs()
    resetTimer()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [fetchJobs, resetTimer])

  function handleMoveRequest(job: Job, targetStatus: string) {
    setConfirm({ jobId: job.id, jobNo: job.jobNo, currentStatus: job.status, targetStatus })
  }

  async function confirmMove() {
    if (!confirm) return
    const allowed = allowedTransitions[confirm.currentStatus] || []
    if (!allowed.includes(confirm.targetStatus)) { setConfirm(null); return }
    setUpdating(confirm.jobId)
    setConfirm(null)
    try {
      const res = await fetch(`/api/jobs/${confirm.jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: confirm.targetStatus }),
      })
      if (res.ok) {
        setMessage(`Job moved to ${statusLabels[confirm.targetStatus]}`)
        setTimeout(() => setMessage(''), 3000)
        fetchJobs(true)
        resetTimer()
      }
    } catch { setMessage('Failed to update status') }
    setUpdating(null)
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div>

      {/* ── Confirmation Popup ── */}
      {confirm && (() => {
        const allowed = allowedTransitions[confirm.currentStatus] || []
        const isAllowed = allowed.includes(confirm.targetStatus)
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '24px 28px', width: '420px', border: '0.5px solid #e2e8f0' }}>
              {isAllowed ? (
                <>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '8px' }}>Confirm status change</div>
                  <div style={{ fontSize: '13px', color: '#475569', marginBottom: '20px', lineHeight: '1.6' }}>
                    Move <strong>{confirm.jobNo}</strong> from{' '}
                    <span style={{ fontWeight: '600', color: '#185fa5' }}>{statusLabels[confirm.currentStatus]}</span> to{' '}
                    <span style={{ fontWeight: '600', color: '#3b6d11' }}>{statusLabels[confirm.targetStatus]}</span>?
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setConfirm(null)} style={{ padding: '8px 16px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', color: '#475569', background: '#f8fafc', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={confirmMove} style={{ padding: '8px 18px', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', color: '#fff', background: '#1a56db', cursor: 'pointer' }}>Yes, move it</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#dc2626', marginBottom: '8px' }}>⚠ Invalid status transition</div>
                  <div style={{ fontSize: '13px', color: '#475569', marginBottom: '12px', lineHeight: '1.6' }}>
                    <strong>{confirm.jobNo}</strong> cannot move from{' '}
                    <span style={{ fontWeight: '600', color: '#dc2626' }}>{statusLabels[confirm.currentStatus]}</span> directly to{' '}
                    <span style={{ fontWeight: '600', color: '#dc2626' }}>{statusLabels[confirm.targetStatus]}</span>.
                  </div>
                  <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#a32d2d', marginBottom: '4px' }}>Correct flow:</div>
                    <div style={{ fontSize: '12px', color: '#dc2626', lineHeight: '1.6' }}>
                      {confirm.currentStatus === 'open'
                        ? 'Open → In Progress → Completed (or Waiting Parts if needed)'
                        : confirm.currentStatus === 'waiting_parts'
                        ? 'Waiting Parts → In Progress → Completed'
                        : 'Open → In Progress → Completed'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => setConfirm(null)} style={{ padding: '8px 18px', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', color: '#fff', background: '#dc2626', cursor: 'pointer' }}>Understood</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Job tracking board</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Live board — auto refreshes every {AUTO_REFRESH_SECONDS}s</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px' }}>
            Next refresh in <strong style={{ color: '#1a56db' }}>{countdown}s</strong>
          </div>
          <button onClick={() => { fetchJobs(true); resetTimer() }} style={{ padding: '8px 16px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>
            ↻ Refresh now
          </button>
        </div>
      </div>

      {/* ── Success message ── */}
      {message && (
        <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', color: '#16a34a', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          ✓ {message}
        </div>
      )}

      {/* ── Kanban Board — NO separate count strip, counts are inside column headers only ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontSize: '13px', background: '#fff', borderRadius: '10px', border: '0.5px solid #e2e8f0' }}>
          Loading jobs...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', alignItems: 'start' }}>
          {columns.map(col => {
            const colJobs = jobs.filter(j => j.status === col.key)
            const allowed = allowedTransitions[col.key] || []

            return (
              <div key={col.key} style={{ background: '#f8fafc', borderRadius: '10px', border: `1px solid ${col.color}33`, minHeight: '500px' }}>

                {/* Column Header — this is the ONLY header, no duplicate */}
                <div style={{ background: col.bg, borderRadius: '10px 10px 0 0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${col.color}33` }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: col.color }}>{col.label}</span>
                  <span style={{ background: '#fff', color: col.color, padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', border: `0.5px solid ${col.color}44` }}>
                    {colJobs.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ padding: '10px' }}>
                  {colJobs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8', fontSize: '12px' }}>
                      No jobs here
                    </div>
                  ) : (
                    colJobs.map(job => {
                      const priority = priorityColors[job.priority] || priorityColors.medium
                      const isOverdue = job.deadline && job.deadline.slice(0, 10) < today && job.status !== 'completed'
                      const isUpdating = updating === job.id

                      return (
                        <div key={job.id} style={{
                          background: '#fff',
                          border: `0.5px solid ${isOverdue ? '#fca5a5' : '#e2e8f0'}`,
                          borderLeft: `3px solid ${isOverdue ? '#dc2626' : col.color}`,
                          borderRadius: '8px', padding: '10px 12px', marginBottom: '8px',
                          opacity: isUpdating ? 0.6 : 1,
                        }}>

                          {/* Job no + overdue badge */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#1a56db' }}>{job.jobNo}</span>
                            {isOverdue && (
                              <span style={{ fontSize: '10px', background: '#fef2f2', color: '#dc2626', padding: '1px 6px', borderRadius: '10px', fontWeight: '600' }}>OVERDUE</span>
                            )}
                          </div>

                          {/* Title */}
                          <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: '500', marginBottom: '4px', lineHeight: '1.4' }}>
                            {job.jobTitle.length > 40 ? job.jobTitle.slice(0, 40) + '…' : job.jobTitle}
                          </div>

                          {/* Client */}
                          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>{job.client.companyName}</div>

                          {/* Priority + Technician */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ background: priority.bg, color: priority.color, padding: '2px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: '500', textTransform: 'capitalize' }}>
                              {job.priority}
                            </span>
                            {job.technician && (
                              <span style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#e6f1fb', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '600', color: '#185fa5' }}>
                                  {job.technician.name.charAt(0).toUpperCase()}
                                </span>
                                {job.technician.name.split(' ')[0]}
                              </span>
                            )}
                          </div>

                          {/* Deadline */}
                          {job.deadline && (
                            <div style={{ fontSize: '11px', color: isOverdue ? '#dc2626' : '#64748b', marginBottom: '8px' }}>
                              Due: {formatDate(job.deadline)}
                            </div>
                          )}

                          {/* Move dropdown or completed label */}
                          {allowed.length > 0 ? (
                            <select
                              disabled={isUpdating}
                              value=""
                              onChange={e => { if (e.target.value) handleMoveRequest(job, e.target.value) }}
                              style={{ width: '100%', height: '28px', padding: '0 6px', border: '0.5px solid #e2e8f0', borderRadius: '5px', fontSize: '11px', color: '#475569', background: '#f8fafc', cursor: 'pointer' }}
                            >
                              <option value="">Move to...</option>
                              {columns.filter(c => c.key !== col.key).map(c => (
                                <option key={c.key} value={c.key}>
                                  {allowed.includes(c.key) ? '✓' : '✗'} {c.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '500', textAlign: 'center', padding: '4px', background: '#f0fdf4', borderRadius: '5px' }}>
                              ✓ Completed
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}