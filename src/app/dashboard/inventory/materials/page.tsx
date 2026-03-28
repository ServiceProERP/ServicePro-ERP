'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'

type MaterialReq = {
  id: string
  reqNo: string
  jobNo: string
  itemName: string
  quantity: number
  unit: string
  requiredBy: string | null
  status: string
  requestedBy: string
  notes?: string | null
  fileUrl?: string | null
  createdAt: string
}

type Job = { id: string; jobNo: string; jobTitle: string }

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: '#faeeda', color: '#854f0b', label: 'Pending' },
  approved: { bg: '#e6f1fb', color: '#185fa5', label: 'Approved' },
  issued:   { bg: '#eaf3de', color: '#3b6d11', label: 'Issued' },
  rejected: { bg: '#fef2f2', color: '#dc2626', label: 'Rejected' },
}

const inputStyle = {
  width: '100%', height: '36px', padding: '0 10px',
  border: '0.5px solid #e2e8f0', borderRadius: '6px',
  fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a',
}

const labelStyle = {
  display: 'block' as const,
  fontSize: '12px', fontWeight: '500' as const,
  color: '#475569', marginBottom: '4px',
}

export default function MaterialRequirementPage() {
  const [requests, setRequests] = useState<MaterialReq[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [viewReq, setViewReq] = useState<MaterialReq | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const [form, setForm] = useState({
    jobId: '',
    itemName: '',
    quantity: '',
    unit: 'pcs',
    requiredBy: '',
    requestedBy: '',
    notes: '',
    fileUrl: '',
    fileName: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [reqRes, jobsRes] = await Promise.all([
      fetch('/api/material-requests'),
      fetch('/api/jobs?limit=100'),
    ])
    const reqData = await reqRes.json()
    const jobsData = await jobsRes.json()
    setRequests(reqData.requests || [])
    setJobs(jobsData.jobs || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function showMsg(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  // Save file locally in public/uploads/materials
  async function handleFileUpload(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'materials')
      formData.append('fileName', `MAT_${form.itemName.replace(/[^a-zA-Z0-9]/g, '_') || 'doc'}_${Date.now()}`)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { showMsg(data.message || 'Upload failed', 'error'); setUploading(false); return }
      setForm(p => ({ ...p, fileUrl: data.url, fileName: file.name }))
      showMsg('File uploaded successfully!', 'success')
    } catch {
      showMsg('Upload failed. Please try again.', 'error')
    }
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.jobId || !form.itemName || !form.quantity) {
      showMsg('Please fill all required fields', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/material-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          notes: [form.notes, form.fileUrl ? `File: ${form.fileUrl}` : ''].filter(Boolean).join(' | ') || null,
        }),
      })
      if (res.ok) {
        showMsg('Material request created!', 'success')
        setForm({ jobId: '', itemName: '', quantity: '', unit: 'pcs', requiredBy: '', requestedBy: '', notes: '', fileUrl: '', fileName: '' })
        fetchData()
      } else {
        showMsg('Failed to create request', 'error')
      }
    } catch {
      showMsg('Failed to create request', 'error')
    }
    setSubmitting(false)
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/material-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchData()
  }

  // Extract file URL from notes if stored there
  function getFileUrl(req: MaterialReq): string | null {
    if (req.fileUrl) return req.fileUrl
    if (req.notes) {
      const match = req.notes.match(/File: (\/uploads\/[^\s|]+)/)
      if (match) return match[1]
    }
    return null
  }

  const filtered = requests.filter(r => !statusFilter || r.status === statusFilter)

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Material requirements</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Plan and approve material needs for jobs — attach reference photos or documents</p>
      </div>

      {message.text && (
        <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#16a34a' : '#dc2626', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total requests', value: String(requests.length), color: '#0f172a', bg: '#fff' },
          { label: 'Pending', value: String(requests.filter(r => r.status === 'pending').length), color: '#854f0b', bg: '#faeeda' },
          { label: 'Approved', value: String(requests.filter(r => r.status === 'approved').length), color: '#185fa5', bg: '#e6f1fb' },
          { label: 'Issued', value: String(requests.filter(r => r.status === 'issued').length), color: '#3b6d11', bg: '#eaf3de' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '16px' }}>

        {/* Form */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '18px', height: 'fit-content' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '14px', paddingBottom: '8px', borderBottom: '0.5px solid #e2e8f0' }}>
            New material request
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Job *</label>
              <select value={form.jobId} onChange={e => setForm(p => ({ ...p, jobId: e.target.value }))} style={inputStyle}>
                <option value="">— Select job —</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.jobNo} — {j.jobTitle}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Material / item name *</label>
              <input value={form.itemName} onChange={e => setForm(p => ({ ...p, itemName: e.target.value }))} placeholder="e.g. Bearing 6205, Control relay" style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={labelStyle}>Quantity *</label>
                <input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} placeholder="0" min="1" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Unit</label>
                <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} style={inputStyle}>
                  {['pcs', 'kg', 'ltr', 'mtr', 'set', 'box', 'roll', 'pair'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Required by date</label>
              <input type="date" value={form.requiredBy} onChange={e => setForm(p => ({ ...p, requiredBy: e.target.value }))} style={inputStyle} />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Requested by</label>
              <input value={form.requestedBy} onChange={e => setForm(p => ({ ...p, requestedBy: e.target.value }))} placeholder="Technician / engineer name" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Specifications, brand preference, urgency..." rows={2}
                style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' as const }} />
            </div>

            {/* Reference doc / photo upload */}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Reference doc / photo</label>
              <div style={{ border: '0.5px dashed #bfdbfe', borderRadius: '7px', padding: '14px', background: '#f8fafc', textAlign: 'center' as const }}>
                {form.fileUrl ? (
                  <div>
                    <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: '500', marginBottom: '6px' }}>
                      ✓ {form.fileName || 'File uploaded'}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button type="button" onClick={() => window.open(form.fileUrl, '_blank')}
                        style={{ fontSize: '11px', color: '#1a56db', background: '#eff6ff', padding: '4px 10px', borderRadius: '5px', border: '0.5px solid #bfdbfe', cursor: 'pointer' }}>
                        View file
                      </button>
                      <button type="button" onClick={() => setForm(p => ({ ...p, fileUrl: '', fileName: '' }))}
                        style={{ fontSize: '11px', color: '#dc2626', background: '#fef2f2', padding: '4px 10px', borderRadius: '5px', border: '0.5px solid #fecaca', cursor: 'pointer' }}>
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
                    <div style={{ fontSize: '22px', marginBottom: '4px' }}>📎</div>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: uploading ? '#93c5fd' : '#1a56db', marginBottom: '2px' }}>
                      {uploading ? 'Uploading...' : 'Browse photo or document'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>JPG, PNG, PDF — max 5MB</div>
                    <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: 'none' }} disabled={uploading}
                      onChange={e => { const file = e.target.files?.[0]; if (file) handleFileUpload(file) }} />
                  </label>
                )}
              </div>
            </div>

            <button type="submit" disabled={submitting || uploading}
              style={{ width: '100%', padding: '9px', background: submitting ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Saving...' : '+ Create request'}
            </button>
          </form>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>Material requests</div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ height: '34px', padding: '0 10px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#475569', background: '#fff', outline: 'none' }}>
              <option value="">All status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="issued">Issued</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Req no', 'Job', 'Item', 'Qty', 'Required by', 'Requested by', 'Ref doc', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No material requests found</td></tr>
                ) : filtered.map(req => {
                  const status = statusConfig[req.status] || statusConfig.pending
                  const fileUrl = getFileUrl(req)
                  return (
                    <tr key={req.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', fontWeight: '600', color: '#1a56db', cursor: 'pointer' }} onClick={() => setViewReq(req)}>
                        {req.reqNo}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#185fa5', fontWeight: '500' }}>{req.jobNo}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{req.itemName}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#0f172a' }}>{req.quantity} {req.unit}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {req.requiredBy ? formatDate(req.requiredBy) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>{req.requestedBy || '—'}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        {fileUrl ? (
                          <button onClick={() => window.open(fileUrl, '_blank')}
                            style={{ fontSize: '11px', color: '#1a56db', background: '#eff6ff', padding: '3px 8px', borderRadius: '5px', border: '0.5px solid #bfdbfe', cursor: 'pointer' }}>
                            📎 View
                          </button>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <span style={{ background: status.bg, color: status.color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>{status.label}</span>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => setViewReq(req)} style={{ padding: '3px 8px', border: '0.5px solid #e2e8f0', borderRadius: '5px', fontSize: '10px', color: '#475569', background: '#f8fafc', cursor: 'pointer' }}>View</button>
                          {req.status === 'pending' && (
                            <>
                              <button onClick={() => updateStatus(req.id, 'approved')} style={{ padding: '3px 8px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '10px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}>Approve</button>
                              <button onClick={() => updateStatus(req.id, 'rejected')} style={{ padding: '3px 8px', border: '0.5px solid #fecaca', borderRadius: '5px', fontSize: '10px', color: '#dc2626', background: '#fef2f2', cursor: 'pointer' }}>Reject</button>
                            </>
                          )}
                          {req.status === 'approved' && (
                            <button onClick={() => updateStatus(req.id, 'issued')} style={{ padding: '3px 8px', border: '0.5px solid #bbf7d0', borderRadius: '5px', fontSize: '10px', color: '#16a34a', background: '#f0fdf4', cursor: 'pointer' }}>Issue</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Request Modal */}
      {viewReq && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>Material request — {viewReq.reqNo}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>Created {formatDate(viewReq.createdAt)}</div>
              </div>
              <button onClick={() => setViewReq(null)} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>
            {[
              { label: 'Job', value: viewReq.jobNo },
              { label: 'Item name', value: viewReq.itemName },
              { label: 'Quantity', value: `${viewReq.quantity} ${viewReq.unit}` },
              { label: 'Required by', value: viewReq.requiredBy ? formatDate(viewReq.requiredBy) : '—' },
              { label: 'Requested by', value: viewReq.requestedBy || '—' },
              { label: 'Status', value: statusConfig[viewReq.status]?.label || viewReq.status },
              { label: 'Notes', value: viewReq.notes?.replace(/\s*\|\s*File:.*$/, '') || '—' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px' }}>
                <span style={{ color: '#64748b', fontWeight: '500' }}>{f.label}</span>
                <span style={{ color: '#0f172a', maxWidth: '260px', textAlign: 'right' as const }}>{f.value}</span>
              </div>
            ))}
            {getFileUrl(viewReq) && (
              <button onClick={() => window.open(getFileUrl(viewReq)!, '_blank')}
                style={{ display: 'block', width: '100%', marginTop: '16px', padding: '10px', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '8px', textAlign: 'center' as const, color: '#1a56db', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                📎 View reference document / photo
              </button>
            )}
            <button onClick={() => setViewReq(null)} style={{ width: '100%', marginTop: '8px', padding: '9px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}