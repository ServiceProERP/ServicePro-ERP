'use client'
import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

const inputStyle = {
  width: '100%', height: '36px', padding: '0 10px',
  border: '0.5px solid #e2e8f0', borderRadius: '6px',
  fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a',
}
const labelStyle = { display: 'block' as const, fontSize: '12px', fontWeight: '500' as const, color: '#475569', marginBottom: '4px' }
const taStyle = { ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' as const }

type CheckItem = { label: string; field: string; options: string[] }

const checkItems: CheckItem[] = [
  { label: 'Inspection done', field: 'inspectionDone', options: ['Yes', 'No'] },
  { label: 'Cleaning done', field: 'cleaningDone', options: ['Yes', 'No'] },
  { label: 'Calibration done', field: 'calibrationDone', options: ['Yes', 'No', 'N/A'] },
  { label: 'Lubrication done', field: 'lubricationDone', options: ['Yes', 'No', 'N/A'] },
  { label: 'Parts replaced', field: 'partsReplaced', options: ['Yes', 'No'] },
  { label: 'Test run done', field: 'testRunDone', options: ['Yes', 'No'] },
  { label: 'Machine handed over running', field: 'machineHandedOver', options: ['Yes', 'No'] },
]

export default function SiteVisitPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params?.id as string

  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    visitDate: today,
    arrivalTime: '',
    departureTime: '',
    onSiteContact: '',
    onSiteContactSign: '',
    machineConditionBefore: '',
    observedProblem: '',
    rootCause: '',
    actionTaken: '',
    machineConditionAfter: '',
    inspectionDone: 'Yes',
    cleaningDone: 'Yes',
    calibrationDone: 'N/A',
    lubricationDone: 'N/A',
    partsReplaced: 'No',
    testRunDone: 'Yes',
    machineHandedOver: 'Yes',
    nextServiceDate: '',
    additionalRecommendations: '',
    partsToOrder: '',
    clientRepresentative: '',
    clientSatisfaction: 'Satisfied',
    clientComments: '',
  })

  function setField(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.actionTaken) { setMessage({ text: 'Action taken is required', type: 'error' }); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/visit-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          inspectionDone: form.inspectionDone === 'Yes',
          cleaningDone: form.cleaningDone === 'Yes',
          partsReplaced: form.partsReplaced === 'Yes',
          testRunDone: form.testRunDone === 'Yes',
          machineHandedOver: form.machineHandedOver === 'Yes',
        }),
      })
      if (res.ok) {
        setMessage({ text: 'Site visit recorded successfully!', type: 'success' })
        setTimeout(() => router.push(`/dashboard/technician/jobs/${jobId}`), 1500)
      } else {
        setMessage({ text: 'Failed to save site visit', type: 'error' })
      }
    } catch {
      setMessage({ text: 'Something went wrong', type: 'error' })
    }
    setSubmitting(false)
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => router.push(`/dashboard/technician/jobs/${jobId}`)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '4px' }}>← Back to job</button>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Record site visit</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>This replaces the paper job card. Fill completely before leaving the site.</p>
      </div>

      {message.text && (
        <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#16a34a' : '#dc2626', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* Visit info */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '14px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '14px', paddingBottom: '8px', borderBottom: '0.5px solid #f1f5f9' }}>📅 Visit information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
            <div><label style={labelStyle}>Visit date</label><input type="date" value={form.visitDate} onChange={e => setField('visitDate', e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Arrival time</label><input type="time" value={form.arrivalTime} onChange={e => setField('arrivalTime', e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Departure time</label><input type="time" value={form.departureTime} onChange={e => setField('departureTime', e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>On-site contact</label><input value={form.onSiteContact} onChange={e => setField('onSiteContact', e.target.value)} placeholder="Contact person name" style={inputStyle} /></div>
          </div>
        </div>

        {/* Machine findings */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '14px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '14px', paddingBottom: '8px', borderBottom: '0.5px solid #f1f5f9' }}>🔧 Machine findings</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Machine condition on arrival</label>
              <select value={form.machineConditionBefore} onChange={e => setField('machineConditionBefore', e.target.value)} style={inputStyle}>
                <option value="">Select</option>
                {['Good', 'Fair', 'Poor', 'Not running'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Machine condition after service</label>
              <select value={form.machineConditionAfter} onChange={e => setField('machineConditionAfter', e.target.value)} style={inputStyle}>
                <option value="">Select</option>
                {['Good', 'Fair', 'Poor', 'Running'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelStyle}>Observed problem / symptoms</label><textarea value={form.observedProblem} onChange={e => setField('observedProblem', e.target.value)} rows={3} style={taStyle} placeholder="What was the problem when you arrived?" /></div>
            <div><label style={labelStyle}>Root cause identified</label><textarea value={form.rootCause} onChange={e => setField('rootCause', e.target.value)} rows={3} style={taStyle} placeholder="What caused the problem?" /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Action taken * (what did you do?)</label><textarea value={form.actionTaken} onChange={e => setField('actionTaken', e.target.value)} rows={4} required style={taStyle} placeholder="Describe in detail what work you performed..." /></div>
          </div>
        </div>

        {/* Checklist */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '14px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '14px', paddingBottom: '8px', borderBottom: '0.5px solid #f1f5f9' }}>✅ Work performed checklist</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {checkItems.map(item => (
              <div key={item.field} style={{ background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>{item.label}</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' as const }}>
                  {item.options.map(opt => {
                    const val = form[item.field as keyof typeof form]
                    const actualSelected = val === opt
                    return (
                      <button key={opt} type="button" onClick={() => setField(item.field, opt)}
                        style={{ padding: '4px 10px', border: `0.5px solid ${actualSelected ? (opt === 'Yes' ? '#16a34a' : opt === 'No' ? '#dc2626' : '#94a3b8') : '#e2e8f0'}`, borderRadius: '5px', fontSize: '11px', cursor: 'pointer', fontWeight: actualSelected ? '600' : '400', background: actualSelected ? (opt === 'Yes' ? '#eaf3de' : opt === 'No' ? '#fef2f2' : '#f1f5f9') : '#fff', color: actualSelected ? (opt === 'Yes' ? '#16a34a' : opt === 'No' ? '#dc2626' : '#64748b') : '#64748b' }}>
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '14px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '14px', paddingBottom: '8px', borderBottom: '0.5px solid #f1f5f9' }}>💡 Recommendations</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div><label style={labelStyle}>Next service date</label><input type="date" value={form.nextServiceDate} onChange={e => setField('nextServiceDate', e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Additional repairs recommended</label><input value={form.additionalRecommendations} onChange={e => setField('additionalRecommendations', e.target.value)} placeholder="Any other repairs needed?" style={inputStyle} /></div>
            <div><label style={labelStyle}>Parts to order for next visit</label><input value={form.partsToOrder} onChange={e => setField('partsToOrder', e.target.value)} placeholder="Parts needed next time" style={inputStyle} /></div>
          </div>
        </div>

        {/* Client acknowledgement */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '14px', paddingBottom: '8px', borderBottom: '0.5px solid #f1f5f9' }}>🤝 Client acknowledgement</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div><label style={labelStyle}>Client representative name</label><input value={form.clientRepresentative} onChange={e => setField('clientRepresentative', e.target.value)} placeholder="Who witnessed the work?" style={inputStyle} /></div>
            <div>
              <label style={labelStyle}>Client satisfaction</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['Satisfied', 'Neutral', 'Not satisfied'].map(opt => (
                  <button key={opt} type="button" onClick={() => setField('clientSatisfaction', opt)}
                    style={{ flex: 1, padding: '7px 4px', border: `0.5px solid ${form.clientSatisfaction === opt ? '#1a56db' : '#e2e8f0'}`, borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: form.clientSatisfaction === opt ? '600' : '400', background: form.clientSatisfaction === opt ? '#eff6ff' : '#fff', color: form.clientSatisfaction === opt ? '#1a56db' : '#64748b' }}>
                    {opt === 'Satisfied' ? '😊' : opt === 'Neutral' ? '😐' : '😞'} {opt}
                  </button>
                ))}
              </div>
            </div>
            <div><label style={labelStyle}>Client comments</label><input value={form.clientComments} onChange={e => setField('clientComments', e.target.value)} placeholder="Any feedback from client?" style={inputStyle} /></div>
          </div>
          <div style={{ background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: '6px', padding: '10px 14px', fontSize: '12px', color: '#92400e' }}>
            💡 Ask the client to confirm their name above. This serves as their acknowledgement that the work was completed.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" disabled={submitting} style={{ padding: '10px 28px', background: submitting ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
            {submitting ? 'Saving...' : '✓ Save site visit record'}
          </button>
          <button type="button" onClick={() => router.push(`/dashboard/technician/jobs/${jobId}`)} style={{ padding: '10px 20px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>Cancel</button>
        </div>
      </form>
    </div>
  )
}