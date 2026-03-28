'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'

type Employee = { id: string; empCode: string; name: string; designation: string | null; department: string | null }

type HRDoc = {
  id: string
  employeeId: string
  employeeName: string
  docType: string
  docName: string
  fileUrl: string | null
  expiryDate: string | null
  status: string
  approvedBy: string | null
  notes: string | null
  uploadedAt: string
}

const docTypes = [
  'Offer Letter', 'Appointment Letter', 'ID Proof', 'Address Proof',
  'Educational Certificate', 'Experience Letter', 'Salary Slip', 'Contract', 'NDA', 'Other',
]

const docTypeColors: Record<string, { bg: string; color: string }> = {
  'Offer Letter': { bg: '#e6f1fb', color: '#185fa5' },
  'Appointment Letter': { bg: '#eeedfe', color: '#534ab7' },
  'ID Proof': { bg: '#faeeda', color: '#854f0b' },
  'Address Proof': { bg: '#eaf3de', color: '#3b6d11' },
  'Educational Certificate': { bg: '#e1f5ee', color: '#0f6e56' },
  'Experience Letter': { bg: '#fbeaf0', color: '#993556' },
  'Salary Slip': { bg: '#fcebeb', color: '#a32d2d' },
  'Contract': { bg: '#f1efe8', color: '#5f5e5a' },
  'NDA': { bg: '#faeeda', color: '#854f0b' },
  'Other': { bg: '#f1f5f9', color: '#475569' },
}

const statusColors: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: '#faeeda', color: '#854f0b', label: 'Pending' },
  approved: { bg: '#eaf3de', color: '#3b6d11', label: 'Approved' },
  rejected: { bg: '#fcebeb', color: '#a32d2d', label: 'Rejected' },
  expired: { bg: '#f1f5f9', color: '#475569', label: 'Expired' },
}

const inputStyle = {
  width: '100%',
  height: '36px',
  padding: '0 10px',
  border: '0.5px solid #e2e8f0',
  borderRadius: '6px',
  fontSize: '13px',
  outline: 'none',
  background: '#fff',
  color: '#0f172a',
}

const labelStyle = {
  display: 'block' as const,
  fontSize: '12px',
  fontWeight: '500' as const,
  color: '#475569',
  marginBottom: '4px',
}

// Open a file URL correctly.
// New PDFs: local /uploads/... path — open directly.
// Old PDFs: stored in Cloudinary — try to open as-is (may not work for old ones).
// Images: Cloudinary /image/upload/ URL — open directly.
function fixFileUrl(url: string | null): string | null {
  if (!url) return null
  // Local file (new PDFs saved to public/uploads/) — use as-is
  if (url.startsWith('/uploads/')) return url
  // Cloudinary image — use as-is
  if (url.includes('/image/upload/')) return url
  // Old Cloudinary raw PDF — return as-is (user will need to re-upload)
  return url
}

// Build a clean filename for upload: EMP001_OfferLetter
function buildFileName(empCode: string, docName: string): string {
  const clean = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  return `${clean(empCode)}_${clean(docName)}`
}

export default function HRDocsPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [docs, setDocs] = useState<HRDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [search, setSearch] = useState('')
  const [empFilter, setEmpFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expiringCount, setExpiringCount] = useState(0)
  const [expiredCount, setExpiredCount] = useState(0)
  const [approveModal, setApproveModal] = useState<HRDoc | null>(null)
  const [approvedBy, setApprovedBy] = useState('')
  const [viewDoc, setViewDoc] = useState<HRDoc | null>(null)

  const [form, setForm] = useState({
    employeeId: '',
    docType: 'Offer Letter',
    docName: '',
    fileUrl: '',
    expiryDate: '',
    notes: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [empRes, docsRes] = await Promise.all([
      fetch('/api/employees?limit=200'),
      fetch('/api/hr-docs'),
    ])
    const empData = await empRes.json()
    const docsData = await docsRes.json()
    setEmployees(empData.employees || [])
    setDocs(docsData.docs || [])
    setExpiringCount(docsData.expiringCount || 0)
    setExpiredCount(docsData.expiredCount || 0)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function showMsg(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 4000)
  }

  async function handleFileUpload(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'hr-docs')

      // Build filename from selected employee code + doc name
      const selectedEmp = employees.find(e => e.id === form.employeeId)
      const empCode = selectedEmp?.empCode || 'EMP'
      const docLabel = form.docName || form.docType
      const fileName = buildFileName(empCode, docLabel)
      formData.append('fileName', fileName)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { showMsg(data.message || 'Upload failed', 'error'); setUploading(false); return }
      setForm(p => ({ ...p, fileUrl: data.url }))
      showMsg('File uploaded successfully!', 'success')
    } catch {
      showMsg('Upload failed. Please try again.', 'error')
    }
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.employeeId || !form.docName) { showMsg('Please fill all required fields', 'error'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/hr-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        showMsg('Document recorded successfully!', 'success')
        setForm({ employeeId: '', docType: 'Offer Letter', docName: '', fileUrl: '', expiryDate: '', notes: '' })
        fetchData()
      }
    } catch {
      showMsg('Failed to save document', 'error')
    }
    setSubmitting(false)
  }

  async function handleApprove(status: string) {
    if (!approveModal) return
    try {
      const res = await fetch('/api/hr-docs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: approveModal.id, status, approvedBy: approvedBy || null }),
      })
      if (res.ok) {
        showMsg(`Document ${status}!`, 'success')
        setApproveModal(null)
        setApprovedBy('')
        fetchData()
      }
    } catch {
      showMsg('Update failed', 'error')
    }
  }

  const now = new Date()
  const in30Days = new Date()
  in30Days.setDate(in30Days.getDate() + 30)

  const filtered = docs.filter(doc => {
    const matchSearch = !search ||
      doc.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      doc.docName.toLowerCase().includes(search.toLowerCase()) ||
      doc.docType.toLowerCase().includes(search.toLowerCase())
    const matchEmp = !empFilter || doc.employeeId === empFilter
    const matchStatus = !statusFilter || doc.status === statusFilter
    return matchSearch && matchEmp && matchStatus
  })

  const getExpiryStatus = (doc: HRDoc) => {
    if (!doc.expiryDate) return null
    const expiry = new Date(doc.expiryDate)
    if (expiry < now) return 'expired'
    if (expiry <= in30Days) return 'expiring'
    return 'valid'
  }

  const daysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate)
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  function openFile(url: string | null) {
    const fixed = fixFileUrl(url)
    if (fixed) window.open(fixed, '_blank')
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>HR documents</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          Store and manage employee documents, contracts and compliance files
        </p>
      </div>

      {/* Expiry Alerts */}
      {(expiringCount > 0 || expiredCount > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {expiredCount > 0 && (
            <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>🚨</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#dc2626' }}>
                  {expiredCount} document{expiredCount > 1 ? 's' : ''} expired
                </div>
                <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '1px' }}>
                  These documents have passed their expiry date — please renew immediately
                </div>
              </div>
            </div>
          )}
          {expiringCount > 0 && (
            <div style={{ background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#92400e' }}>
                  {expiringCount} document{expiringCount > 1 ? 's' : ''} expiring within 30 days
                </div>
                <div style={{ fontSize: '12px', color: '#b45309', marginTop: '1px' }}>
                  Please renew these documents before they expire
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total documents', value: docs.length, color: '#0f172a', bg: '#fff' },
          { label: 'Pending approval', value: docs.filter(d => d.status === 'pending').length, color: '#854f0b', bg: '#faeeda' },
          { label: 'Expiring soon', value: expiringCount, color: '#92400e', bg: '#fffbeb' },
          { label: 'Expired', value: expiredCount, color: '#dc2626', bg: '#fef2f2' },
        ].map(stat => (
          <div key={stat.label} style={{ background: stat.bg, border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>{stat.label}</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '16px' }}>

        {/* Add Document Form */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '18px', height: 'fit-content' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '14px', paddingBottom: '8px', borderBottom: '0.5px solid #e2e8f0' }}>
            Add document
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Employee *</label>
              <select value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))} style={inputStyle}>
                <option value="">— Select employee —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.empCode})</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Document type *</label>
              <select value={form.docType} onChange={e => setForm(p => ({ ...p, docType: e.target.value }))} style={inputStyle}>
                {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Document name *</label>
              <input
                value={form.docName}
                onChange={e => setForm(p => ({ ...p, docName: e.target.value }))}
                placeholder="e.g. Offer letter Jan 2025"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Expiry date (if applicable)</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={e => setForm(p => ({ ...p, expiryDate: e.target.value }))}
                style={inputStyle}
              />
            </div>

            {/* File Upload */}
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Upload file</label>
              {/* Hint about naming */}
              {form.employeeId && form.docName && (
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', background: '#f8fafc', padding: '5px 8px', borderRadius: '5px', border: '0.5px solid #e2e8f0' }}>
                  📁 Will save as: <strong>{buildFileName(employees.find(e => e.id === form.employeeId)?.empCode || 'EMP', form.docName)}</strong>
                </div>
              )}
              <div style={{ border: '0.5px dashed #bfdbfe', borderRadius: '7px', padding: '14px', background: '#f8fafc', textAlign: 'center' as const }}>
                {form.fileUrl ? (
                  <div>
                    <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: '500', marginBottom: '6px' }}>
                      ✓ File uploaded
                    </div>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => openFile(form.fileUrl)}
                        style={{ fontSize: '11px', color: '#1a56db', background: '#eff6ff', padding: '4px 10px', borderRadius: '5px', border: '0.5px solid #bfdbfe', cursor: 'pointer' }}
                      >
                        View file
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(p => ({ ...p, fileUrl: '' }))}
                        style={{ fontSize: '11px', color: '#dc2626', background: '#fef2f2', padding: '4px 10px', borderRadius: '5px', border: '0.5px solid #fecaca', cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>📄</div>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: uploading ? '#93c5fd' : '#1a56db', marginBottom: '2px' }}>
                      {uploading ? 'Uploading...' : 'Click to browse file'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>JPG, PNG, PDF — max 5MB</div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      style={{ display: 'none' }}
                      disabled={uploading}
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file)
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Additional notes..."
                rows={2}
                style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' as const }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || uploading}
              style={{ width: '100%', padding: '9px', background: submitting ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
            >
              {submitting ? 'Saving...' : '+ Add document'}
            </button>
          </form>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' as const }}>
            <input
              placeholder="Search employee, document..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, flex: 1, minWidth: '160px' }}
            />
            <select value={empFilter} onChange={e => setEmpFilter(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
              <option value="">All employees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
              <option value="">All status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            {(search || empFilter || statusFilter) && (
              <button
                onClick={() => { setSearch(''); setEmpFilter(''); setStatusFilter('') }}
                style={{ ...inputStyle, padding: '0 12px', color: '#64748b', cursor: 'pointer', width: 'auto' }}
              >
                Clear
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Employee', 'Type', 'Document name', 'Expiry', 'Status', 'File', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No documents found</td></tr>
                ) : filtered.map(doc => {
                  const docColor = docTypeColors[doc.docType] || docTypeColors['Other']
                  const sc = statusColors[doc.status] || statusColors.pending
                  const expiryStatus = getExpiryStatus(doc)
                  return (
                    <tr
                      key={doc.id}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = expiryStatus === 'expired' ? '#fff9f9' : expiryStatus === 'expiring' ? '#fffdf0' : 'transparent')}
                      style={{ background: expiryStatus === 'expired' ? '#fff9f9' : expiryStatus === 'expiring' ? '#fffdf0' : 'transparent' }}
                    >
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>
                        {doc.employeeName}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <span style={{ background: docColor.bg, color: docColor.color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>
                          {doc.docType}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <div
                          style={{ fontSize: '13px', color: '#1a56db', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                          onClick={() => setViewDoc(doc)}
                        >
                          {doc.docName}
                        </div>
                        {doc.notes && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{doc.notes}</div>}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {doc.expiryDate ? (
                          <div>
                            <div style={{ color: expiryStatus === 'expired' ? '#dc2626' : expiryStatus === 'expiring' ? '#92400e' : '#64748b', fontWeight: expiryStatus !== 'valid' ? '600' : '400' }}>
                              {formatDate(doc.expiryDate)}
                            </div>
                            {expiryStatus === 'expired' && <div style={{ fontSize: '10px', color: '#dc2626', marginTop: '2px' }}>🚨 Expired</div>}
                            {expiryStatus === 'expiring' && <div style={{ fontSize: '10px', color: '#92400e', marginTop: '2px' }}>⚠️ {daysUntilExpiry(doc.expiryDate)}d left</div>}
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>
                          {sc.label}
                        </span>
                        {doc.approvedBy && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>by {doc.approvedBy}</div>}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        {doc.fileUrl ? (
                          <button
                            onClick={() => openFile(doc.fileUrl)}
                            style={{ fontSize: '11px', color: '#1a56db', background: '#eff6ff', padding: '3px 8px', borderRadius: '5px', border: '0.5px solid #bfdbfe', cursor: 'pointer' }}
                          >
                            📎 View
                          </button>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>No file</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => setViewDoc(doc)}
                            style={{ padding: '3px 8px', border: '0.5px solid #e2e8f0', borderRadius: '5px', fontSize: '11px', color: '#475569', background: '#f8fafc', cursor: 'pointer' }}
                          >
                            View
                          </button>
                          {doc.status === 'pending' && (
                            <button
                              onClick={() => { setApproveModal(doc); setApprovedBy('') }}
                              style={{ padding: '3px 8px', border: '0.5px solid #bbf7d0', borderRadius: '5px', fontSize: '11px', color: '#16a34a', background: '#f0fdf4', cursor: 'pointer' }}
                            >
                              Approve
                            </button>
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

      {/* ── View Document Modal ── */}
      {viewDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>Document details</div>
              <button onClick={() => setViewDoc(null)} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Expiry warning inside modal */}
            {viewDoc.expiryDate && (() => {
              const es = getExpiryStatus(viewDoc)
              if (es === 'expired') return (
                <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span>🚨</span>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#dc2626' }}>Document expired</div>
                    <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '1px' }}>Expired on {formatDate(viewDoc.expiryDate)}. Please renew immediately.</div>
                  </div>
                </div>
              )
              if (es === 'expiring') return (
                <div style={{ background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span>⚠️</span>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#92400e' }}>Expiring in {daysUntilExpiry(viewDoc.expiryDate)} days</div>
                    <div style={{ fontSize: '11px', color: '#b45309', marginTop: '1px' }}>Expires on {formatDate(viewDoc.expiryDate)}. Please renew before it expires.</div>
                  </div>
                </div>
              )
              return null
            })()}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { label: 'Employee', value: viewDoc.employeeName },
                { label: 'Document type', value: viewDoc.docType },
                { label: 'Document name', value: viewDoc.docName },
                { label: 'Status', value: statusColors[viewDoc.status]?.label || viewDoc.status },
                { label: 'Approved by', value: viewDoc.approvedBy || '—' },
                { label: 'Uploaded on', value: formatDate(viewDoc.uploadedAt) },
                { label: 'Expiry date', value: viewDoc.expiryDate ? formatDate(viewDoc.expiryDate) : '—' },
                { label: 'Notes', value: viewDoc.notes || '—' },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px' }}>
                  <span style={{ color: '#64748b', fontWeight: '500' }}>{f.label}</span>
                  <span style={{ color: '#0f172a', maxWidth: '260px', textAlign: 'right' }}>{f.value}</span>
                </div>
              ))}
            </div>

            {viewDoc.fileUrl && (
              <button
                onClick={() => openFile(viewDoc.fileUrl)}
                style={{ display: 'block', width: '100%', marginTop: '16px', padding: '10px', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '8px', textAlign: 'center', color: '#1a56db', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
              >
                📎 Open document file
              </button>
            )}

            {viewDoc.status === 'pending' && (
              <button
                onClick={() => { setApproveModal(viewDoc); setViewDoc(null); setApprovedBy('') }}
                style={{ width: '100%', marginTop: '10px', padding: '10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
              >
                ✓ Approve this document
              </button>
            )}

            <button
              onClick={() => setViewDoc(null)}
              style={{ width: '100%', marginTop: '8px', padding: '9px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Approve / Reject Modal ── */}
      {approveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>Approve document</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>
              {approveModal.docName} — {approveModal.employeeName}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Approved by</label>
              <input
                value={approvedBy}
                onChange={e => setApprovedBy(e.target.value)}
                placeholder="Your name or manager name"
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleApprove('approved')}
                style={{ flex: 1, padding: '9px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
              >
                ✓ Approve
              </button>
              <button
                onClick={() => handleApprove('rejected')}
                style={{ flex: 1, padding: '9px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
              >
                ✕ Reject
              </button>
              <button
                onClick={() => setApproveModal(null)}
                style={{ flex: 1, padding: '9px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}