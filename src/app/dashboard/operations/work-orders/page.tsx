'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'

type Job = {
  id: string
  jobNo: string
  jobTitle: string
  status: string
  priority: string
  client: { companyName: string }
  technician: { name: string } | null
  spareParts: SparePart[]
}

type WorkOrder = {
  id: string
  woNo: string
  description: string
  status: string
  job: {
    jobNo: string
    jobTitle: string
    client: { companyName: string }
  }
  createdAt: string
}

type SparePart = {
  id: string
  partName: string
  partCode: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
}

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  open: { bg: '#e6f1fb', color: '#185fa5', label: 'Open' },
  in_progress: { bg: '#faeeda', color: '#854f0b', label: 'In Progress' },
  waiting_parts: { bg: '#fbeaf0', color: '#993556', label: 'Waiting Parts' },
  completed: { bg: '#eaf3de', color: '#3b6d11', label: 'Completed' },
  pending: { bg: '#faeeda', color: '#854f0b', label: 'Pending' },
  approved: { bg: '#e6f1fb', color: '#185fa5', label: 'Approved' },
  issued: { bg: '#eaf3de', color: '#3b6d11', label: 'Issued' },
}

const priorityConfig: Record<string, { bg: string; color: string }> = {
  high: { bg: '#fcebeb', color: '#a32d2d' },
  medium: { bg: '#faeeda', color: '#854f0b' },
  low: { bg: '#eaf3de', color: '#3b6d11' },
}

const inputStyle = {
  width: '100%',
  height: '36px',
  padding: '0 12px',
  border: '0.5px solid #e2e8f0',
  borderRadius: '6px',
  fontSize: '13px',
  outline: 'none',
  background: '#fff',
  color: '#0f172a',
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
  color: '#0f172a',
}

export default function WorkOrdersPage() {
  const [activeJobs, setActiveJobs] = useState<Job[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [activeTab, setActiveTab] = useState<'work-orders' | 'spare-parts'>('work-orders')
  const [message, setMessage] = useState({ text: '', type: '' })

  const [woForm, setWoForm] = useState({ jobId: '', description: '' })
  const [partForm, setPartForm] = useState({
    jobId: '', partName: '', partCode: '', quantity: '', unitPrice: ''
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [jobsRes, woRes] = await Promise.all([
      fetch('/api/jobs?limit=100&status=in_progress'),
      fetch('/api/work-orders'),
    ])
    const jobsData = await jobsRes.json()
    const woData = await woRes.json()
    setActiveJobs(jobsData.jobs || [])
    setWorkOrders(woData.workOrders || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function showMessage(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  async function createWorkOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!woForm.jobId || !woForm.description) {
      showMessage('Please fill all fields', 'error')
      return
    }
    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(woForm),
      })
      if (res.ok) {
        showMessage('Work order created!', 'success')
        setWoForm({ jobId: '', description: '' })
        fetchData()
      }
    } catch {
      showMessage('Failed to create work order', 'error')
    }
  }

  async function addSparePart(e: React.FormEvent) {
    e.preventDefault()
    if (!partForm.jobId || !partForm.partName || !partForm.quantity || !partForm.unitPrice) {
      showMessage('Please fill all required fields', 'error')
      return
    }
    const qty = parseFloat(partForm.quantity)
    const price = parseFloat(partForm.unitPrice)
    try {
      const res = await fetch('/api/spare-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...partForm,
          quantity: qty,
          unitPrice: price,
          totalPrice: qty * price,
        }),
      })
      if (res.ok) {
        showMessage('Spare part added!', 'success')
        setPartForm({ jobId: '', partName: '', partCode: '', quantity: '', unitPrice: '' })
        fetchData()
      }
    } catch {
      showMessage('Failed to add spare part', 'error')
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>
          Work orders & spare parts
        </h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          Manage repair work orders and track spare parts used per job
        </p>
      </div>

      {/* Message */}
      {message.text && (
        <div style={{
          background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: message.type === 'success' ? '#16a34a' : '#dc2626',
          padding: '10px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          marginBottom: '16px',
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '16px' }}>

        {/* LEFT — Forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '0',
            background: '#f1f5f9',
            borderRadius: '8px',
            padding: '3px',
          }}>
            {[
              { key: 'work-orders', label: 'Work Order' },
              { key: 'spare-parts', label: 'Spare Parts' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  background: activeTab === tab.key ? '#fff' : 'transparent',
                  color: activeTab === tab.key ? '#0f172a' : '#64748b',
                  boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Work Order Form */}
          {activeTab === 'work-orders' && (
            <div style={{
              background: '#fff',
              border: '0.5px solid #e2e8f0',
              borderRadius: '10px',
              padding: '18px',
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#0f172a',
                marginBottom: '14px',
                paddingBottom: '8px',
                borderBottom: '0.5px solid #e2e8f0',
              }}>
                Create work order
              </div>

              <form onSubmit={createWorkOrder}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '5px' }}>
                    Select job *
                  </label>
                  <select
                    value={woForm.jobId}
                    onChange={e => {
                      setWoForm(prev => ({ ...prev, jobId: e.target.value }))
                      const job = activeJobs.find(j => j.id === e.target.value)
                      setSelectedJob(job || null)
                    }}
                    style={inputStyle}
                  >
                    <option value="">-- Select active job --</option>
                    {activeJobs.map(j => (
                      <option key={j.id} value={j.id}>
                        {j.jobNo} — {j.client.companyName}
                      </option>
                    ))}
                  </select>
                  {activeJobs.length === 0 && (
                    <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px' }}>
                      No in-progress jobs found. Assign a job first.
                    </div>
                  )}
                </div>

                {selectedJob && (
                  <div style={{
                    background: '#f0f7ff',
                    border: '0.5px solid #bfdbfe',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    marginBottom: '12px',
                    fontSize: '12px',
                  }}>
                    <div style={{ fontWeight: '600', color: '#1e40af', marginBottom: '2px' }}>
                      {selectedJob.jobTitle}
                    </div>
                    <div style={{ color: '#3b82f6' }}>
                      Technician: {selectedJob.technician?.name || 'Not assigned'}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '5px' }}>
                    Work description *
                  </label>
                  <textarea
                    value={woForm.description}
                    onChange={e => setWoForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the work to be done..."
                    rows={4}
                    style={{
                      ...inputStyle,
                      height: 'auto',
                      padding: '10px 12px',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '9px',
                    background: '#1a56db',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '7px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  + Create work order
                </button>
              </form>
            </div>
          )}

          {/* Spare Parts Form */}
          {activeTab === 'spare-parts' && (
            <div style={{
              background: '#fff',
              border: '0.5px solid #e2e8f0',
              borderRadius: '10px',
              padding: '18px',
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#0f172a',
                marginBottom: '14px',
                paddingBottom: '8px',
                borderBottom: '0.5px solid #e2e8f0',
              }}>
                Add spare part to job
              </div>

              <form onSubmit={addSparePart}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '5px' }}>
                    Select job *
                  </label>
                  <select
                    value={partForm.jobId}
                    onChange={e => setPartForm(prev => ({ ...prev, jobId: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="">-- Select active job --</option>
                    {activeJobs.map(j => (
                      <option key={j.id} value={j.id}>
                        {j.jobNo} — {j.client.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '5px' }}>
                    Part name *
                  </label>
                  <input
                    value={partForm.partName}
                    onChange={e => setPartForm(prev => ({ ...prev, partName: e.target.value }))}
                    placeholder="e.g. Bearing 6205, Control board"
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '5px' }}>
                    Part code
                  </label>
                  <input
                    value={partForm.partCode}
                    onChange={e => setPartForm(prev => ({ ...prev, partCode: e.target.value }))}
                    placeholder="Optional part number"
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '5px' }}>
                      Quantity *
                    </label>
                    <input
                      type="number"
                      value={partForm.quantity}
                      onChange={e => setPartForm(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder="1"
                      min="0"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '5px' }}>
                      Unit price (₹) *
                    </label>
                    <input
                      type="number"
                      value={partForm.unitPrice}
                      onChange={e => setPartForm(prev => ({ ...prev, unitPrice: e.target.value }))}
                      placeholder="0.00"
                      min="0"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Total Preview */}
                {partForm.quantity && partForm.unitPrice && (
                  <div style={{
                    background: '#f0fdf4',
                    border: '0.5px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    marginBottom: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '13px',
                  }}>
                    <span style={{ color: '#475569' }}>Total amount</span>
                    <span style={{ fontWeight: '600', color: '#16a34a', fontSize: '15px' }}>
                      ₹{(parseFloat(partForm.quantity || '0') * parseFloat(partForm.unitPrice || '0')).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '9px',
                    background: '#1a56db',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '7px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  + Add spare part
                </button>
              </form>
            </div>
          )}

          {/* Active Jobs Summary */}
          <div style={{
            background: '#fff',
            border: '0.5px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>
              Active jobs ({activeJobs.length})
            </div>
            {loading ? (
              <div style={{ fontSize: '13px', color: '#64748b' }}>Loading...</div>
            ) : activeJobs.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#64748b' }}>No in-progress jobs</div>
            ) : (
              activeJobs.slice(0, 5).map(job => {
                const priority = priorityConfig[job.priority] || priorityConfig.medium
                return (
                  <div key={job.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '0.5px solid #f1f5f9',
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#1a56db' }}>
                        {job.jobNo}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {job.client.companyName}
                      </div>
                    </div>
                    <span style={{
                      background: priority.bg,
                      color: priority.color,
                      padding: '2px 7px',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: '500',
                      textTransform: 'capitalize',
                    }}>
                      {job.priority}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* RIGHT — Tables */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Work Orders Table */}
          <div style={{
            background: '#fff',
            border: '0.5px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px',
          }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '14px' }}>
              Work orders
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['WO No', 'Job', 'Client', 'Description', 'Status', 'Date'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#64748b' }}>
                        Loading...
                      </td>
                    </tr>
                  ) : workOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#64748b' }}>
                        No work orders yet
                      </td>
                    </tr>
                  ) : (
                    workOrders.map(wo => {
                      const status = statusConfig[wo.status] || statusConfig.pending
                      return (
                        <tr key={wo.id}>
                          <td style={{ ...tdStyle, fontWeight: '600', color: '#1a56db' }}>
                            {wo.woNo}
                          </td>
                          <td style={{ ...tdStyle, color: '#185fa5', fontSize: '12px' }}>
                            {wo.job.jobNo}
                          </td>
                          <td style={{ ...tdStyle, fontSize: '12px' }}>
                            {wo.job.client.companyName.length > 14
                              ? wo.job.client.companyName.slice(0, 14) + '...'
                              : wo.job.client.companyName}
                          </td>
                          <td style={{ ...tdStyle, fontSize: '12px', color: '#475569', maxWidth: '150px' }}>
                            {wo.description.length > 30
                              ? wo.description.slice(0, 30) + '...'
                              : wo.description}
                          </td>
                          <td style={tdStyle}>
                            <span style={{
                              background: status.bg,
                              color: status.color,
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: '500',
                            }}>
                              {status.label}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, fontSize: '11px', color: '#64748b' }}>
                            {formatDate(wo.createdAt)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Spare Parts Table */}
          <div style={{
            background: '#fff',
            border: '0.5px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px',
          }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '14px' }}>
              Spare parts used
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Job', 'Part name', 'Code', 'Qty', 'Unit price', 'Total'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#64748b' }}>
                        Loading...
                      </td>
                    </tr>
                  ) : activeJobs.flatMap(j => j.spareParts).length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#64748b' }}>
                        No spare parts added yet
                      </td>
                    </tr>
                  ) : (
                    activeJobs.flatMap(job =>
                      job.spareParts.map(part => (
                        <tr key={part.id}>
                          <td style={{ ...tdStyle, fontWeight: '600', color: '#1a56db', fontSize: '12px' }}>
                            {job.jobNo}
                          </td>
                          <td style={{ ...tdStyle, fontSize: '12px' }}>{part.partName}</td>
                          <td style={{ ...tdStyle, fontSize: '12px', color: '#64748b' }}>
                            {part.partCode || '—'}
                          </td>
                          <td style={{ ...tdStyle, fontSize: '12px', textAlign: 'center' as const }}>
                            {part.quantity}
                          </td>
                          <td style={{ ...tdStyle, fontSize: '12px' }}>
                            ₹{part.unitPrice.toLocaleString('en-IN')}
                          </td>
                          <td style={{ ...tdStyle, fontSize: '12px', fontWeight: '600', color: '#16a34a' }}>
                            ₹{part.totalPrice.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
