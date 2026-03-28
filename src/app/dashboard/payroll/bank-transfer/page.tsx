'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'

type PayrollRun = {
  month: string
  year: number
  totalEmployees: number
  totalNet: number
  status: string
}

type TransferRow = {
  empCode: string
  name: string
  bankName: string
  accountNo: string
  ifscCode: string
  amount: number
}

const months = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function BankTransferPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<TransferRow[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [message, setMessage] = useState({ text: '', type: '' })

  const fetchRuns = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/payslips?summary=true')
      if (res.ok) {
        const data = await res.json()
        setRuns(data.summary || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRuns() }, [fetchRuns])

  function showMsg(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 4000)
  }

  async function generateTransfer() {
    if (!selectedMonth || !selectedYear) { showMsg('Please select month and year', 'error'); return }
    setGenerating(true)
    try {
      const res = await fetch(`/api/payroll/bank-transfer?month=${selectedMonth}&year=${selectedYear}`)
      const data = await res.json()
      if (!res.ok) { showMsg(data.message || 'Failed to generate', 'error'); setGenerating(false); return }

      // Parse CSV for preview
      const lines = data.csv.split('\n').slice(1) // skip header
      const rows: TransferRow[] = lines.map((line: string) => {
        const cols = line.split(',').map((c: string) => c.replace(/"/g, ''))
        return {
          empCode: cols[1] || '',
          name: cols[2] || '',
          bankName: cols[3] || '',
          accountNo: cols[4] || '',
          ifscCode: cols[5] || '',
          amount: parseFloat(cols[6]) || 0,
        }
      }).filter((r: TransferRow) => r.empCode)

      setPreview(rows)
      setTotalAmount(data.totalAmount)
      showMsg(`Transfer file ready for ${data.totalEmployees} employees`, 'success')

      // Auto download CSV
      const blob = new Blob([data.csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      showMsg('Failed to generate transfer file', 'error')
    }
    setGenerating(false)
  }

  const selectStyle = {
    height: '36px', padding: '0 10px', border: '0.5px solid #e2e8f0',
    borderRadius: '6px', fontSize: '13px', color: '#475569', background: '#fff', outline: 'none',
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Bank transfer file</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          Generate bulk salary transfer CSV for your bank — upload directly to your bank portal
        </p>
      </div>

      {message.text && (
        <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#16a34a' : '#dc2626', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      {/* Info box */}
      <div style={{ background: '#f0f7ff', border: '0.5px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '12px', color: '#185fa5' }}>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>📋 How to use</div>
        <div>1. Select the payroll month and year below</div>
        <div>2. Click Generate — a CSV file will download automatically</div>
        <div>3. Log in to your bank's corporate portal → Bulk Salary Transfer → Upload the CSV</div>
        <div style={{ marginTop: '4px', color: '#854f0b' }}>⚠️ Only payslips with Approved or Paid status are included. Make sure bank details are filled in Salary Structure.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '16px' }}>

        {/* Generate panel */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '20px', height: 'fit-content' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '16px', paddingBottom: '8px', borderBottom: '0.5px solid #e2e8f0' }}>
            Generate transfer file
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>Month *</label>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ ...selectStyle, width: '100%' }}>
              <option value="">— Select month —</option>
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>Year *</label>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={{ ...selectStyle, width: '100%' }}>
              <option value="">— Select year —</option>
              {[2024, 2025, 2026].map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>

          <button
            onClick={generateTransfer}
            disabled={generating || !selectedMonth || !selectedYear}
            style={{ width: '100%', padding: '10px', background: generating ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: generating ? 'not-allowed' : 'pointer' }}
          >
            {generating ? '⏳ Generating...' : '⬇ Generate & Download CSV'}
          </button>

          {totalAmount > 0 && (
            <div style={{ marginTop: '12px', background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' as const }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Total transfer amount</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a' }}>{formatCurrency(totalAmount)}</div>
            </div>
          )}
        </div>

        {/* Right — payroll history + preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Payroll runs */}
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '14px' }}>Payroll runs</div>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading...</div>
            ) : runs.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No payroll runs yet</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Period', 'Employees', 'Total net', 'Action'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r, i) => (
                    <tr key={i} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{r.month} {r.year}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#475569' }}>{r.totalEmployees}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#16a34a' }}>{formatCurrency(r.totalNet)}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9' }}>
                        <button
                          onClick={() => { setSelectedMonth(r.month); setSelectedYear(String(r.year)) }}
                          style={{ padding: '3px 8px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '11px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Preview table */}
          {preview.length > 0 && (
            <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginBottom: '14px' }}>
                Transfer preview — {selectedMonth} {selectedYear}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Emp ID', 'Name', 'Bank', 'Account No', 'IFSC', 'Amount'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: '9px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{r.empCode}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{r.name}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#475569' }}>{r.bankName || <span style={{ color: '#fbbf24' }}>Not set</span>}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#475569', fontFamily: 'monospace' }}>{r.accountNo || '—'}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#475569', fontFamily: 'monospace' }}>{r.ifscCode || '—'}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#16a34a' }}>{formatCurrency(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}