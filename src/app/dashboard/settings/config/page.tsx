'use client'
import { useState, useEffect } from 'react'

const inputStyle = {
  width: '100%', height: '38px', padding: '0 12px',
  border: '0.5px solid #e2e8f0', borderRadius: '7px',
  fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a',
}

const labelStyle = {
  display: 'block' as const,
  fontSize: '12px', fontWeight: '500' as const,
  color: '#475569', marginBottom: '5px',
}

const sectionTitle = {
  fontSize: '14px', fontWeight: '600' as const,
  color: '#0f172a', marginBottom: '14px',
  paddingBottom: '8px', borderBottom: '0.5px solid #e2e8f0',
}

type NumberFormat = {
  prefix: string
  includeYYMM: boolean
  padding: number
  nextNumber: number
  separator: string
  preview: string
}

type TemplateConfig = {
  type: string
  label: string
  icon: string
  uploadedUrl: string
  uploadedName: string
  defaultTemplate: 'system' | 'uploaded'
}

function buildPreview(fmt: NumberFormat): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const seq = String(fmt.nextNumber).padStart(fmt.padding, '0')
  const parts = [fmt.prefix]
  if (fmt.includeYYMM) parts.push(`${yy}${mm}`)
  parts.push(seq)
  return parts.join(fmt.separator)
}

export default function SystemConfigPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [activeTab, setActiveTab] = useState<'company' | 'numbering' | 'finance' | 'templates' | 'alerts'>('company')
  const [uploadingTemplate, setUploadingTemplate] = useState<string | null>(null)

  const [config, setConfig] = useState({
    companyName: '', companyTagline: 'Professional Service Management',
    companyAddress: '', companyPhone: '', companyEmail: '', companyGstin: '',
    defaultTaxRate: '18', defaultPaymentTerms: '30', currency: 'INR',
    financialYearStart: 'April',
    enableEmailNotifications: false, enableSMSNotifications: false,
    enableOverdueAlerts: true, enableLowStockAlerts: true,
    overdueAlertDays: '1', lowStockAlertLevel: '10',
  })

  const [numberFormats, setNumberFormats] = useState<Record<string, NumberFormat>>({
    job:       { prefix: 'JOB', includeYYMM: true, padding: 3, nextNumber: 1, separator: '-', preview: '' },
    invoice:   { prefix: 'INV', includeYYMM: true, padding: 3, nextNumber: 1, separator: '-', preview: '' },
    quotation: { prefix: 'QT',  includeYYMM: true, padding: 3, nextNumber: 1, separator: '-', preview: '' },
    client:    { prefix: 'CLT', includeYYMM: true, padding: 3, nextNumber: 1, separator: '-', preview: '' },
    vendor:    { prefix: 'VND', includeYYMM: true, padding: 3, nextNumber: 1, separator: '-', preview: '' },
    po:        { prefix: 'PO',  includeYYMM: true, padding: 3, nextNumber: 1, separator: '-', preview: '' },
    employee:  { prefix: 'EMP', includeYYMM: true, padding: 3, nextNumber: 1, separator: '-', preview: '' },
  })

  const [templates, setTemplates] = useState<TemplateConfig[]>([
    { type: 'invoice',   label: 'Invoice template',     icon: '🧾', uploadedUrl: '', uploadedName: '', defaultTemplate: 'system' },
    { type: 'payslip',  label: 'Salary slip template',  icon: '💵', uploadedUrl: '', uploadedName: '', defaultTemplate: 'system' },
    { type: 'quotation',label: 'Quotation template',    icon: '📋', uploadedUrl: '', uploadedName: '', defaultTemplate: 'system' },
    { type: 'po',       label: 'Purchase order template',icon: '📦', uploadedUrl: '', uploadedName: '', defaultTemplate: 'system' },
    { type: 'form16',   label: 'Form 16 template',      icon: '📄', uploadedUrl: '', uploadedName: '', defaultTemplate: 'system' },
    { type: 'letterhead',label: 'Company letterhead',   icon: '🏢', uploadedUrl: '', uploadedName: '', defaultTemplate: 'system' },
  ])

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/settings')
        const data = await res.json()
        if (data.config) setConfig(prev => ({ ...prev, ...data.config }))

        // Load number formats from localStorage (in production: from DB)
        try {
          const storedFormats = localStorage.getItem('number_formats')
          if (storedFormats) setNumberFormats(JSON.parse(storedFormats))
        } catch { /* ignore */ }

        // Load templates from localStorage
        try {
          const storedTemplates = localStorage.getItem('doc_templates')
          if (storedTemplates) setTemplates(JSON.parse(storedTemplates))
        } catch { /* ignore */ }
      } catch {
        showMessage('Failed to load settings', 'error')
      }
      setLoading(false)
    }
    loadConfig()
  }, [])

  // Update previews whenever formats change
  useEffect(() => {
    setNumberFormats(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(key => {
        updated[key] = { ...updated[key], preview: buildPreview(updated[key]) }
      })
      return updated
    })
  }, [])

  function showMessage(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 4000)
  }

  function handleChange(field: string, value: string | boolean) {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  function updateFormat(key: string, field: keyof NumberFormat, value: string | number | boolean) {
    setNumberFormats(prev => {
      const updated = { ...prev, [key]: { ...prev[key], [field]: value } }
      updated[key].preview = buildPreview(updated[key])
      return updated
    })
  }

  function updateTemplate(type: string, field: keyof TemplateConfig, value: string) {
    setTemplates(prev => prev.map(t => t.type === type ? { ...t, [field]: value } : t))
  }

  async function handleTemplateUpload(type: string, file: File) {
    setUploadingTemplate(type)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'templates')
      formData.append('fileName', `${type}_template_${Date.now()}`)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { showMessage(data.message || 'Upload failed', 'error'); setUploadingTemplate(null); return }
      setTemplates(prev => prev.map(t => t.type === type
        ? { ...t, uploadedUrl: data.url, uploadedName: file.name, defaultTemplate: 'uploaded' }
        : t
      ))
      showMessage(`${type} template uploaded successfully!`, 'success')
    } catch {
      showMessage('Upload failed', 'error')
    }
    setUploadingTemplate(null)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) {
        // Save number formats and templates to localStorage
        localStorage.setItem('number_formats', JSON.stringify(numberFormats))
        localStorage.setItem('doc_templates', JSON.stringify(templates))
        showMessage('✓ All settings saved successfully!', 'success')
      } else {
        showMessage('Failed to save settings', 'error')
      }
    } catch {
      showMessage('Something went wrong', 'error')
    }
    setSaving(false)
  }

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading settings...</div>

  const tabs = [
    { id: 'company', label: '🏢 Company' },
    { id: 'numbering', label: '🔢 Numbering' },
    { id: 'finance', label: '💰 Finance' },
    { id: 'templates', label: '📄 Templates' },
    { id: 'alerts', label: '🔔 Alerts' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>System configuration</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Company details, document numbering, templates and alerts</p>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ background: saving ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          {saving ? 'Saving...' : '💾 Save all changes'}
        </button>
      </div>

      {message.text && (
        <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#16a34a' : '#dc2626', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#f8fafc', borderRadius: '8px', padding: '4px', width: 'fit-content' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{ padding: '7px 16px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', background: activeTab === tab.id ? '#fff' : 'transparent', color: activeTab === tab.id ? '#0f172a' : '#64748b', boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* COMPANY TAB */}
      {activeTab === 'company' && (
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
          <div style={sectionTitle}>🏢 Company information</div>
          <div style={{ background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: '7px', padding: '10px 12px', marginBottom: '16px', fontSize: '12px', color: '#92400e' }}>
            ⚠️ These details appear on every printed invoice, payslip, quotation and PO. Fill them carefully.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Company name *</label>
              <input value={config.companyName} onChange={e => handleChange('companyName', e.target.value)} placeholder="e.g. Soham Technologies" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Tagline / description</label>
              <input value={config.companyTagline} onChange={e => handleChange('companyTagline', e.target.value)} placeholder="e.g. Industrial Equipment Repair & AMC" style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Address</label>
              <textarea value={config.companyAddress} onChange={e => handleChange('companyAddress', e.target.value)} rows={2} placeholder="Full company address" style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' as const }} />
            </div>
            <div>
              <label style={labelStyle}>Phone *</label>
              <input value={config.companyPhone} onChange={e => handleChange('companyPhone', e.target.value)} placeholder="+91 98765 43210" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              <input type="email" value={config.companyEmail} onChange={e => handleChange('companyEmail', e.target.value)} placeholder="company@email.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>GSTIN</label>
              <input value={config.companyGstin} onChange={e => handleChange('companyGstin', e.target.value)} placeholder="e.g. 27AABCU9603R1ZX" style={inputStyle} />
            </div>
          </div>
        </div>
      )}

      {/* NUMBERING TAB */}
      {activeTab === 'numbering' && (
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
          <div style={sectionTitle}>🔢 Document numbering format</div>
          <div style={{ background: '#f0f7ff', border: '0.5px solid #bfdbfe', borderRadius: '7px', padding: '10px 12px', marginBottom: '20px', fontSize: '12px', color: '#185fa5' }}>
            💡 Format: <strong>PREFIX</strong> + YYMM (optional) + padded sequence. Example: <strong>INV-2503-001</strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(numberFormats).map(([key, fmt]) => (
              <div key={key} style={{ border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', textTransform: 'capitalize' }}>{key === 'po' ? 'Purchase Order' : key.charAt(0).toUpperCase() + key.slice(1)} number</div>
                  <div style={{ background: '#1a56db', color: '#fff', padding: '4px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', fontFamily: 'monospace' }}>
                    {fmt.preview || buildPreview(fmt)}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px 120px 1fr', gap: '10px', alignItems: 'end' }}>
                  <div>
                    <label style={labelStyle}>Prefix</label>
                    <input value={fmt.prefix} onChange={e => updateFormat(key, 'prefix', e.target.value.toUpperCase())} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Separator</label>
                    <select value={fmt.separator} onChange={e => updateFormat(key, 'separator', e.target.value)} style={inputStyle}>
                      <option value="-">- (dash)</option>
                      <option value="/">/</option>
                      <option value="_">_ (underscore)</option>
                      <option value="">none</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>YYMM</label>
                    <button type="button" onClick={() => updateFormat(key, 'includeYYMM', !fmt.includeYYMM)}
                      style={{ width: '100%', height: '38px', border: `0.5px solid ${fmt.includeYYMM ? '#1a56db' : '#e2e8f0'}`, borderRadius: '7px', fontSize: '12px', color: fmt.includeYYMM ? '#1a56db' : '#475569', background: fmt.includeYYMM ? '#eff6ff' : '#fff', cursor: 'pointer', fontWeight: '500' }}>
                      {fmt.includeYYMM ? '✓ On' : 'Off'}
                    </button>
                  </div>
                  <div>
                    <label style={labelStyle}>Padding</label>
                    <select value={fmt.padding} onChange={e => updateFormat(key, 'padding', parseInt(e.target.value))} style={inputStyle}>
                      {[2,3,4,5,6].map(n => <option key={n} value={n}>{n} digits ({String(1).padStart(n, '0')})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Next number</label>
                    <input type="number" value={fmt.nextNumber} min={1} onChange={e => updateFormat(key, 'nextNumber', parseInt(e.target.value) || 1)} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', padding: '0 0 10px 4px' }}>
                      Next: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{buildPreview({ ...fmt })}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FINANCE TAB */}
      {activeTab === 'finance' && (
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
          <div style={sectionTitle}>💰 Finance settings</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Default GST rate (%)</label>
              <select value={config.defaultTaxRate} onChange={e => handleChange('defaultTaxRate', e.target.value)} style={inputStyle}>
                {['0', '5', '12', '18', '28'].map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Default payment terms (days)</label>
              <input type="number" value={config.defaultPaymentTerms} onChange={e => handleChange('defaultPaymentTerms', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select value={config.currency} onChange={e => handleChange('currency', e.target.value)} style={inputStyle}>
                <option value="INR">INR — Indian Rupee (₹)</option>
                <option value="USD">USD — US Dollar ($)</option>
                <option value="EUR">EUR — Euro (€)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Financial year start</label>
              <select value={config.financialYearStart} onChange={e => handleChange('financialYearStart', e.target.value)} style={inputStyle}>
                {['January', 'April'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATES TAB */}
      {activeTab === 'templates' && (
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
          <div style={sectionTitle}>📄 Document templates</div>
          <div style={{ background: '#f0f7ff', border: '0.5px solid #bfdbfe', borderRadius: '7px', padding: '10px 12px', marginBottom: '20px', fontSize: '12px', color: '#185fa5' }}>
            💡 Upload your own letterhead or template (PDF/PNG) — or use the Service Pro ERP default template. The selected default will be used when printing documents.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {templates.map(tmpl => (
              <div key={tmpl.type} style={{ border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>{tmpl.icon}</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{tmpl.label}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {tmpl.uploadedName ? `Uploaded: ${tmpl.uploadedName}` : 'No custom template uploaded'}
                      </div>
                    </div>
                  </div>

                  {/* Default selector */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Use:</span>
                    <button onClick={() => updateTemplate(tmpl.type, 'defaultTemplate', 'system')}
                      style={{ padding: '5px 12px', border: `0.5px solid ${tmpl.defaultTemplate === 'system' ? '#1a56db' : '#e2e8f0'}`, borderRadius: '6px', fontSize: '11px', color: tmpl.defaultTemplate === 'system' ? '#1a56db' : '#475569', background: tmpl.defaultTemplate === 'system' ? '#eff6ff' : '#fff', cursor: 'pointer', fontWeight: tmpl.defaultTemplate === 'system' ? '600' : '400' }}>
                      ✓ Service Pro default
                    </button>
                    <button onClick={() => tmpl.uploadedUrl && updateTemplate(tmpl.type, 'defaultTemplate', 'uploaded')}
                      disabled={!tmpl.uploadedUrl}
                      style={{ padding: '5px 12px', border: `0.5px solid ${tmpl.defaultTemplate === 'uploaded' ? '#16a34a' : '#e2e8f0'}`, borderRadius: '6px', fontSize: '11px', color: tmpl.defaultTemplate === 'uploaded' ? '#16a34a' : tmpl.uploadedUrl ? '#475569' : '#cbd5e1', background: tmpl.defaultTemplate === 'uploaded' ? '#f0fdf4' : '#fff', cursor: tmpl.uploadedUrl ? 'pointer' : 'not-allowed', fontWeight: tmpl.defaultTemplate === 'uploaded' ? '600' : '400' }}>
                      {tmpl.uploadedUrl ? '✓ My template' : 'My template (upload first)'}
                    </button>
                  </div>
                </div>

                {/* Upload section */}
                <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {tmpl.uploadedUrl ? (
                    <>
                      <button onClick={() => window.open(tmpl.uploadedUrl, '_blank')}
                        style={{ padding: '6px 12px', border: '0.5px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}>
                        👁 View uploaded
                      </button>
                      <label style={{ cursor: 'pointer' }}>
                        <div style={{ padding: '6px 12px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#475569', background: '#f8fafc', cursor: 'pointer' }}>
                          🔄 Replace
                        </div>
                        <input type="file" accept="image/jpeg,image/png,application/pdf" style={{ display: 'none' }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleTemplateUpload(tmpl.type, f) }} />
                      </label>
                      <button onClick={() => setTemplates(prev => prev.map(t => t.type === tmpl.type ? { ...t, uploadedUrl: '', uploadedName: '', defaultTemplate: 'system' } : t))}
                        style={{ padding: '6px 12px', border: '0.5px solid #fecaca', borderRadius: '6px', fontSize: '12px', color: '#dc2626', background: '#fef2f2', cursor: 'pointer' }}>
                        🗑 Remove
                      </button>
                    </>
                  ) : (
                    <label style={{ cursor: uploadingTemplate === tmpl.type ? 'not-allowed' : 'pointer' }}>
                      <div style={{ padding: '8px 16px', border: '0.5px dashed #bfdbfe', borderRadius: '6px', fontSize: '12px', color: uploadingTemplate === tmpl.type ? '#93c5fd' : '#1a56db', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {uploadingTemplate === tmpl.type ? '⏳ Uploading...' : '📤 Upload template (PDF or PNG)'}
                      </div>
                      <input type="file" accept="image/jpeg,image/png,application/pdf" style={{ display: 'none' }} disabled={uploadingTemplate === tmpl.type}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleTemplateUpload(tmpl.type, f) }} />
                    </label>
                  )}

                  <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#94a3b8' }}>
                    {tmpl.defaultTemplate === 'system' ? '✓ Using Service Pro default template' : '✓ Using your uploaded template'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALERTS TAB */}
      {activeTab === 'alerts' && (
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
          <div style={sectionTitle}>🔔 Alerts & notifications</div>
          {[
            { label: 'Enable overdue job alerts', field: 'enableOverdueAlerts', description: 'Alert when jobs pass their deadline' },
            { label: 'Enable low stock alerts', field: 'enableLowStockAlerts', description: 'Alert when inventory falls below minimum level' },
            { label: 'Email notifications', field: 'enableEmailNotifications', description: 'Send alerts via email (coming soon)' },
            { label: 'SMS notifications', field: 'enableSMSNotifications', description: 'Send alerts via SMS (coming soon)' },
          ].map(item => (
            <div key={item.field} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '0.5px solid #f1f5f9' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{item.label}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{item.description}</div>
              </div>
              <button onClick={() => handleChange(item.field, !config[item.field as keyof typeof config])}
                style={{ width: '44px', height: '24px', background: config[item.field as keyof typeof config] ? '#1a56db' : '#e2e8f0', border: 'none', borderRadius: '12px', cursor: 'pointer', position: 'relative' as const, transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ width: '18px', height: '18px', background: '#fff', borderRadius: '50%', position: 'absolute' as const, top: '3px', left: config[item.field as keyof typeof config] ? '23px' : '3px', transition: 'left 0.2s' }} />
              </button>
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '16px' }}>
            <div>
              <label style={labelStyle}>Overdue alert after (days)</label>
              <input type="number" value={config.overdueAlertDays} onChange={e => handleChange('overdueAlertDays', e.target.value)} min="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Low stock alert at (% of min)</label>
              <input type="number" value={config.lowStockAlertLevel} onChange={e => handleChange('lowStockAlertLevel', e.target.value)} min="0" max="100" style={inputStyle} />
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave} disabled={saving} style={{ background: saving ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          {saving ? 'Saving...' : '💾 Save all changes'}
        </button>
      </div>
    </div>
  )
}