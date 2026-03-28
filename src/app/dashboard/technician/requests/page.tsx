'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'

type TechRequest = {
  id: string; requestNo: string; technicianName: string; empCode: string | null
  type: string; subject: string; description: string; reason: string | null
  status: string; priority: string; createdAt: string
  approvedBy: string | null; approvedAt: string | null
  rejectionReason: string | null; adminNotes: string | null
  leaveType: string | null; leaveFrom: string | null; leaveTo: string | null; leaveDays: number | null
  expenseAmount: number | null; expenseCategory: string | null
  currentJobNo: string | null; transferToTechName: string | null
  overtimeDate: string | null; overtimeHours: number | null
  toolName: string | null; toolQuantity: number | null
  trainingTopic: string | null
  handoverToTechName: string | null; handoverDate: string | null
  advanceAmount: number | null
}

const typeConfig: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  job_transfer: { label: 'Job transfer',     icon: '🔄', color: '#185fa5', bg: '#e6f1fb' },
  leave:        { label: 'Leave',            icon: '🏖', color: '#3b6d11', bg: '#eaf3de' },
  material:     { label: 'Material',         icon: '🔩', color: '#854f0b', bg: '#faeeda' },
  overtime:     { label: 'Overtime',         icon: '⏰', color: '#534ab7', bg: '#eeedfe' },
  expense:      { label: 'Expense',          icon: '💸', color: '#0f6e56', bg: '#e1f5ee' },
  tool:         { label: 'Tool request',     icon: '🔧', color: '#475569', bg: '#f1f5f9' },
  training:     { label: 'Training',         icon: '📚', color: '#1a56db', bg: '#e6f1fb' },
  handover:     { label: 'Job handover',     icon: '📋', color: '#854f0b', bg: '#faeeda' },
  complaint:    { label: 'Complaint',        icon: '⚠️', color: '#dc2626', bg: '#fef2f2' },
  advance:      { label: 'Salary advance',   icon: '💰', color: '#92400e', bg: '#fffbeb' },
}

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: 'Pending',   bg: '#faeeda', color: '#854f0b' },
  approved:  { label: 'Approved',  bg: '#eaf3de', color: '#3b6d11' },
  rejected:  { label: 'Rejected',  bg: '#fef2f2', color: '#dc2626' },
  cancelled: { label: 'Cancelled', bg: '#f1f5f9', color: '#94a3b8' },
}

const priorityConfig: Record<string, { color: string }> = {
  urgent: { color: '#dc2626' },
  high:   { color: '#f59e0b' },
  normal: { color: '#64748b' },
  low:    { color: '#94a3b8' },
}

export default function TechnicianRequestsAdminPage() {
  const [requests, setRequests] = useState<TechRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [viewReq, setViewReq] = useState<TechRequest | null>(null)
  const [actionModal, setActionModal] = useState<{ req: TechRequest; action: 'approve' | 'reject' } | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ all: 'true' })
    if (typeFilter) params.set('type', typeFilter)
    if (statusFilter) params.set('status', statusFilter)
    const res = await fetch(`/api/technician-requests?${params}`)
    const data = await res.json()
    setRequests(data.requests || [])
    setLoading(false)
  }, [typeFilter, statusFilter])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  function showMsg(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 4000)
  }

  async function handleAction(req: TechRequest, action: 'approve' | 'reject') {
    if (action === 'reject' && !rejectionReason.trim()) {
      showMsg('Please enter a reason for rejection', 'error')
      return
    }
    setProcessing(true)
    try {
      const res = await fetch(`/api/technician-requests/${req.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action === 'approve' ? 'approved' : 'rejected',
          adminNotes: adminNotes || null,
          rejectionReason: action === 'reject' ? rejectionReason : null,
        }),
      })
      if (res.ok) {
        showMsg(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`, 'success')
        setActionModal(null)
        setAdminNotes('')
        setRejectionReason('')
        setViewReq(null)
        fetchRequests()
      } else {
        showMsg('Failed to process request', 'error')
      }
    } catch {
      showMsg('Something went wrong', 'error')
    }
    setProcessing(false)
  }

  function getSubtitle(req: TechRequest) {
    if (req.type === 'leave' && req.leaveFrom) return `${req.leaveType} · ${formatDate(req.leaveFrom)} to ${formatDate(req.leaveTo!)} (${req.leaveDays} days)`
    if (req.type === 'expense' && req.expenseAmount) return `₹${req.expenseAmount.toLocaleString('en-IN')} — ${req.expenseCategory}`
    if (req.type === 'job_transfer' && req.currentJobNo) return `${req.currentJobNo} → ${req.transferToTechName || 'any'}`
    if (req.type === 'overtime' && req.overtimeHours) return `${req.overtimeHours} hrs on ${req.overtimeDate ? formatDate(req.overtimeDate) : '—'}`
    if (req.type === 'tool' && req.toolName) return `${req.toolName} × ${req.toolQuantity}`
    if (req.type === 'training' && req.trainingTopic) return req.trainingTopic
    if (req.type === 'advance' && req.expenseAmount) return `₹${req.expenseAmount.toLocaleString('en-IN')}`
    if (req.type === 'handover' && req.handoverToTechName) return `To: ${req.handoverToTechName}`
    return ''
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Technician requests</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Review and approve requests from your field technicians</p>
        </div>
        {pendingCount > 0 && (
          <div style={{ background: '#faeeda', border: '0.5px solid #fde68a', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', color: '#854f0b', fontWeight: '500' }}>
            ⏳ {pendingCount} request{pendingCount > 1 ? 's' : ''} waiting for approval
          </div>
        )}
      </div>

      {message.text && (
        <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#16a34a' : '#dc2626', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Pending', value: requests.filter(r => r.status === 'pending').length, color: '#854f0b', bg: '#faeeda', filter: 'pending' },
          { label: 'Approved', value: requests.filter(r => r.status === 'approved').length, color: '#3b6d11', bg: '#eaf3de', filter: 'approved' },
          { label: 'Rejected', value: requests.filter(r => r.status === 'rejected').length, color: '#dc2626', bg: '#fef2f2', filter: 'rejected' },
          { label: 'All', value: requests.length, color: '#0f172a', bg: '#fff', filter: '' },
        ].map(s => (
          <div key={s.label} onClick={() => setStatusFilter(s.filter)}
            style={{ background: statusFilter === s.filter ? s.bg : '#fff', border: `0.5px solid ${statusFilter === s.filter ? s.color + '40' : '#e2e8f0'}`, borderRadius: '10px', padding: '12px 16px', cursor: 'pointer', transition: 'all 0.15s' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: s.color, marginTop: '4px' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', display: 'flex', gap: '10px' }}>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ height: '34px', padding: '0 10px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#475569', background: '#fff', outline: 'none' }}>
          <option value="">All types</option>
          {Object.entries(typeConfig).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ height: '34px', padding: '0 10px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#475569', background: '#fff', outline: 'none' }}>
          <option value="">All status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748b', alignSelf: 'center' }}>{requests.length} requests</span>
      </div>

      {/* Requests */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {loading ? (
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading...</div>
        ) : requests.length === 0 ? (
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
            No {statusFilter} requests found
          </div>
        ) : requests.map(req => {
          const tc = typeConfig[req.type] || typeConfig.complaint
          const sc = statusConfig[req.status] || statusConfig.pending
          const pc = priorityConfig[req.priority] || priorityConfig.normal
          const subtitle = getSubtitle(req)
          return (
            <div key={req.id}
              style={{ background: '#fff', border: `0.5px solid ${req.status === 'pending' ? '#fde68a' : '#e2e8f0'}`, borderRadius: '10px', padding: '14px 16px', transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1 }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    {tc.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' as const }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{req.subject}</span>
                      <span style={{ fontSize: '11px', color: tc.color, background: tc.bg, padding: '1px 7px', borderRadius: '8px', fontWeight: '500' }}>{tc.label}</span>
                      <span style={{ fontSize: '11px', color: pc.color, fontWeight: '600' }}>● {req.priority}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '3px' }}>
                      <strong style={{ color: '#0f172a' }}>{req.technicianName}</strong>
                      {req.empCode && <span style={{ color: '#94a3b8' }}> ({req.empCode})</span>}
                      {subtitle && <span> · {subtitle}</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>{req.description}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{req.requestNo} · {formatDate(req.createdAt)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', marginLeft: '12px' }}>
                  <span style={{ background: sc.bg, color: sc.color, padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' as const }}>{sc.label}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setViewReq(req)} style={{ padding: '5px 10px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '11px', color: '#475569', background: '#f8fafc', cursor: 'pointer' }}>View</button>
                    {req.status === 'pending' && (
                      <>
                        <button onClick={() => { setActionModal({ req, action: 'approve' }); setAdminNotes('') }}
                          style={{ padding: '5px 12px', border: '0.5px solid #bbf7d0', borderRadius: '6px', fontSize: '11px', color: '#16a34a', background: '#f0fdf4', cursor: 'pointer', fontWeight: '500' }}>
                          ✓ Approve
                        </button>
                        <button onClick={() => { setActionModal({ req, action: 'reject' }); setRejectionReason('') }}
                          style={{ padding: '5px 12px', border: '0.5px solid #fecaca', borderRadius: '6px', fontSize: '11px', color: '#dc2626', background: '#fef2f2', cursor: 'pointer', fontWeight: '500' }}>
                          ✕ Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* View modal */}
      {viewReq && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>{viewReq.subject}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{viewReq.requestNo} · {viewReq.technicianName} · {formatDate(viewReq.createdAt)}</div>
              </div>
              <button onClick={() => setViewReq(null)} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>
            {[
              { label: 'Type', value: typeConfig[viewReq.type]?.label || viewReq.type },
              { label: 'Priority', value: viewReq.priority },
              { label: 'Status', value: statusConfig[viewReq.status]?.label || viewReq.status },
              { label: 'Description', value: viewReq.description },
              { label: 'Reason', value: viewReq.reason, show: !!viewReq.reason },
              { label: 'Leave type', value: viewReq.leaveType, show: !!viewReq.leaveType },
              { label: 'Leave dates', value: viewReq.leaveFrom ? `${formatDate(viewReq.leaveFrom)} → ${formatDate(viewReq.leaveTo!)} (${viewReq.leaveDays} days)` : '', show: !!viewReq.leaveFrom },
              { label: 'Job number', value: viewReq.currentJobNo, show: !!viewReq.currentJobNo },
              { label: 'Transfer to', value: viewReq.transferToTechName, show: !!viewReq.transferToTechName },
              { label: 'Expense amount', value: viewReq.expenseAmount ? `₹${viewReq.expenseAmount.toLocaleString('en-IN')} (${viewReq.expenseCategory})` : '', show: !!viewReq.expenseAmount },
              { label: 'Overtime', value: viewReq.overtimeHours ? `${viewReq.overtimeHours} hrs on ${viewReq.overtimeDate ? formatDate(viewReq.overtimeDate) : '—'}` : '', show: !!viewReq.overtimeHours },
              { label: 'Tool needed', value: viewReq.toolName ? `${viewReq.toolName} × ${viewReq.toolQuantity}` : '', show: !!viewReq.toolName },
              { label: 'Training topic', value: viewReq.trainingTopic, show: !!viewReq.trainingTopic },
              { label: 'Handover to', value: viewReq.handoverToTechName, show: !!viewReq.handoverToTechName },
              { label: 'Approved by', value: viewReq.approvedBy, show: !!viewReq.approvedBy },
              { label: 'Admin notes', value: viewReq.adminNotes, show: !!viewReq.adminNotes },
              { label: 'Rejection reason', value: viewReq.rejectionReason, show: !!viewReq.rejectionReason },
            ].filter(f => f.show !== false && f.value).map(f => (
              <div key={f.label} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px' }}>
                <span style={{ color: '#64748b', fontWeight: '500', width: '130px', flexShrink: 0 }}>{f.label}</span>
                <span style={{ color: '#0f172a' }}>{f.value}</span>
              </div>
            ))}
            {viewReq.status === 'pending' && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                <button onClick={() => { setViewReq(null); setActionModal({ req: viewReq, action: 'approve' }) }}
                  style={{ flex: 1, padding: '9px', background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '7px', fontSize: '13px', color: '#16a34a', cursor: 'pointer', fontWeight: '500' }}>
                  ✓ Approve
                </button>
                <button onClick={() => { setViewReq(null); setActionModal({ req: viewReq, action: 'reject' }) }}
                  style={{ flex: 1, padding: '9px', background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: '7px', fontSize: '13px', color: '#dc2626', cursor: 'pointer', fontWeight: '500' }}>
                  ✕ Reject
                </button>
              </div>
            )}
            <button onClick={() => setViewReq(null)} style={{ width: '100%', marginTop: '8px', padding: '9px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}

      {/* Approve / Reject action modal */}
      {actionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
              {actionModal.action === 'approve' ? '✓ Approve request' : '✕ Reject request'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>
              {actionModal.req.subject} — {actionModal.req.technicianName}
            </div>

            {actionModal.action === 'reject' && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '5px' }}>
                  Reason for rejection * <span style={{ color: '#94a3b8', fontWeight: '400' }}>(technician will see this)</span>
                </label>
                <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={3}
                  placeholder="Explain why this request is being rejected..."
                  style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', outline: 'none', resize: 'vertical' as const }} />
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '5px' }}>
                Admin notes <span style={{ color: '#94a3b8', fontWeight: '400' }}>(optional — visible to technician)</span>
              </label>
              <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2}
                placeholder={actionModal.action === 'approve' ? 'Any instructions or conditions...' : 'Additional context...'}
                style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', outline: 'none', resize: 'vertical' as const }} />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleAction(actionModal.req, actionModal.action)}
                disabled={processing}
                style={{
                  flex: 1, padding: '10px',
                  background: processing ? '#93c5fd' : actionModal.action === 'approve' ? '#16a34a' : '#dc2626',
                  color: '#fff', border: 'none', borderRadius: '8px',
                  fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                }}>
                {processing ? 'Processing...' : actionModal.action === 'approve' ? '✓ Confirm approval' : '✕ Confirm rejection'}
              </button>
              <button onClick={() => setActionModal(null)} style={{ flex: 1, padding: '10px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}