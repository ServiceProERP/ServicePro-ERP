'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type Technician = { id: string; name: string; empCode: string; skill: string | null }
type Job = { id: string; jobNo: string; jobTitle: string; status: string }

const requestTypes = [
  { type: 'job_transfer', label: 'Job transfer',      icon: '🔄', color: '#185fa5', bg: '#e6f1fb', description: 'Transfer a job to another technician' },
  { type: 'leave',        label: 'Leave request',     icon: '🏖', color: '#3b6d11', bg: '#eaf3de', description: 'Apply for sick, casual or earned leave' },
  { type: 'material',     label: 'Material / parts',  icon: '🔩', color: '#854f0b', bg: '#faeeda', description: 'Request spare parts or materials' },
  { type: 'overtime',     label: 'Overtime',          icon: '⏰', color: '#534ab7', bg: '#eeedfe', description: 'Record overtime hours for approval' },
  { type: 'expense',      label: 'Expense claim',     icon: '💸', color: '#0f6e56', bg: '#e1f5ee', description: 'Claim travel, food or other expenses' },
  { type: 'tool',         label: 'Tool / equipment',  icon: '🔧', color: '#475569', bg: '#f1f5f9', description: 'Request a tool or equipment' },
  { type: 'training',     label: 'Training request',  icon: '📚', color: '#1a56db', bg: '#e6f1fb', description: 'Request training on a specific skill' },
  { type: 'handover',     label: 'Job handover',      icon: '📋', color: '#854f0b', bg: '#faeeda', description: 'Hand over jobs before leave' },
  { type: 'complaint',    label: 'Complaint / issue', icon: '⚠️', color: '#dc2626', bg: '#fef2f2', description: 'Raise a concern or grievance' },
  { type: 'advance',      label: 'Salary advance',    icon: '💰', color: '#92400e', bg: '#fffbeb', description: 'Request advance on your salary' },
]

const inputStyle = {
  width: '100%', height: '40px', padding: '0 12px',
  border: '1px solid #e2e8f0', borderRadius: '8px',
  fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a',
  transition: 'border-color 0.15s',
}
const labelStyle = {
  display: 'block' as const, fontSize: '12px',
  fontWeight: '600' as const, color: '#374151', marginBottom: '6px',
}
const taStyle = {
  ...inputStyle, height: 'auto', padding: '10px 12px',
  resize: 'vertical' as const, lineHeight: '1.5',
}

function NewRequestForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Fix: read type AFTER component mounts to avoid Suspense timing issue
  const [selectedType, setSelectedType] = useState('')
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [myJobs, setMyJobs] = useState<Job[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedReqNo, setSubmittedReqNo] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })

  const [form, setForm] = useState({
    subject: '', description: '', reason: '', priority: 'normal',
    jobId: '', currentJobNo: '', transferToTechId: '', transferToTechName: '',
    leaveType: 'sick', leaveFrom: '', leaveTo: '', leaveDays: '', leaveHandoverTo: '',
    overtimeDate: '', overtimeHours: '', overtimeReason: '',
    expenseAmount: '', expenseCategory: 'travel', expenseDate: new Date().toISOString().split('T')[0],
    toolName: '', toolQuantity: '1', toolNeededBy: '',
    handoverJobIds: '' as string, handoverToTechId: '', handoverToTechName: '', handoverNotes: '', handoverDate: '',
    trainingTopic: '', trainingReason: '',
    advanceAmount: '',
  })

  // Fix: read URL param after mount
  useEffect(() => {
    const typeFromUrl = searchParams.get('type') || ''
    const jobIdFromUrl = searchParams.get('jobId') || ''
    const jobNoFromUrl = searchParams.get('jobNo') || ''
    if (typeFromUrl) setSelectedType(typeFromUrl)
    if (jobIdFromUrl) setForm(p => ({ ...p, jobId: jobIdFromUrl, currentJobNo: jobNoFromUrl }))
  }, [searchParams])

  useEffect(() => {
    fetch('/api/technicians?all=true').then(r => r.json()).then(d => setTechnicians(d.technicians || []))
    fetch('/api/jobs/my-jobs').then(r => r.json()).then(d => setMyJobs(d.jobs || []))
  }, [])

  // Auto-subject
  useEffect(() => {
    if (!selectedType) return
    const map: Record<string, string> = {
      job_transfer: form.currentJobNo ? `Transfer request for ${form.currentJobNo}` : 'Job transfer request',
      leave: `${form.leaveType.charAt(0).toUpperCase() + form.leaveType.slice(1)} leave request`,
      material: 'Material / spare parts request',
      overtime: form.overtimeDate ? `Overtime on ${form.overtimeDate}` : 'Overtime request',
      expense: `Expense claim — ${form.expenseCategory}`,
      tool: form.toolName ? `Tool request: ${form.toolName}` : 'Tool / equipment request',
      training: form.trainingTopic ? `Training: ${form.trainingTopic}` : 'Training request',
      handover: 'Job handover request',
      complaint: 'Complaint / grievance',
      advance: form.advanceAmount ? `Salary advance: ₹${form.advanceAmount}` : 'Salary advance request',
    }
    setForm(p => ({ ...p, subject: map[selectedType] || '' }))
  }, [selectedType, form.currentJobNo, form.leaveType, form.overtimeDate, form.expenseCategory, form.toolName, form.trainingTopic, form.advanceAmount])

  function setField(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }))
  }

  function calcLeaveDays(from: string, to: string) {
    if (!from || !to) return
    const days = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1
    setForm(p => ({ ...p, leaveDays: String(Math.max(0, days)) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedType) { setMessage({ text: 'Please select a request type', type: 'error' }); return }
    if (!form.description.trim()) { setMessage({ text: 'Please describe your request', type: 'error' }); return }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        type: selectedType, subject: form.subject,
        description: form.description, reason: form.reason || null, priority: form.priority,
      }
      if (selectedType === 'job_transfer') Object.assign(body, { jobId: form.jobId || null, currentJobNo: form.currentJobNo || null, transferToTechId: form.transferToTechId || null, transferToTechName: form.transferToTechName || null })
      if (selectedType === 'leave') Object.assign(body, { leaveType: form.leaveType, leaveFrom: form.leaveFrom || null, leaveTo: form.leaveTo || null, leaveDays: form.leaveDays || null, leaveHandoverTo: form.leaveHandoverTo || null })
      if (selectedType === 'overtime') Object.assign(body, { overtimeDate: form.overtimeDate || null, overtimeHours: form.overtimeHours || null, overtimeReason: form.overtimeReason || null })
      if (selectedType === 'expense') Object.assign(body, { expenseAmount: form.expenseAmount || null, expenseCategory: form.expenseCategory, expenseDate: form.expenseDate || null })
      if (selectedType === 'tool') Object.assign(body, { toolName: form.toolName || null, toolQuantity: form.toolQuantity || null, toolNeededBy: form.toolNeededBy || null })
      if (selectedType === 'handover') {
        const tech = technicians.find(t => t.id === form.handoverToTechId)
        Object.assign(body, { handoverToTechId: form.handoverToTechId || null, handoverToTechName: tech?.name || null, handoverNotes: form.handoverNotes || null, handoverDate: form.handoverDate || null, handoverJobIds: form.handoverJobIds || null })
      }
      if (selectedType === 'training') Object.assign(body, { trainingTopic: form.trainingTopic || null, trainingReason: form.trainingReason || null })
      if (selectedType === 'advance') Object.assign(body, { expenseAmount: form.advanceAmount || null })

      const res = await fetch('/api/technician-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        setSubmittedReqNo(data.request?.requestNo || 'REQ-XXXX')
        setSubmitted(true)
      } else {
        setMessage({ text: 'Failed to submit. Please try again.', type: 'error' })
      }
    } catch {
      setMessage({ text: 'Something went wrong', type: 'error' })
    }
    setSubmitting(false)
  }

  const cfg = requestTypes.find(r => r.type === selectedType)

  // Success screen
  if (submitted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#eaf3de', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '16px' }}>✅</div>
        <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Request submitted!</div>
        <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Your request <strong style={{ color: '#1a56db' }}>{submittedReqNo}</strong> has been sent to your manager.</div>
        <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '28px' }}>You will be notified once it is reviewed.</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => router.push('/dashboard/technician/requests')}
            style={{ padding: '10px 24px', background: '#1a56db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            View my requests →
          </button>
          <button onClick={() => { setSubmitted(false); setSelectedType(''); setForm(p => ({ ...p, description: '', reason: '' })) }}
            style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>
            Raise another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '760px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => router.push('/dashboard/technician/requests')}
          style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ← My requests
        </button>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 }}>New request</h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Raise a request to your manager — they will review and respond</p>
      </div>

      {message.text && (
        <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#16a34a' : '#dc2626', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      {/* Step 1 — Type selection */}
      {!selectedType ? (
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '14px' }}>
            What do you need to request?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {requestTypes.map(rt => (
              <div key={rt.type} onClick={() => setSelectedType(rt.type)}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', background: '#fff', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = rt.color; e.currentTarget.style.background = rt.bg; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: rt.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0, border: `1px solid ${rt.color}20` }}>
                  {rt.icon}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{rt.label}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{rt.description}</div>
                </div>
                <div style={{ marginLeft: 'auto', color: '#cbd5e1', fontSize: '16px', flexShrink: 0 }}>›</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>

          {/* Type badge + change */}
          {cfg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: cfg.bg, border: `1px solid ${cfg.color}30`, borderRadius: '10px', marginBottom: '20px' }}>
              <span style={{ fontSize: '22px' }}>{cfg.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{cfg.label}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{cfg.description}</div>
              </div>
              <button type="button" onClick={() => setSelectedType('')}
                style={{ padding: '5px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#475569', background: '#fff', cursor: 'pointer' }}>
                Change
              </button>
            </div>
          )}

          {/* Common fields */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Subject *</label>
                <input value={form.subject} onChange={e => setField('subject', e.target.value)} placeholder="Short title for this request" required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#1a56db')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
              </div>
              <div>
                <label style={labelStyle}>Priority</label>
                <select value={form.priority} onChange={e => setField('priority', e.target.value)} style={inputStyle}>
                  <option value="low">🟢 Low</option>
                  <option value="normal">🔵 Normal</option>
                  <option value="high">🟠 High</option>
                  <option value="urgent">🔴 Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description * <span style={{ fontWeight: '400', color: '#94a3b8' }}>(explain clearly so manager understands)</span></label>
              <textarea value={form.description} onChange={e => setField('description', e.target.value)} required rows={4}
                placeholder="Describe your request in detail..."
                style={taStyle}
                onFocus={e => (e.target.style.borderColor = '#1a56db')} onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
            </div>
          </div>

          {/* Type-specific fields */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {cfg?.icon} {cfg?.label} details
            </div>

            {/* JOB TRANSFER */}
            {selectedType === 'job_transfer' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Job to transfer *</label>
                  <select value={form.jobId} onChange={e => { const j = myJobs.find(j => j.id === e.target.value); setForm(p => ({ ...p, jobId: e.target.value, currentJobNo: j?.jobNo || '' })) }} style={inputStyle}>
                    <option value="">— Select job —</option>
                    {myJobs.filter(j => j.status !== 'completed').map(j => <option key={j.id} value={j.id}>{j.jobNo} — {j.jobTitle}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Transfer to technician</label>
                  <select value={form.transferToTechId} onChange={e => { const t = technicians.find(t => t.id === e.target.value); setForm(p => ({ ...p, transferToTechId: e.target.value, transferToTechName: t?.name || '' })) }} style={inputStyle}>
                    <option value="">— Let manager decide —</option>
                    {technicians.map(t => <option key={t.id} value={t.id}>{t.name} {t.skill ? `(${t.skill})` : ''}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Reason for transfer *</label>
                  <textarea value={form.reason} onChange={e => setField('reason', e.target.value)} rows={2} placeholder="Workload, health, skill mismatch, location..." style={taStyle} />
                </div>
              </div>
            )}

            {/* LEAVE */}
            {selectedType === 'leave' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Leave type *</label>
                  <select value={form.leaveType} onChange={e => setField('leaveType', e.target.value)} style={inputStyle}>
                    {['sick', 'casual', 'earned', 'emergency', 'maternity', 'paternity', 'unpaid'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>From *</label>
                  <input type="date" value={form.leaveFrom} onChange={e => { setField('leaveFrom', e.target.value); calcLeaveDays(e.target.value, form.leaveTo) }} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>To *</label>
                  <input type="date" value={form.leaveTo} onChange={e => { setField('leaveTo', e.target.value); calcLeaveDays(form.leaveFrom, e.target.value) }} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Days</label>
                  <input value={form.leaveDays ? `${form.leaveDays} day${parseFloat(form.leaveDays) > 1 ? 's' : ''}` : ''} readOnly placeholder="Auto" style={{ ...inputStyle, background: '#f8fafc', color: '#1a56db', fontWeight: '600' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Who will handle your jobs during leave?</label>
                  <select value={form.leaveHandoverTo} onChange={e => setField('leaveHandoverTo', e.target.value)} style={inputStyle}>
                    <option value="">— Manager will assign —</option>
                    {technicians.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Reason</label>
                  <input value={form.reason} onChange={e => setField('reason', e.target.value)} placeholder="Doctor appointment, family function..." style={inputStyle} />
                </div>
              </div>
            )}

            {/* MATERIAL */}
            {selectedType === 'material' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>For which job?</label>
                  <select value={form.jobId} onChange={e => { const j = myJobs.find(j => j.id === e.target.value); setForm(p => ({ ...p, jobId: e.target.value, currentJobNo: j?.jobNo || '' })) }} style={inputStyle}>
                    <option value="">— Optional —</option>
                    {myJobs.map(j => <option key={j.id} value={j.id}>{j.jobNo} — {j.jobTitle}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Urgency</label>
                  <select value={form.priority} onChange={e => setField('priority', e.target.value)} style={inputStyle}>
                    <option value="normal">Normal</option>
                    <option value="high">Urgent — job is blocked</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1', background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#185fa5' }}>
                  💡 List all parts needed in the description above with part name, code and quantity.
                </div>
              </div>
            )}

            {/* OVERTIME */}
            {selectedType === 'overtime' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div><label style={labelStyle}>Date *</label><input type="date" value={form.overtimeDate} onChange={e => setField('overtimeDate', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Hours worked *</label><input type="number" value={form.overtimeHours} onChange={e => setField('overtimeHours', e.target.value)} placeholder="e.g. 3" min="0.5" step="0.5" style={inputStyle} /></div>
                <div>
                  <label style={labelStyle}>For which job?</label>
                  <select value={form.jobId} onChange={e => setField('jobId', e.target.value)} style={inputStyle}>
                    <option value="">— General —</option>
                    {myJobs.map(j => <option key={j.id} value={j.id}>{j.jobNo}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Reason *</label><input value={form.overtimeReason} onChange={e => setField('overtimeReason', e.target.value)} placeholder="Why did you work overtime?" style={inputStyle} /></div>
              </div>
            )}

            {/* EXPENSE */}
            {selectedType === 'expense' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Amount (₹) *</label>
                  <div style={{ position: 'relative' as const }}>
                    <span style={{ position: 'absolute' as const, left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '14px' }}>₹</span>
                    <input type="number" value={form.expenseAmount} onChange={e => setField('expenseAmount', e.target.value)} placeholder="0" style={{ ...inputStyle, paddingLeft: '26px' }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Category *</label>
                  <select value={form.expenseCategory} onChange={e => setField('expenseCategory', e.target.value)} style={inputStyle}>
                    {['travel', 'food', 'accommodation', 'petrol', 'tools', 'materials', 'communication', 'other'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Date</label><input type="date" value={form.expenseDate} onChange={e => setField('expenseDate', e.target.value)} style={inputStyle} /></div>
                <div style={{ gridColumn: '1 / -1', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#92400e' }}>
                  📎 Attach your bill photo after submitting — go to the request and add attachment.
                </div>
              </div>
            )}

            {/* TOOL */}
            {selectedType === 'tool' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 1fr', gap: '14px' }}>
                <div><label style={labelStyle}>Tool / equipment *</label><input value={form.toolName} onChange={e => setField('toolName', e.target.value)} placeholder="e.g. Digital multimeter, Torque wrench" style={inputStyle} /></div>
                <div><label style={labelStyle}>Quantity</label><input type="number" value={form.toolQuantity} onChange={e => setField('toolQuantity', e.target.value)} min="1" style={inputStyle} /></div>
                <div><label style={labelStyle}>Needed by</label><input type="date" value={form.toolNeededBy} onChange={e => setField('toolNeededBy', e.target.value)} style={inputStyle} /></div>
              </div>
            )}

            {/* TRAINING */}
            {selectedType === 'training' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div><label style={labelStyle}>Training topic *</label><input value={form.trainingTopic} onChange={e => setField('trainingTopic', e.target.value)} placeholder="e.g. PLC programming, HVAC servicing" style={inputStyle} /></div>
                <div><label style={labelStyle}>Why do you need this?</label><input value={form.trainingReason} onChange={e => setField('trainingReason', e.target.value)} placeholder="How will it help your work?" style={inputStyle} /></div>
              </div>
            )}

            {/* HANDOVER */}
            {selectedType === 'handover' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Hand over to *</label>
                  <select value={form.handoverToTechId} onChange={e => { const t = technicians.find(t => t.id === e.target.value); setForm(p => ({ ...p, handoverToTechId: e.target.value, handoverToTechName: t?.name || '' })) }} style={inputStyle}>
                    <option value="">— Select technician —</option>
                    {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Handover date</label><input type="date" value={form.handoverDate} onChange={e => setField('handoverDate', e.target.value)} style={inputStyle} /></div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Select jobs to hand over</label>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', background: '#f8fafc', maxHeight: '160px', overflowY: 'auto' }}>
                    {myJobs.filter(j => j.status !== 'completed').length === 0 ? (
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>No active jobs</div>
                    ) : myJobs.filter(j => j.status !== 'completed').map(j => (
                      <label key={j.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', cursor: 'pointer', fontSize: '13px' }}>
                        <input type="checkbox" onChange={e => {
                          const ids = form.handoverJobIds ? form.handoverJobIds.split(',').filter(Boolean) : []
                          if (e.target.checked) ids.push(j.id)
                          else ids.splice(ids.indexOf(j.id), 1)
                          setField('handoverJobIds', ids.join(','))
                        }} />
                        <span style={{ color: '#1a56db', fontWeight: '500' }}>{j.jobNo}</span> — {j.jobTitle}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Handover notes</label>
                  <textarea value={form.handoverNotes} onChange={e => setField('handoverNotes', e.target.value)} rows={3} placeholder="Important info for the next technician about each job..." style={taStyle} />
                </div>
              </div>
            )}

            {/* COMPLAINT */}
            {selectedType === 'complaint' && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', color: '#dc2626' }}>
                🔒 Your complaint will be handled confidentially by management. Be specific and factual in the description above.
              </div>
            )}

            {/* ADVANCE */}
            {selectedType === 'advance' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Advance amount (₹) *</label>
                  <div style={{ position: 'relative' as const }}>
                    <span style={{ position: 'absolute' as const, left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '14px' }}>₹</span>
                    <input type="number" value={form.advanceAmount} onChange={e => setField('advanceAmount', e.target.value)} placeholder="0" style={{ ...inputStyle, paddingLeft: '26px' }} />
                  </div>
                </div>
                <div><label style={labelStyle}>Reason *</label><input value={form.reason} onChange={e => setField('reason', e.target.value)} placeholder="Why do you need the advance?" style={inputStyle} /></div>
                <div style={{ gridColumn: '1 / -1', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#92400e' }}>
                  💡 Advance will be recovered from your next salary as per company policy.
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button type="submit" disabled={submitting}
              style={{ padding: '11px 32px', background: submitting ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {submitting ? '⏳ Submitting...' : '📤 Submit request'}
            </button>
            <button type="button" onClick={() => router.push('/dashboard/technician/requests')}
              style={{ padding: '11px 20px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>
              Cancel
            </button>
            <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '4px' }}>
              Your manager will be notified immediately
            </span>
          </div>
        </form>
      )}
    </div>
  )
}

export default function NewRequestPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
        Loading...
      </div>
    }>
      <NewRequestForm />
    </Suspense>
  )
}