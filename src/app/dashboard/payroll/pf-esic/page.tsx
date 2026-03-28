'use client'
import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

type PfRow = { empCode: string; name: string; uan: string; basicSalary: number; employeePf: number; employerPf: number; totalPf: number }
type EsicRow = { empCode: string; name: string; esicNo: string; grossSalary: number; employeeEsic: number; employerEsic: number; totalEsic: number }
type ChallanData = {
  month: string; year: string
  pf: { rows: PfRow[]; totalEmployeePf: number; totalEmployerPf: number; totalPf: number; dueDate: string }
  esic: { rows: EsicRow[]; totalEmployeeEsic: number; totalEmployerEsic: number; totalEsic: number; dueDate: string }
}

const months = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function PfEsicPage() {
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ChallanData | null>(null)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [activeTab, setActiveTab] = useState<'pf' | 'esic'>('pf')

  function showMsg(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 4000)
  }

  async function fetchChallan() {
    if (!selectedMonth || !selectedYear) { showMsg('Please select month and year', 'error'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll/pf-esic?month=${selectedMonth}&year=${selectedYear}`)
      const result = await res.json()
      if (!res.ok) { showMsg(result.message || 'Failed to fetch', 'error'); setLoading(false); return }
      setData(result)
    } catch {
      showMsg('Failed to fetch challan data', 'error')
    }
    setLoading(false)
  }

  function downloadCsv(type: 'pf' | 'esic') {
    if (!data) return
    let csv = ''
    if (type === 'pf') {
      csv = 'UAN,Employee Name,Employee ID,Basic Salary,Employee PF (12%),Employer PF (12%),Total PF\n'
      csv += data.pf.rows.map(r =>
        `"${r.uan}","${r.name}","${r.empCode}",${r.basicSalary},${r.employeePf},${r.employerPf},${r.totalPf}`
      ).join('\n')
      csv += `\n,,,,"Total Employee PF","Total Employer PF","Grand Total"\n`
      csv += `,,,,${data.pf.totalEmployeePf},${data.pf.totalEmployerPf},${data.pf.totalPf}`
    } else {
      csv = 'ESIC No,Employee Name,Employee ID,Gross Salary,Employee ESIC (0.75%),Employer ESIC (3.25%),Total ESIC\n'
      csv += data.esic.rows.map(r =>
        `"${r.esicNo}","${r.name}","${r.empCode}",${r.grossSalary},${r.employeeEsic},${r.employerEsic},${r.totalEsic}`
      ).join('\n')
    }
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}_challan_${selectedMonth}_${selectedYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectStyle = {
    height: '36px', padding: '0 10px', border: '0.5px solid #e2e8f0',
    borderRadius: '6px', fontSize: '13px', color: '#475569', background: '#fff', outline: 'none',
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>PF & ESIC challan</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          Monthly PF and ESIC contribution report for compliance filing
        </p>
      </div>

      {message.text && (
        <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#16a34a' : '#dc2626', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      {/* Legal info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: '#f0f7ff', border: '0.5px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px', fontSize: '12px', color: '#185fa5' }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>📋 PF (EPF Act, 1952)</div>
          <div>Employee contribution: 12% of basic salary</div>
          <div>Employer contribution: 12% of basic salary</div>
          <div>Due date: 15th of following month</div>
          <div>File via: EPFO unified portal (epfindia.gov.in)</div>
        </div>
        <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', fontSize: '12px', color: '#16a34a' }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>📋 ESIC (ESI Act, 1948)</div>
          <div>Employee contribution: 0.75% of gross salary</div>
          <div>Employer contribution: 3.25% of gross salary</div>
          <div>Applicable if gross ≤ ₹21,000/month</div>
          <div>Due date: 15th of following month</div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>Month</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={selectStyle}>
            <option value="">— Select —</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>Year</label>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={selectStyle}>
            <option value="">— Select —</option>
            {[2024, 2025, 2026].map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </div>
        <button
          onClick={fetchChallan}
          disabled={loading || !selectedMonth || !selectedYear}
          style={{ padding: '9px 20px', background: loading ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Loading...' : '📊 Generate challan'}
        </button>
      </div>

      {data && (
        <>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'Total employee PF', value: formatCurrency(data.pf.totalEmployeePf), color: '#185fa5', bg: '#e6f1fb' },
              { label: 'Total employer PF', value: formatCurrency(data.pf.totalEmployerPf), color: '#3b6d11', bg: '#eaf3de' },
              { label: 'Total ESIC (emp)', value: formatCurrency(data.esic.totalEmployeeEsic), color: '#854f0b', bg: '#faeeda' },
              { label: 'Total ESIC (er)', value: formatCurrency(data.esic.totalEmployerEsic), color: '#993556', bg: '#fbeaf0' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>{s.label}</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Total deposit box */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#1a56db', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#bfdbfe', marginBottom: '2px' }}>Total PF to deposit (EPFO)</div>
                <div style={{ fontSize: '11px', color: '#93c5fd' }}>Due by: {data.pf.dueDate}</div>
              </div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#fff' }}>{formatCurrency(data.pf.totalPf)}</div>
            </div>
            <div style={{ background: '#16a34a', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#bbf7d0', marginBottom: '2px' }}>Total ESIC to deposit</div>
                <div style={{ fontSize: '11px', color: '#86efac' }}>Due by: {data.esic.dueDate}</div>
              </div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#fff' }}>{formatCurrency(data.esic.totalEsic)}</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '0.5px solid #e2e8f0', background: '#f8fafc' }}>
              {(['pf', 'esic'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
                    fontSize: '13px', fontWeight: '500',
                    color: activeTab === tab ? '#1a56db' : '#64748b',
                    borderBottom: activeTab === tab ? '2px solid #1a56db' : '2px solid transparent',
                  }}
                >
                  {tab === 'pf' ? '🏦 PF Challan' : '🏥 ESIC Challan'}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <button
                onClick={() => downloadCsv(activeTab)}
                style={{ margin: '6px 12px', padding: '5px 14px', border: '0.5px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}
              >
                ⬇ Download {activeTab.toUpperCase()} CSV
              </button>
            </div>

            <div style={{ padding: '16px', overflowX: 'auto' }}>
              {activeTab === 'pf' ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Emp ID', 'Name', 'UAN', 'Basic salary', 'Employee PF (12%)', 'Employer PF (12%)', 'Total PF'].map(h => (
                        <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.pf.rows.map((r, i) => (
                      <tr key={i} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{r.empCode}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{r.name}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#475569', fontFamily: 'monospace' }}>{r.uan || <span style={{ color: '#fbbf24' }}>Not set</span>}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#475569' }}>{formatCurrency(r.basicSalary)}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#dc2626' }}>{formatCurrency(r.employeePf)}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#dc2626' }}>{formatCurrency(r.employerPf)}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{formatCurrency(r.totalPf)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f0f7ff', fontWeight: '600' }}>
                      <td colSpan={4} style={{ padding: '10px 12px', fontSize: '13px', color: '#185fa5' }}>Total</td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: '#dc2626' }}>{formatCurrency(data.pf.totalEmployeePf)}</td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: '#dc2626' }}>{formatCurrency(data.pf.totalEmployerPf)}</td>
                      <td style={{ padding: '10px 12px', fontSize: '14px', color: '#1a56db' }}>{formatCurrency(data.pf.totalPf)}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                data.esic.rows.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    No employees eligible for ESIC this month (all salaries above ₹21,000)
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Emp ID', 'Name', 'ESIC No', 'Gross salary', 'Employee ESIC (0.75%)', 'Employer ESIC (3.25%)', 'Total ESIC'].map(h => (
                          <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.esic.rows.map((r, i) => (
                        <tr key={i} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{r.empCode}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{r.name}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#475569', fontFamily: 'monospace' }}>{r.esicNo || <span style={{ color: '#fbbf24' }}>Not set</span>}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#475569' }}>{formatCurrency(r.grossSalary)}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#dc2626' }}>{formatCurrency(r.employeeEsic)}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#dc2626' }}>{formatCurrency(r.employerEsic)}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{formatCurrency(r.totalEsic)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: '#f0fdf4', fontWeight: '600' }}>
                        <td colSpan={4} style={{ padding: '10px 12px', fontSize: '13px', color: '#16a34a' }}>Total</td>
                        <td style={{ padding: '10px 12px', fontSize: '13px', color: '#dc2626' }}>{formatCurrency(data.esic.totalEmployeeEsic)}</td>
                        <td style={{ padding: '10px 12px', fontSize: '13px', color: '#dc2626' }}>{formatCurrency(data.esic.totalEmployerEsic)}</td>
                        <td style={{ padding: '10px 12px', fontSize: '14px', color: '#16a34a' }}>{formatCurrency(data.esic.totalEsic)}</td>
                      </tr>
                    </tbody>
                  </table>
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}