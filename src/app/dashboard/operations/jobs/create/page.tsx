'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Client = {
  id: string
  companyName: string
  contactPerson: string
  phone: string
  address: string | null
  creditLimit: number
}

type Technician = {
  id: string
  name: string
  skill: string | null
}

const inputStyle = {
  width: '100%',
  height: '38px',
  padding: '0 12px',
  border: '0.5px solid #e2e8f0',
  borderRadius: '7px',
  fontSize: '13px',
  outline: 'none',
  background: '#fff',
  color: '#0f172a',
  transition: 'border 0.15s',
}

const labelStyle = {
  display: 'block' as const,
  fontSize: '12px',
  fontWeight: '500' as const,
  color: '#475569',
  marginBottom: '5px',
}

const sectionTitle = {
  fontSize: '13px',
  fontWeight: '600' as const,
  color: '#0f172a',
  borderBottom: '0.5px solid #e2e8f0',
  paddingBottom: '8px',
  marginBottom: '14px',
  marginTop: '20px',
}

export default function CreateJobPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const [form, setForm] = useState({
    jobTitle: '',
    jobType: 'onsite',
    priority: 'medium',
    clientId: '',
    technicianId: '',
    siteAddress: '',
    billingContact: '',
    billingPhone: '',
    contactPerson: '',
    contactPhone: '',
    machineName: '',
    machineSerial: '',
    faultDescription: '',
    deadline: '',
    estimatedAmount: '',
    remarks: '',
  })

  useEffect(() => {
    fetch('/api/clients?all=true')
      .then(r => r.json())
      .then(d => setClients(d.clients || []))
      .catch(() => setClients([]))

    fetch('/api/technicians')
      .then(r => r.json())
      .then(d => setTechnicians(d.technicians || []))
      .catch(() => setTechnicians([]))
  }, [])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))

    if (name === 'clientId') {
      const client = clients.find(c => c.id === value)
      setSelectedClient(client || null)

      if (client) {
        setForm(prev => ({
          ...prev,
          clientId: value,
          siteAddress: client.address || '',
          billingContact: client.contactPerson || '',
          billingPhone: client.phone || '',
        }))
      } else {
        setForm(prev => ({
          ...prev,
          clientId: value,
          siteAddress: '',
          billingContact: '',
          billingPhone: '',
        }))
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!form.clientId) {
      setError('Please select a client')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Failed to create job')
        setLoading(false)
        return
      }

      router.push('/dashboard/operations/jobs')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>
            Create job
          </h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            Register a new inward service job
          </p>
        </div>
        <button
          onClick={() => router.back()}
          style={{
            padding: '8px 16px',
            border: '0.5px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#475569',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }}>
          {/* LEFT COLUMN */}
          <div
            style={{
              background: '#fff',
              border: '0.5px solid #e2e8f0',
              borderRadius: '10px',
              padding: '20px',
            }}
          >
            {/* Job Details */}
            <div style={sectionTitle}>Job details</div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <div>
                <label style={labelStyle}>Job type</label>
                <select
                  name="jobType"
                  value={form.jobType}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="onsite">Onsite visit</option>
                  <option value="workshop">Workshop repair</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priority</label>
                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Job title *</label>
              <input
                name="jobTitle"
                value={form.jobTitle}
                onChange={handleChange}
                placeholder="e.g. CNC spindle vibration issue"
                required
                style={inputStyle}
              />
            </div>

            {/* Client */}
            <div style={sectionTitle}>Customer</div>

            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Select client *</label>
              <select
                name="clientId"
                value={form.clientId}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="">-- Select client --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>

              {clients.length === 0 && (
                <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px' }}>
                  No clients found.{' '}
                  <span
                    onClick={() => router.push('/dashboard/clients-vendors/clients/create')}
                    style={{ color: '#1a56db', cursor: 'pointer' }}
                  >
                    Create a client first →
                  </span>
                </div>
              )}
            </div>

            {selectedClient && (
              <div
                style={{
                  background: '#f0f7ff',
                  border: '0.5px solid #bfdbfe',
                  borderRadius: '7px',
                  padding: '10px 12px',
                  marginBottom: '12px',
                  fontSize: '12px',
                  color: '#1e40af',
                }}
              >
                <strong>{selectedClient.companyName}</strong>
                <br />
                Billing contact: {selectedClient.contactPerson} · {selectedClient.phone}
              </div>
            )}

            {/* Billing Contact */}
            <div
              style={{
                background: '#f8fafc',
                border: '0.5px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '10px',
                }}
              >
                Billing contact (accounts / office)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Contact name</label>
                  <input
                    name="billingContact"
                    value={form.billingContact}
                    onChange={handleChange}
                    placeholder="Accounts person name"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Contact phone</label>
                  <input
                    name="billingPhone"
                    value={form.billingPhone}
                    onChange={handleChange}
                    placeholder="Billing contact mobile"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Onsite Contact */}
            <div
              style={{
                background: '#f8fafc',
                border: '0.5px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '10px',
                }}
              >
                On-site contact (engineer / operator at location)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Contact name</label>
                  <input
                    name="contactPerson"
                    value={form.contactPerson}
                    onChange={handleChange}
                    placeholder="On-site engineer name"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Contact phone</label>
                  <input
                    name="contactPhone"
                    value={form.contactPhone}
                    onChange={handleChange}
                    placeholder="On-site mobile number"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Service address</label>
              <input
                name="siteAddress"
                value={form.siteAddress}
                onChange={handleChange}
                placeholder="Auto-filled from client"
                style={inputStyle}
              />
            </div>

            {/* Machine */}
            <div style={sectionTitle}>Machine / asset</div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <div>
                <label style={labelStyle}>Machine name</label>
                <input
                  name="machineName"
                  value={form.machineName}
                  onChange={handleChange}
                  placeholder="e.g. CNC VMC 5-axis"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Serial / asset no.</label>
                <input
                  name="machineSerial"
                  value={form.machineSerial}
                  onChange={handleChange}
                  placeholder="Serial number"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Fault description</label>
              <textarea
                name="faultDescription"
                value={form.faultDescription}
                onChange={handleChange}
                placeholder="Describe the problem, symptoms, error codes..."
                rows={3}
                style={{
                  ...inputStyle,
                  height: 'auto',
                  padding: '10px 12px',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Planning */}
            <div
              style={{
                background: '#fff',
                border: '0.5px solid #e2e8f0',
                borderRadius: '10px',
                padding: '20px',
              }}
            >
              <div style={{ ...sectionTitle, marginTop: 0 }}>Planning</div>

              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Assign technician</label>
                <select
                  name="technicianId"
                  value={form.technicianId}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="">-- Assign later --</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.skill ? ` (${t.skill})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Deadline</label>
                <input
                  type="date"
                  name="deadline"
                  value={form.deadline}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Estimated value (₹)</label>
                <input
                  type="number"
                  name="estimatedAmount"
                  value={form.estimatedAmount}
                  onChange={handleChange}
                  placeholder="0.00"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Remarks</label>
                <textarea
                  name="remarks"
                  value={form.remarks}
                  onChange={handleChange}
                  placeholder="Internal notes..."
                  rows={3}
                  style={{
                    ...inputStyle,
                    height: 'auto',
                    padding: '10px 12px',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            {/* Info Card */}
            <div
              style={{
                background: '#f0f7ff',
                border: '0.5px solid #bfdbfe',
                borderRadius: '10px',
                padding: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1e40af',
                  marginBottom: '8px',
                }}
              >
                Job number
              </div>
              <div style={{ fontSize: '12px', color: '#3b82f6', lineHeight: '1.6' }}>
                Auto-generated on save
                <br />
                Format: JOB-YYMM-XXX
              </div>
            </div>

            {/* Priority Info */}
            <div
              style={{
                background: '#fffbeb',
                border: '0.5px solid #fde68a',
                borderRadius: '10px',
                padding: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#92400e',
                  marginBottom: '8px',
                }}
              >
                Priority guide
              </div>
              <div style={{ fontSize: '12px', color: '#78350f', lineHeight: '1.8' }}>
                🔴 High — assign immediately
                <br />
                🟡 Medium — within 24 hours
                <br />
                🟢 Low — schedule as available
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '0.5px solid #fecaca',
              color: '#dc2626',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              marginTop: '16px',
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '16px',
            padding: '16px',
            background: '#fff',
            border: '0.5px solid #e2e8f0',
            borderRadius: '10px',
          }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              padding: '9px 20px',
              border: '0.5px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#475569',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '9px 24px',
              background: loading ? '#93c5fd' : '#1a56db',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Saving...' : '💾 Save job'}
          </button>
        </div>
      </form>
    </div>
  )
}