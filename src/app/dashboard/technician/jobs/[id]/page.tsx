'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { formatDate } from '@/lib/utils'

type SparePart = { id: string; partName: string; partCode: string | null; quantity: number; unit: string; unitPrice: number; totalPrice: number; notes: string | null }
type JobNote = { id: string; note: string; addedByName: string; createdAt: string }
type CheckIn = { id: string; checkInTime: string; checkOutTime: string | null }

type Job = {
  id: string; jobNo: string; jobTitle: string; jobType: string
  priority: string; status: string; deadline: string | null
  jobDate: string; completedAt: string | null; completionNotes: string | null
  faultDescription: string | null; remarks: string | null
  estimatedAmount: number | null
  client: { companyName: string; contactPerson: string; phone: string; address: string | null; gstin: string | null }
  technician: { name: string; skill: string; phone: string } | null
  spareParts: SparePart[]
  notes: JobNote[]
  checkIns: CheckIn[]
  siteVisitLogs: { id: string; visitDate: string; actionTaken: string | null; clientSatisfaction: string | null }[]
}

const statusColor: Record<string, { bg: string; color: string }> = {
  open:          { bg: '#e6f1fb', color: '#185fa5' },
  in_progress:   { bg: '#faeeda', color: '#854f0b' },
  waiting_parts: { bg: '#fdf4ff', color: '#7e22ce' },
  completed:     { bg: '#eaf3de', color: '#3b6d11' },
}

const inputStyle = {
  width: '100%', height: '36px', padding: '0 10px',
  border: '0.5px solid #e2e8f0', borderRadius: '6px',
  fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a',
}

export default function JobDetailPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params?.id as string

  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'detail' | 'parts' | 'notes' | 'visit'>('detail')
  const [message, setMessage] = useState({ text: '', type: '' })

  // Update status form
  const [statusForm, setStatusForm] = useState({ status: '', note: '' })
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showStatusForm, setShowStatusForm] = useState(false)

  // Add part form
  const [partForm, setPartForm] = useState({ partName: '', partCode: '', quantity: '1', unit: 'pcs', unitPrice: '', notes: '' })
  const [addingPart, setAddingPart] = useState(false)
  const [showPartForm, setShowPartForm] = useState(false)

  // Check in/out
  const [checkingIn, setCheckingIn] = useState(false)

  const fetchJob = useCallback(async () => {
    const res = await fetch(`/api/jobs/${jobId}/status`)
    const data = await res.json()
    setJob(data.job || null)
    if (data.job) setStatusForm(p => ({ ...p, status: data.job.status }))
    setLoading(false)
  }, [jobId])

  useEffect(() => { fetchJob() }, [fetchJob])

  function showMsg(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 4000)
  }

  async function updateStatus() {
    if (!statusForm.status) return
    setUpdatingStatus(true)
    const res = await fetch(`/api/jobs/${jobId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: statusForm.status, note: statusForm.note, updatedByName: job?.technician?.name || 'Technician' }),
    })
    if (res.ok) {
      showMsg('Job status updated successfully!', 'success')
      setShowStatusForm(false)
      fetchJob()
    } else {
      showMsg('Failed to update status', 'error')
    }
    setUpdatingStatus(false)
  }

  async function addPart() {
    if (!partForm.partName || !partForm.quantity) return
    setAddingPart(true)
    const qty = parseFloat(partForm.quantity) || 1
    const price = parseFloat(partForm.unitPrice) || 0
    const res = await fetch('/api/spare-parts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId, partName: partForm.partName, partCode: partForm.partCode || null,
        quantity: qty, unit: partForm.unit, unitPrice: price,
        totalPrice: qty * price, notes: partForm.notes || null,
      }),
    })
    if (res.ok) {
      showMsg('Spare part logged successfully!', 'success')
      setPartForm({ partName: '', partCode: '', quantity: '1', unit: 'pcs', unitPrice: '', notes: '' })
      setShowPartForm(false)
      fetchJob()
    } else {
      showMsg('Failed to log part', 'error')
    }
    setAddingPart(false)
  }

  async function checkIn() {
    setCheckingIn(true)
    await fetch(`/api/jobs/${jobId}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'in' }),
    })
    showMsg('Checked in successfully!', 'success')
    fetchJob()
    setCheckingIn(false)
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading job details...</div>
  if (!job) return <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>Job not found</div>

  const sc = statusColor[job.status] || statusColor.open
  const overdue = job.deadline && new Date(job.deadline) < new Date() && job.status !== 'completed'
  const hasCheckedIn = job.checkIns.length > 0 && !job.checkIns[0].checkOutTime
  const nextStatuses: Record<string, string[]> = {
    open: ['in_progress'],
    in_progress: ['waiting_parts', 'completed'],
    waiting_parts: ['in_progress'],
  }
  const allowedNext = nextStatuses[job.status] || []

  return (
    <div>
      {/* Back + header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <button onClick={() => router.push('/dashboard/technician/jobs')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', marginBottom: '4px', padding: 0 }}>
            ← My jobs
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>{job.jobNo}</h1>
            <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' }}>
              {job.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </span>
            {overdue && <span style={{ background: '#fef2f2', color: '#dc2626', padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '600' }}>⚠️ OVERDUE</span>}
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{job.jobTitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {!hasCheckedIn && job.jobType === 'onsite' && job.status !== 'completed' && (
            <button onClick={checkIn} disabled={checkingIn} style={{ padding: '8px 14px', background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '7px', fontSize: '12px', color: '#16a34a', cursor: 'pointer', fontWeight: '500' }}>
              📍 Check in
            </button>
          )}
          {allowedNext.length > 0 && (
            <button onClick={() => setShowStatusForm(!showStatusForm)} style={{ padding: '8px 16px', background: '#1a56db', border: 'none', borderRadius: '7px', fontSize: '13px', color: '#fff', cursor: 'pointer', fontWeight: '500' }}>
              Update status
            </button>
          )}
        </div>
      </div>

      {message.text && (
        <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#16a34a' : '#dc2626', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      {/* Update status inline form */}
      {showStatusForm && (
        <div style={{ background: '#f0f7ff', border: '0.5px solid #bfdbfe', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>Update job status</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '4px' }}>New status *</label>
              <select value={statusForm.status} onChange={e => setStatusForm(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
                {allowedNext.map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                {statusForm.status === 'completed' ? 'Completion notes *' : 'Notes (optional)'}
              </label>
              <input value={statusForm.note} onChange={e => setStatusForm(p => ({ ...p, note: e.target.value }))} placeholder="What did you do / what happened?" style={inputStyle} />
            </div>
          </div>
          {statusForm.status === 'completed' && (
            <div style={{ background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: '6px', padding: '8px 12px', marginBottom: '12px', fontSize: '12px', color: '#92400e' }}>
              ⚠️ Marking as complete will notify the manager. Make sure all spare parts are logged before completing.
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={updateStatus} disabled={updatingStatus} style={{ padding: '8px 20px', background: statusForm.status === 'completed' ? '#16a34a' : '#1a56db', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              {updatingStatus ? 'Updating...' : statusForm.status === 'completed' ? '✓ Mark complete' : 'Update status'}
            </button>
            <button onClick={() => setShowStatusForm(false)} style={{ padding: '8px 16px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: '#f8fafc', borderRadius: '8px', padding: '4px', width: 'fit-content' }}>
        {[
          { id: 'detail', label: '📋 Job details' },
          { id: 'parts', label: `🔩 Parts (${job.spareParts.length})` },
          { id: 'notes', label: `📝 Notes (${job.notes.length})` },
          { id: 'visit', label: `🏗 Site visits (${job.siteVisitLogs.length})` },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{ padding: '7px 14px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', background: activeTab === tab.id ? '#fff' : 'transparent', color: activeTab === tab.id ? '#0f172a' : '#64748b', boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* DETAIL TAB */}
      {activeTab === 'detail' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '12px', paddingBottom: '8px', borderBottom: '0.5px solid #f1f5f9' }}>Job information</div>
            {[
              { label: 'Job type', value: job.jobType },
              { label: 'Priority', value: job.priority },
              { label: 'Job date', value: formatDate(job.jobDate) },
              { label: 'Deadline', value: job.deadline ? formatDate(job.deadline) : '—' },
              { label: 'Fault description', value: job.faultDescription || '—' },
              { label: 'Office remarks', value: job.remarks || '—' },
              { label: 'Est. value', value: job.estimatedAmount ? `₹${job.estimatedAmount.toLocaleString('en-IN')}` : '—' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', gap: '10px', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#64748b', fontWeight: '500', width: '140px', flexShrink: 0 }}>{f.label}</span>
                <span style={{ color: '#0f172a' }}>{f.value}</span>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '12px', paddingBottom: '8px', borderBottom: '0.5px solid #f1f5f9' }}>Client information</div>
            {[
              { label: 'Company', value: job.client.companyName },
              { label: 'Contact', value: job.client.contactPerson },
              { label: 'Phone', value: job.client.phone },
              { label: 'Address', value: job.client.address || '—' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', gap: '10px', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#64748b', fontWeight: '500', width: '80px', flexShrink: 0 }}>{f.label}</span>
                <span style={{ color: '#0f172a' }}>{f.value}</span>
              </div>
            ))}
            <button onClick={() => window.open(`tel:${job.client.phone}`)}
              style={{ width: '100%', marginTop: '8px', padding: '8px', background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '7px', color: '#16a34a', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
              📞 Call {job.client.contactPerson}
            </button>
          </div>
          {/* Action buttons */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px' }}>
            <button onClick={() => setActiveTab('parts')} style={{ flex: 1, padding: '10px', background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}>🔩 Log spare parts</button>
            <button onClick={() => { setActiveTab('visit'); router.push(`/dashboard/technician/jobs/${jobId}/visit`) }} style={{ flex: 1, padding: '10px', background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}>🏗 Record site visit</button>
            <button onClick={() => router.push(`/dashboard/technician/requests/new?type=job_transfer&jobId=${jobId}&jobNo=${job.jobNo}`)} style={{ flex: 1, padding: '10px', background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: '8px', fontSize: '13px', color: '#92400e', cursor: 'pointer' }}>🔄 Request transfer</button>
          </div>
        </div>
      )}

      {/* PARTS TAB */}
      {activeTab === 'parts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Spare parts used</div>
            {job.status !== 'completed' && (
              <button onClick={() => setShowPartForm(!showPartForm)} style={{ padding: '6px 14px', background: '#1a56db', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#fff', cursor: 'pointer' }}>+ Log part</button>
            )}
          </div>

          {showPartForm && (
            <div style={{ background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px 100px', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#475569', marginBottom: '3px' }}>Part name *</label>
                  <input value={partForm.partName} onChange={e => setPartForm(p => ({ ...p, partName: e.target.value }))} placeholder="e.g. Bearing 6205" style={{ ...inputStyle, height: '32px', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#475569', marginBottom: '3px' }}>Part code</label>
                  <input value={partForm.partCode} onChange={e => setPartForm(p => ({ ...p, partCode: e.target.value }))} placeholder="Optional" style={{ ...inputStyle, height: '32px', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#475569', marginBottom: '3px' }}>Qty *</label>
                  <input type="number" value={partForm.quantity} min="1" onChange={e => setPartForm(p => ({ ...p, quantity: e.target.value }))} style={{ ...inputStyle, height: '32px', fontSize: '12px', textAlign: 'center' as const }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#475569', marginBottom: '3px' }}>Unit</label>
                  <select value={partForm.unit} onChange={e => setPartForm(p => ({ ...p, unit: e.target.value }))} style={{ ...inputStyle, height: '32px', fontSize: '12px' }}>
                    {['pcs', 'kg', 'mtr', 'set', 'ltr'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#475569', marginBottom: '3px' }}>Unit price (₹)</label>
                  <input type="number" value={partForm.unitPrice} onChange={e => setPartForm(p => ({ ...p, unitPrice: e.target.value }))} placeholder="0" style={{ ...inputStyle, height: '32px', fontSize: '12px' }} />
                </div>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#475569', marginBottom: '3px' }}>Notes</label>
                <input value={partForm.notes} onChange={e => setPartForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes about this part" style={{ ...inputStyle, height: '32px', fontSize: '12px' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={addPart} disabled={addingPart} style={{ padding: '7px 16px', background: '#1a56db', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  {addingPart ? 'Saving...' : '+ Log part'}
                </button>
                <button onClick={() => setShowPartForm(false)} style={{ padding: '7px 12px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#475569', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}

          {job.spareParts.length === 0 ? (
            <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              No spare parts logged yet. Click + Log part to add parts used.
            </div>
          ) : (
            <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Part name', 'Code', 'Qty', 'Unit', 'Unit price', 'Total', 'Notes'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {job.spareParts.map(part => (
                    <tr key={part.id}>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{part.partName}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>{part.partCode || '—'}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#0f172a' }}>{part.quantity}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>{part.unit}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#0f172a' }}>₹{part.unitPrice.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#16a34a' }}>₹{part.totalPrice.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>{part.notes || '—'}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f8fafc' }}>
                    <td colSpan={5} style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Total parts value</td>
                    <td style={{ padding: '10px 12px', fontSize: '14px', fontWeight: '700', color: '#16a34a' }}>₹{job.spareParts.reduce((s, p) => s + p.totalPrice, 0).toLocaleString('en-IN')}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* NOTES TAB */}
      {activeTab === 'notes' && (
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>Work notes</div>
          {job.notes.length === 0 ? (
            <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              No notes yet. Notes are added when you update the job status.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {job.notes.map(note => (
                <div key={note.id} style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#1a56db' }}>{note.addedByName}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(note.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#0f172a' }}>{note.note}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SITE VISITS TAB */}
      {activeTab === 'visit' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Site visit logs</div>
            {job.status !== 'completed' && (
              <button onClick={() => router.push(`/dashboard/technician/jobs/${jobId}/visit`)} style={{ padding: '6px 14px', background: '#1a56db', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#fff', cursor: 'pointer' }}>+ Record visit</button>
            )}
          </div>
          {job.siteVisitLogs.length === 0 ? (
            <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              No site visits recorded yet.{' '}
              <span onClick={() => router.push(`/dashboard/technician/jobs/${jobId}/visit`)} style={{ color: '#1a56db', cursor: 'pointer' }}>Record your first visit →</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {job.siteVisitLogs.map((log, i) => (
                <div key={log.id} style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>Visit #{i + 1}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{formatDate(log.visitDate)}</span>
                  </div>
                  {log.actionTaken && <div style={{ fontSize: '13px', color: '#475569', marginBottom: '4px' }}>{log.actionTaken}</div>}
                  {log.clientSatisfaction && (
                    <span style={{ fontSize: '11px', background: log.clientSatisfaction === 'Satisfied' ? '#eaf3de' : '#faeeda', color: log.clientSatisfaction === 'Satisfied' ? '#3b6d11' : '#854f0b', padding: '2px 8px', borderRadius: '8px' }}>
                      Client: {log.clientSatisfaction}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}