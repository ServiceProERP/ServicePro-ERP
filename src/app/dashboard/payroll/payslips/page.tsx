'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'

type Payslip = {
  id: string
  month: string
  year: number
  basicSalary: number
  allowances: number
  deductions: number
  netSalary: number
  status: string
  employee: {
    name: string
    empCode: string
    designation: string | null
    department: string | null
  }
}

type CompanyConfig = {
  companyName: string
  address: string
  phone: string
  email: string
  gstin: string
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  draft:    { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
  approved: { bg: '#e6f1fb', color: '#185fa5', label: 'Approved' },
  paid:     { bg: '#eaf3de', color: '#3b6d11', label: 'Paid' },
  held:     { bg: '#faeeda', color: '#854f0b', label: 'Held' },
}

// Convert number to Indian words
function toIndianWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  if (num === 0) return 'Zero'
  function convert(n: number): string {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '')
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
  }
  const rupees = Math.floor(num)
  const paise = Math.round((num - rupees) * 100)
  let result = convert(rupees) + ' Rupees'
  if (paise > 0) result += ' and ' + convert(paise) + ' Paise'
  return result + ' Only'
}

export default function PayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })
  const [printSlip, setPrintSlip] = useState<Payslip | null>(null)
  const [company, setCompany] = useState<CompanyConfig>({ companyName: 'Your Company', address: '', phone: '', email: '', gstin: '' })

  const fetchPayslips = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (monthFilter) params.set('month', monthFilter)
    if (yearFilter) params.set('year', yearFilter)
    const [slipRes, configRes] = await Promise.all([
      fetch(`/api/payslips?${params}`),
      fetch('/api/settings'),
    ])
    const slipData = await slipRes.json()
    const configData = await configRes.json()
    setPayslips(slipData.payslips || [])
    if (configData.config) setCompany(configData.config)
    setLoading(false)
  }, [monthFilter, yearFilter])

  useEffect(() => { fetchPayslips() }, [fetchPayslips])

  function showMsg(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/payslips/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        showMsg(`Payslip ${status === 'approved' ? 'approved — employee can now view their payslip' : status === 'held' ? 'held — employee cannot view this payslip' : 'updated'}`, 'success')
        fetchPayslips()
      }
    } catch {
      showMsg('Failed to update status', 'error')
    }
  }

  function openPrint(slip: Payslip) {
    setPrintSlip(slip)
    setTimeout(() => {
      const printContent = document.getElementById('payslip-print')
      if (!printContent) return
      const w = window.open('', '_blank', 'width=900,height=700')
      if (!w) return
      w.document.write('<html><head><title>Salary Slip</title>')
      w.document.write('<style>body{font-family:Arial,sans-serif;font-size:12px;color:#000;padding:20px} table{border-collapse:collapse;width:100%} th,td{padding:6px 8px} @page{size:A4;margin:15mm}</style>')
      w.document.write('</head><body>')
      w.document.write(printContent.innerHTML)
      w.document.write('</body></html>')
      w.document.close()
      w.focus()
      setTimeout(() => { w.print(); w.close() }, 300)
    }, 100)
  }

  const filtered = payslips.filter(p => !statusFilter || p.status === statusFilter)
  const totalNet = filtered.reduce((s, p) => s + p.netSalary, 0)

  const selectStyle = {
    height: '36px', padding: '0 10px', border: '0.5px solid #e2e8f0',
    borderRadius: '6px', fontSize: '13px', color: '#475569', background: '#fff', outline: 'none',
  }

  return (
    <div>
      {/* Print styles — hidden on screen, shown only when printing */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #payslip-print, #payslip-print * { visibility: visible !important; }
          #payslip-print { position: fixed !important; top: 0; left: 0; width: 100%; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Payslips</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            Approve payslips so employees can view them · Print salary slips
          </p>
        </div>
        {filtered.length > 0 && (
          <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', color: '#16a34a', fontWeight: '600' }}>
            Total payout: {formatCurrency(totalNet)}
          </div>
        )}
      </div>

      {message.text && (
        <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#16a34a' : '#dc2626', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      {/* Info box */}
      <div style={{ background: '#f0f7ff', border: '0.5px solid #bfdbfe', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#185fa5' }}>
        💡 <strong>Approve</strong> a payslip to make it visible to the employee on their portal. <strong>Hold</strong> to hide it. Only approved payslips can be printed officially.
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={selectStyle}>
          <option value="">All months</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={selectStyle}>
          <option value="">All years</option>
          {[2024, 2025, 2026].map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">All status</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="held">Held</option>
        </select>
        {(monthFilter || yearFilter || statusFilter) && (
          <button onClick={() => { setMonthFilter(''); setYearFilter(''); setStatusFilter('') }} style={{ padding: '0 12px', border: '0.5px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#64748b', background: '#f8fafc', cursor: 'pointer' }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Employee', 'Emp ID', 'Period', 'Basic', 'Allowances', 'Deductions', 'Net salary', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading payslips...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  No payslips found. Run payroll from the Payroll Dashboard first.
                </td>
              </tr>
            ) : filtered.map(slip => {
              const sc = statusConfig[slip.status] || statusConfig.draft
              return (
                <tr key={slip.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e6f1fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#185fa5' }}>
                        {slip.employee.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{slip.employee.name}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{slip.employee.designation || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                    {slip.employee.empCode}
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap' as const }}>
                    {slip.month} {slip.year}
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#475569' }}>
                    {formatCurrency(slip.basicSalary)}
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#16a34a' }}>
                    +{formatCurrency(slip.allowances)}
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#dc2626' }}>
                    -{formatCurrency(slip.deductions)}
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                    {formatCurrency(slip.netSalary)}
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>
                      {sc.label}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {slip.status === 'draft' && (
                        <button onClick={() => updateStatus(slip.id, 'approved')} style={{ padding: '3px 8px', border: '0.5px solid #bbf7d0', borderRadius: '5px', fontSize: '10px', color: '#16a34a', background: '#f0fdf4', cursor: 'pointer' }}>
                          ✓ Approve
                        </button>
                      )}
                      {slip.status === 'approved' && (
                        <>
                          <button onClick={() => updateStatus(slip.id, 'paid')} style={{ padding: '3px 8px', border: '0.5px solid #bbf7d0', borderRadius: '5px', fontSize: '10px', color: '#16a34a', background: '#f0fdf4', cursor: 'pointer' }}>
                            Paid
                          </button>
                          <button onClick={() => updateStatus(slip.id, 'held')} style={{ padding: '3px 8px', border: '0.5px solid #fde68a', borderRadius: '5px', fontSize: '10px', color: '#92400e', background: '#fffbeb', cursor: 'pointer' }}>
                            Hold
                          </button>
                        </>
                      )}
                      {slip.status === 'held' && (
                        <button onClick={() => updateStatus(slip.id, 'approved')} style={{ padding: '3px 8px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '10px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}>
                          Release
                        </button>
                      )}
                      {(slip.status === 'approved' || slip.status === 'paid') && (
                        <button onClick={() => openPrint(slip)} style={{ padding: '3px 8px', border: '0.5px solid #e2e8f0', borderRadius: '5px', fontSize: '10px', color: '#475569', background: '#f8fafc', cursor: 'pointer' }}>
                          🖨 Print
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

      {/* ── Indian Payslip Print Template ── */}
      {printSlip && (
        <div id="payslip-print" style={{ display: 'none', fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#000', background: '#fff', padding: '20px' }}>
          {/* Company header */}
          <div style={{ borderBottom: '2px solid #1a56db', paddingBottom: '12px', marginBottom: '12px' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1a56db' }}>{company.companyName}</div>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{company.address}</div>
            <div style={{ fontSize: '11px', color: '#475569' }}>
              {company.phone && `Tel: ${company.phone}`}
              {company.email && ` | Email: ${company.email}`}
              {company.gstin && ` | GSTIN: ${company.gstin}`}
            </div>
          </div>

          {/* Payslip title */}
          <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: '700', background: '#1a56db', color: '#fff', padding: '6px', marginBottom: '14px', borderRadius: '4px' }}>
            SALARY SLIP FOR THE MONTH OF {printSlip.month.toUpperCase()} {printSlip.year}
          </div>

          {/* Employee details */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', border: '1px solid #e2e8f0' }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', fontWeight: '600', width: '25%', background: '#f8fafc' }}>Employee Name</td>
                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', width: '25%' }}>{printSlip.employee.name}</td>
                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', fontWeight: '600', width: '25%', background: '#f8fafc' }}>Employee ID</td>
                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', width: '25%' }}>{printSlip.employee.empCode}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', fontWeight: '600', background: '#f8fafc' }}>Designation</td>
                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0' }}>{printSlip.employee.designation || '—'}</td>
                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', fontWeight: '600', background: '#f8fafc' }}>Department</td>
                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0' }}>{printSlip.employee.department || '—'}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', fontWeight: '600', background: '#f8fafc' }}>Pay Period</td>
                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0' }}>{printSlip.month} {printSlip.year}</td>
                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', fontWeight: '600', background: '#f8fafc' }}>Payment Mode</td>
                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0' }}>Bank Transfer</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', fontWeight: '600', background: '#f8fafc' }}>Days Worked</td>
                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0' }}>—</td>
                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', fontWeight: '600', background: '#f8fafc' }}>Date of Issue</td>
                <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0' }}>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
              </tr>
            </tbody>
          </table>

          {/* Earnings + Deductions */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
            <thead>
              <tr style={{ background: '#1a56db', color: '#fff' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', border: '1px solid #1a56db', width: '50%' }}>EARNINGS</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid #1a56db', width: '10%' }}>Amount (₹)</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', border: '1px solid #1a56db', width: '30%' }}>DEDUCTIONS</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid #1a56db', width: '10%' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { earn: 'Basic Salary', earnAmt: printSlip.basicSalary, ded: 'Provident Fund (PF)', dedAmt: Math.round(printSlip.basicSalary * 0.12) },
                { earn: 'House Rent Allowance (HRA)', earnAmt: Math.round(printSlip.basicSalary * 0.50), ded: 'ESIC', dedAmt: printSlip.netSalary + printSlip.deductions <= 21000 ? Math.round((printSlip.basicSalary + printSlip.allowances) * 0.0075) : 0 },
                { earn: 'Medical Allowance', earnAmt: 1250, ded: 'Professional Tax', dedAmt: 200 },
                { earn: 'Conveyance Allowance', earnAmt: 1600, ded: 'TDS / Income Tax', dedAmt: 0 },
                { earn: 'Special Allowance', earnAmt: Math.max(0, printSlip.allowances - Math.round(printSlip.basicSalary * 0.50) - 1250 - 1600), ded: 'Other Deductions', dedAmt: 0 },
                { earn: 'Other Allowance', earnAmt: 0, ded: '', dedAmt: null },
              ].map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0' }}>{row.earn}</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{row.earnAmt > 0 ? row.earnAmt.toLocaleString('en-IN') : '—'}</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0' }}>{row.ded}</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{row.dedAmt !== null && row.dedAmt > 0 ? row.dedAmt.toLocaleString('en-IN') : row.dedAmt === 0 && row.ded ? '—' : ''}</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr style={{ background: '#f8fafc', fontWeight: '700' }}>
                <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>Gross Earnings</td>
                <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{(printSlip.basicSalary + printSlip.allowances).toLocaleString('en-IN')}</td>
                <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>Total Deductions</td>
                <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{printSlip.deductions.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

          {/* Net salary box */}
          <div style={{ background: '#1a56db', color: '#fff', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: '700' }}>NET SALARY PAYABLE</div>
            <div style={{ fontSize: '18px', fontWeight: '700' }}>₹ {printSlip.netSalary.toLocaleString('en-IN')}</div>
          </div>

          {/* Amount in words */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '8px 12px', marginBottom: '16px', fontSize: '11px' }}>
            <strong>Amount in words:</strong> {toIndianWords(printSlip.netSalary)}
          </div>

          {/* Statutory note */}
          <div style={{ fontSize: '10px', color: '#64748b', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '4px', marginBottom: '20px' }}>
            <strong>Note:</strong> This is a computer-generated salary slip and does not require a signature.
            PF contribution is 12% of basic salary as per EPF Act, 1952.
            ESIC contribution is 0.75% of gross salary (applicable if gross ≤ ₹21,000) as per ESI Act, 1948.
            Professional tax as applicable per state law.
          </div>

          {/* Signature section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
            <div style={{ textAlign: 'center' as const }}>
              <div style={{ borderTop: '1px solid #000', width: '160px', marginBottom: '4px' }}></div>
              <div style={{ fontSize: '11px' }}>Employee Signature</div>
            </div>
            <div style={{ textAlign: 'center' as const }}>
              <div style={{ borderTop: '1px solid #000', width: '160px', marginBottom: '4px' }}></div>
              <div style={{ fontSize: '11px' }}>Authorised Signatory</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}