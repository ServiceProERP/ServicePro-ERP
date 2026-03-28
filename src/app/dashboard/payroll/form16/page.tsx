'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'

type Employee = { id: string; empCode: string; name: string; designation: string | null; department: string | null }
type Payslip = { month: string; year: number; basicSalary: number; allowances: number; deductions: number; netSalary: number }

type AnnualSummary = {
  emp: Employee
  payslips: Payslip[]
  totalGross: number
  totalBasic: number
  totalAllowances: number
  totalPf: number
  totalEsic: number
  totalProfTax: number
  totalTds: number
  totalDeductions: number
  totalNet: number
}

const months = ['April','May','June','July','August','September','October','November','December','January','February','March']

export default function Form16Page() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState('2025-26')
  const [summaries, setSummaries] = useState<AnnualSummary[]>([])
  const [generating, setGenerating] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState<AnnualSummary | null>(null)
  const [company, setCompany] = useState({ companyName: 'Your Company', address: '', gstin: '', companyEmail: '', companyPhone: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [empRes, configRes] = await Promise.all([
        fetch('/api/employees?limit=200'),
        fetch('/api/settings'),
      ])
      const empData = await empRes.json()
      const configData = await configRes.json()
      setEmployees(empData.employees || [])
      if (configData.config) setCompany(configData.config)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function generateForm16() {
    setGenerating(true)
    const [startYear, endYear] = selectedYear.split('-').map(y => y.length === 2 ? 2000 + parseInt(y) : parseInt(y))
    const results: AnnualSummary[] = []

    for (const emp of employees) {
      const res = await fetch(`/api/payslips?employeeId=${emp.id}`)
      if (!res.ok) continue
      const data = await res.json()
      const allSlips: Payslip[] = data.payslips || []

      // Filter payslips for financial year (April start to March end)
      const fySlips = allSlips.filter(p => {
        if (p.year === startYear && ['April','May','June','July','August','September','October','November','December'].includes(p.month)) return true
        if (p.year === endYear && ['January','February','March'].includes(p.month)) return true
        return false
      })

      if (fySlips.length === 0) continue

      const totalGross = fySlips.reduce((s, p) => s + p.basicSalary + p.allowances, 0)
      const totalBasic = fySlips.reduce((s, p) => s + p.basicSalary, 0)
      const totalAllowances = fySlips.reduce((s, p) => s + p.allowances, 0)
      const totalDeductions = fySlips.reduce((s, p) => s + p.deductions, 0)
      const totalNet = fySlips.reduce((s, p) => s + p.netSalary, 0)
      // Estimate breakdown (12% PF, 0.75% ESIC, 200 prof tax)
      const totalPf = Math.round(totalBasic * 0.12)
      const totalEsic = totalGross / fySlips.length <= 21000 ? Math.round(totalGross * 0.0075) : 0
      const totalProfTax = 200 * fySlips.length
      const totalTds = Math.max(0, totalDeductions - totalPf - totalEsic - totalProfTax)

      results.push({ emp, payslips: fySlips, totalGross, totalBasic, totalAllowances, totalPf, totalEsic, totalProfTax, totalTds, totalDeductions, totalNet })
    }

    setSummaries(results)
    setGenerating(false)
  }

  function printForm16(summary: AnnualSummary) {
    setSelectedEmp(summary)
    setTimeout(() => {
      const printContent = document.getElementById('form16-print')
      if (!printContent) return
      const w = window.open('', '_blank', 'width=900,height=700')
      if (!w) return
      w.document.write('<html><head><title>Form 16</title>')
      w.document.write('<style>body{font-family:Arial,sans-serif;font-size:11px;color:#000;padding:20px} table{border-collapse:collapse;width:100%} th,td{padding:5px 8px} @page{size:A4;margin:15mm}</style>')
      w.document.write('</head><body>')
      w.document.write(printContent.innerHTML)
      w.document.write('</body></html>')
      w.document.close()
      w.focus()
      setTimeout(() => { w.print(); w.close() }, 300)
    }, 100)
  }

  const fyOptions = ['2023-24', '2024-25', '2025-26', '2026-27']

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #form16-print, #form16-print * { visibility: visible !important; }
          #form16-print { position: fixed !important; top: 0; left: 0; width: 100%; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>

      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Form 16 / Annual salary statement</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          Generate annual salary certificate for employees for income tax filing
        </p>
      </div>

      <div style={{ background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '12px', color: '#92400e' }}>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>⚠️ Legal requirement</div>
        Form 16 must be issued to all salaried employees by 15th June every year as per Section 203 of the Income Tax Act. It certifies the TDS deducted from salary during the financial year.
      </div>

      {/* Controls */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '4px' }}>Financial year</label>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={{ height: '36px', padding: '0 10px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#475569', background: '#fff', outline: 'none' }}>
            {fyOptions.map(y => <option key={y} value={y}>FY {y}</option>)}
          </select>
        </div>
        <button
          onClick={generateForm16}
          disabled={generating || loading}
          style={{ padding: '9px 20px', background: generating ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: generating ? 'not-allowed' : 'pointer' }}
        >
          {generating ? '⏳ Generating...' : '📄 Generate Form 16'}
        </button>
      </div>

      {/* Summary table */}
      {summaries.length > 0 && (
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #e2e8f0', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
            Annual salary statement — FY {selectedYear} ({summaries.length} employees)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Employee', 'Emp ID', 'Months', 'Gross salary', 'Total PF', 'Total TDS', 'Net salary', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summaries.map((s, i) => (
                <tr key={i} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e6f1fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#185fa5' }}>
                        {s.emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{s.emp.name}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{s.emp.designation || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{s.emp.empCode}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#475569' }}>{s.payslips.length}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{formatCurrency(s.totalGross)}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#dc2626' }}>{formatCurrency(s.totalPf)}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#dc2626' }}>{formatCurrency(s.totalTds)}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>{formatCurrency(s.totalNet)}</td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <button onClick={() => printForm16(s)} style={{ padding: '4px 10px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '11px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}>
                      🖨 Print Form 16
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {summaries.length === 0 && !generating && !loading && (
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          Select a financial year and click Generate Form 16 to see annual salary statements
        </div>
      )}

      {/* Print template */}
      {selectedEmp && (
        <div id="form16-print" style={{ display: 'none', fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000', background: '#fff', padding: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '16px', fontWeight: '700' }}>{company.companyName}</div>
            <div style={{ fontSize: '11px', color: '#475569' }}>{company.address}</div>
            <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '10px', textDecoration: 'underline' }}>
              FORM 16 — CERTIFICATE OF TAX DEDUCTED AT SOURCE
            </div>
            <div style={{ fontSize: '11px', marginTop: '2px' }}>Financial Year: {selectedYear} | Assessment Year: {selectedYear.split('-')[0] + '-' + (parseInt(selectedYear.split('-')[1]) + 1)}</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', border: '1px solid #000' }}>
            <tbody>
              <tr>
                <td style={{ padding: '5px 8px', border: '1px solid #ccc', fontWeight: '600', background: '#f8fafc', width: '30%' }}>Employee Name</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ccc' }}>{selectedEmp.emp.name}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ccc', fontWeight: '600', background: '#f8fafc', width: '30%' }}>Employee ID</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ccc' }}>{selectedEmp.emp.empCode}</td>
              </tr>
              <tr>
                <td style={{ padding: '5px 8px', border: '1px solid #ccc', fontWeight: '600', background: '#f8fafc' }}>Designation</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ccc' }}>{selectedEmp.emp.designation || '—'}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ccc', fontWeight: '600', background: '#f8fafc' }}>Department</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ccc' }}>{selectedEmp.emp.department || '—'}</td>
              </tr>
              <tr>
                <td style={{ padding: '5px 8px', border: '1px solid #ccc', fontWeight: '600', background: '#f8fafc' }}>Employer Name</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ccc' }}>{company.companyName}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ccc', fontWeight: '600', background: '#f8fafc' }}>GSTIN / TAN</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ccc' }}>{company.gstin || '—'}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontWeight: '700', marginBottom: '6px', fontSize: '12px' }}>PART A — DETAILS OF TAX DEDUCTED AND DEPOSITED</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
            <thead>
              <tr style={{ background: '#1a56db', color: '#fff' }}>
                <th style={{ padding: '6px 8px', border: '1px solid #1a56db', textAlign: 'left' }}>Month</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1a56db', textAlign: 'right' }}>Gross (₹)</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1a56db', textAlign: 'right' }}>PF (₹)</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1a56db', textAlign: 'right' }}>ESIC (₹)</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1a56db', textAlign: 'right' }}>Prof Tax (₹)</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1a56db', textAlign: 'right' }}>TDS (₹)</th>
                <th style={{ padding: '6px 8px', border: '1px solid #1a56db', textAlign: 'right' }}>Net (₹)</th>
              </tr>
            </thead>
            <tbody>
              {months.map(m => {
                const slip = selectedEmp.payslips.find(p => p.month === m)
                if (!slip) return null
                const gross = slip.basicSalary + slip.allowances
                const pf = Math.round(slip.basicSalary * 0.12)
                const esic = gross <= 21000 ? Math.round(gross * 0.0075) : 0
                const profTax = 200
                const tds = Math.max(0, slip.deductions - pf - esic - profTax)
                return (
                  <tr key={m}>
                    <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{m} {slip.year}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{gross.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{pf.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{esic > 0 ? esic.toLocaleString('en-IN') : '—'}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{profTax}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{tds > 0 ? tds.toLocaleString('en-IN') : '—'}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{slip.netSalary.toLocaleString('en-IN')}</td>
                  </tr>
                )
              })}
              <tr style={{ fontWeight: '700', background: '#f8fafc' }}>
                <td style={{ padding: '6px 8px', border: '1px solid #ccc' }}>TOTAL</td>
                <td style={{ padding: '6px 8px', border: '1px solid #ccc', textAlign: 'right' }}>{selectedEmp.totalGross.toLocaleString('en-IN')}</td>
                <td style={{ padding: '6px 8px', border: '1px solid #ccc', textAlign: 'right' }}>{selectedEmp.totalPf.toLocaleString('en-IN')}</td>
                <td style={{ padding: '6px 8px', border: '1px solid #ccc', textAlign: 'right' }}>{selectedEmp.totalEsic.toLocaleString('en-IN')}</td>
                <td style={{ padding: '6px 8px', border: '1px solid #ccc', textAlign: 'right' }}>{selectedEmp.totalProfTax.toLocaleString('en-IN')}</td>
                <td style={{ padding: '6px 8px', border: '1px solid #ccc', textAlign: 'right' }}>{selectedEmp.totalTds.toLocaleString('en-IN')}</td>
                <td style={{ padding: '6px 8px', border: '1px solid #ccc', textAlign: 'right' }}>{selectedEmp.totalNet.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #000', width: '180px', marginBottom: '4px' }}></div>
              <div style={{ fontSize: '11px' }}>Employee Signature</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #000', width: '180px', marginBottom: '4px' }}></div>
              <div style={{ fontSize: '11px' }}>Authorised Signatory & Seal</div>
              <div style={{ fontSize: '10px', color: '#475569' }}>{company.companyName}</div>
            </div>
          </div>
          <div style={{ marginTop: '10px', fontSize: '9px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
            This is a computer-generated Form 16 certificate issued under Section 203 of the Income Tax Act, 1961. The TDS details are subject to reconciliation with Form 26AS.
          </div>
        </div>
      )}
    </div>
  )
}