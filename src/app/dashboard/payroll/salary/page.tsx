'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'

type Employee = {
  id: string
  empCode: string
  name: string
  designation: string | null
  department: string | null
  salary: number
  status: string
}

type SalaryDetails = {
  // Earnings
  basicPay: number
  hra: number                  // House Rent Allowance
  medicalAllowance: number
  conveyanceAllowance: number
  specialAllowance: number
  otherAllowance: number
  bonus: number
  // Deductions
  pf: number                   // PF Employee 12%
  pfEmployer: number           // PF Employer 12%
  esic: number                 // ESIC Employee 0.75%
  esicEmployer: number         // ESIC Employer 3.25%
  tds: number
  professionalTax: number
  otherDeduction: number
  // Bank details
  bankName: string
  accountNo: string
  ifscCode: string
  bankBranch: string
  // ID details
  aadhaar: string
  panCard: string
  uanNo: string               // UAN for PF
  esicNo: string
}

const defaultSalary: SalaryDetails = {
  basicPay: 0, hra: 0, medicalAllowance: 0, conveyanceAllowance: 0,
  specialAllowance: 0, otherAllowance: 0, bonus: 0,
  pf: 0, pfEmployer: 0, esic: 0, esicEmployer: 0, tds: 0, professionalTax: 0, otherDeduction: 0,
  bankName: '', accountNo: '', ifscCode: '', bankBranch: '',
  aadhaar: '', panCard: '', uanNo: '', esicNo: '',
}

export default function SalaryStructurePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState<Employee | null>(null)
  const [salaryDetails, setSalaryDetails] = useState<SalaryDetails>(defaultSalary)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/employees?limit=200&status=active')
    const data = await res.json()
    setEmployees(data.employees || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  function showMessage(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  function openEdit(emp: Employee) {
    const s = emp.salary || 0
    // Auto-calculate standard Indian salary breakdown from gross
    const basic = Math.round(s * 0.40)
    const hra = Math.round(basic * 0.50)    // 50% of basic (metro)
    const conveyance = 1600                  // standard
    const medical = 1250                     // standard
    const special = Math.max(0, s - basic - hra - conveyance - medical)
    const pfAmt = Math.round(basic * 0.12)
    const esicAmt = s <= 21000 ? Math.round(s * 0.0075) : 0
    setSalaryDetails({
      ...defaultSalary,
      basicPay: basic,
      hra: hra,
      conveyanceAllowance: conveyance,
      medicalAllowance: medical,
      specialAllowance: special,
      pf: pfAmt,
      pfEmployer: pfAmt,
      esic: esicAmt,
      esicEmployer: s <= 21000 ? Math.round(s * 0.0325) : 0,
      professionalTax: 200,
    })
    setEditModal(emp)
  }

  // Auto-calculate PF and ESIC when basicPay changes
  function handleSalaryChange(field: keyof SalaryDetails, value: string | number) {
    setSalaryDetails(prev => {
      const updated = { ...prev, [field]: typeof value === 'string' && field !== 'bankName' && field !== 'accountNo' && field !== 'ifscCode' && field !== 'bankBranch' && field !== 'aadhaar' && field !== 'panCard' && field !== 'uanNo' && field !== 'esicNo' ? (parseFloat(value) || 0) : value }
      // Auto-calc PF from basic
      if (field === 'basicPay') {
        const basic = parseFloat(value as string) || 0
        updated.pf = Math.round(basic * 0.12)
        updated.pfEmployer = Math.round(basic * 0.12)
      }
      // Auto-calc ESIC from gross
      if (field === 'basicPay' || field === 'hra' || field === 'specialAllowance' || field === 'otherAllowance' || field === 'conveyanceAllowance' || field === 'medicalAllowance') {
        const gross = updated.basicPay + updated.hra + updated.specialAllowance + updated.otherAllowance + updated.conveyanceAllowance + updated.medicalAllowance
        updated.esic = gross <= 21000 ? Math.round(gross * 0.0075) : 0
        updated.esicEmployer = gross <= 21000 ? Math.round(gross * 0.0325) : 0
      }
      return updated
    })
  }

  async function saveSalary() {
    if (!editModal) return
    setSaving(true)
    const gross = salaryDetails.basicPay + salaryDetails.hra + salaryDetails.medicalAllowance + salaryDetails.conveyanceAllowance + salaryDetails.specialAllowance + salaryDetails.otherAllowance + salaryDetails.bonus
    try {
      const res = await fetch('/api/salary-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: editModal.id,
          ...salaryDetails,
        }),
      })
      if (res.ok) {
        showMessage(`Salary structure saved for ${editModal.name}`, 'success')
        setEditModal(null)
        fetchEmployees()
      } else {
        showMessage('Failed to save salary', 'error')
      }
    } catch {
      showMessage('Failed to save salary', 'error')
    }
    setSaving(false)
  }

  const filtered = employees.filter(e =>
    !search ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.empCode.toLowerCase().includes(search.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(search.toLowerCase())
  )

  const gross = salaryDetails.basicPay + salaryDetails.hra + salaryDetails.medicalAllowance + salaryDetails.conveyanceAllowance + salaryDetails.specialAllowance + salaryDetails.otherAllowance + salaryDetails.bonus
  const totalDeductions = salaryDetails.pf + salaryDetails.esic + salaryDetails.tds + salaryDetails.professionalTax + salaryDetails.otherDeduction
  const netSalary = gross - totalDeductions

  const inputStyle = {
    width: '100%', height: '34px', padding: '0 10px',
    border: '0.5px solid #e2e8f0', borderRadius: '6px',
    fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a',
  }

  const labelStyle = {
    display: 'block' as const, fontSize: '11px', fontWeight: '500' as const,
    color: '#475569', marginBottom: '3px',
  }

  const sectionHead = {
    fontSize: '12px', fontWeight: '600' as const, color: '#0f172a',
    borderBottom: '0.5px solid #e2e8f0', paddingBottom: '6px', marginBottom: '10px', marginTop: '16px',
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Salary structure</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          Define complete salary components for each active employee
        </p>
      </div>

      {message.text && (
        <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#16a34a' : '#dc2626', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      {/* Search */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px' }}>
        <input
          placeholder="Search employee by name, ID, department..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, width: '300px' }}
        />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Emp ID', 'Employee', 'Designation', 'Department', 'Gross salary', 'PF', 'ESIC', 'Net salary', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading active employees...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No active employees found</td></tr>
            ) : filtered.map(emp => {
              const s = emp.salary || 0
              const basic = Math.round(s * 0.40)
              const pfAmt = Math.round(basic * 0.12)
              const esicAmt = s <= 21000 ? Math.round(s * 0.0075) : 0
              const net = s - pfAmt - esicAmt - 200  // 200 = prof tax
              return (
                <tr key={emp.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '12px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                    {emp.empCode}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e6f1fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#185fa5' }}>
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{emp.name}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#475569' }}>{emp.designation || '—'}</td>
                  <td style={{ padding: '12px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#475569' }}>{emp.department || '—'}</td>
                  <td style={{ padding: '12px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: s > 0 ? '#0f172a' : '#94a3b8' }}>
                    {s > 0 ? formatCurrency(s) : 'Not set'}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#dc2626' }}>
                    {s > 0 ? formatCurrency(pfAmt) : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#dc2626' }}>
                    {s > 0 && s <= 21000 ? formatCurrency(esicAmt) : s > 21000 ? <span style={{ fontSize: '10px', color: '#94a3b8' }}>Not applicable</span> : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>
                    {s > 0 ? formatCurrency(net) : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <button onClick={() => openEdit(emp)} style={{ padding: '5px 12px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '11px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}>
                      ✏ Edit structure
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '760px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

            {/* Modal header */}
            <div style={{ padding: '20px 24px', borderBottom: '0.5px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky' as const, top: 0, background: '#fff', zIndex: 1 }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>Salary structure — {editModal.name}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>{editModal.empCode} · {editModal.designation || 'No designation'}</div>
              </div>
              <button onClick={() => setEditModal(null)} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '20px 24px' }}>

              {/* Live summary bar */}
              <div style={{ background: '#f0f7ff', border: '0.5px solid #bfdbfe', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Gross salary', value: formatCurrency(gross), color: '#185fa5' },
                  { label: 'Total deductions', value: formatCurrency(totalDeductions), color: '#dc2626' },
                  { label: 'Employer cost', value: formatCurrency(gross + salaryDetails.pfEmployer + salaryDetails.esicEmployer), color: '#854f0b' },
                  { label: 'Net take-home', value: formatCurrency(netSalary), color: '#16a34a' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' as const }}>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>{s.label}</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                {/* LEFT — Earnings */}
                <div>
                  <div style={sectionHead}>💰 Earnings</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { label: 'Basic pay *', field: 'basicPay', hint: '40% of CTC recommended' },
                      { label: 'HRA', field: 'hra', hint: '50% of basic (metro)' },
                      { label: 'Medical allowance', field: 'medicalAllowance', hint: 'Standard ₹1,250/month' },
                      { label: 'Conveyance allowance', field: 'conveyanceAllowance', hint: 'Standard ₹1,600/month' },
                      { label: 'Special allowance', field: 'specialAllowance', hint: 'Balancing figure' },
                      { label: 'Other allowance', field: 'otherAllowance', hint: '' },
                      { label: 'Bonus / incentive', field: 'bonus', hint: 'Monthly bonus if any' },
                    ].map(f => (
                      <div key={f.field}>
                        <label style={labelStyle}>{f.label}</label>
                        <input
                          type="number"
                          value={(salaryDetails as Record<string, number | string>)[f.field] as number}
                          onChange={e => handleSalaryChange(f.field as keyof SalaryDetails, e.target.value)}
                          style={inputStyle}
                        />
                        {f.hint && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{f.hint}</div>}
                      </div>
                    ))}
                  </div>

                  <div style={sectionHead}>🏦 Bank details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { label: 'Bank name', field: 'bankName', placeholder: 'e.g. SBI, HDFC, ICICI' },
                      { label: 'Account number', field: 'accountNo', placeholder: 'Bank account number' },
                      { label: 'IFSC code', field: 'ifscCode', placeholder: 'e.g. SBIN0001234' },
                      { label: 'Branch name', field: 'bankBranch', placeholder: 'Branch name' },
                    ].map(f => (
                      <div key={f.field}>
                        <label style={labelStyle}>{f.label}</label>
                        <input
                          type="text"
                          value={(salaryDetails as Record<string, number | string>)[f.field] as string}
                          onChange={e => handleSalaryChange(f.field as keyof SalaryDetails, e.target.value)}
                          placeholder={f.placeholder}
                          style={inputStyle}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* RIGHT — Deductions + ID */}
                <div>
                  <div style={sectionHead}>➖ Deductions</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { label: 'PF (Employee 12%)', field: 'pf', hint: 'Auto from basic' },
                      { label: 'PF (Employer 12%)', field: 'pfEmployer', hint: 'Employer contribution' },
                      { label: 'ESIC (Employee 0.75%)', field: 'esic', hint: 'If salary ≤ ₹21,000' },
                      { label: 'ESIC (Employer 3.25%)', field: 'esicEmployer', hint: 'Employer contribution' },
                      { label: 'TDS / Income tax', field: 'tds', hint: 'Monthly TDS amount' },
                      { label: 'Professional tax', field: 'professionalTax', hint: 'Max ₹200/month' },
                      { label: 'Other deduction', field: 'otherDeduction', hint: 'Advance, loan, etc.' },
                    ].map(f => (
                      <div key={f.field}>
                        <label style={labelStyle}>{f.label}</label>
                        <input
                          type="number"
                          value={(salaryDetails as Record<string, number | string>)[f.field] as number}
                          onChange={e => handleSalaryChange(f.field as keyof SalaryDetails, e.target.value)}
                          style={inputStyle}
                        />
                        {f.hint && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{f.hint}</div>}
                      </div>
                    ))}
                  </div>

                  <div style={sectionHead}>🪪 Statutory ID details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { label: 'Aadhaar number', field: 'aadhaar', placeholder: 'XXXX XXXX XXXX' },
                      { label: 'PAN card', field: 'panCard', placeholder: 'ABCDE1234F' },
                      { label: 'UAN number (PF)', field: 'uanNo', placeholder: 'Universal Account No' },
                      { label: 'ESIC number', field: 'esicNo', placeholder: 'ESIC insurance number' },
                    ].map(f => (
                      <div key={f.field}>
                        <label style={labelStyle}>{f.label}</label>
                        <input
                          type="text"
                          value={(salaryDetails as Record<string, number | string>)[f.field] as string}
                          onChange={e => handleSalaryChange(f.field as keyof SalaryDetails, e.target.value)}
                          placeholder={f.placeholder}
                          style={inputStyle}
                        />
                      </div>
                    ))}
                  </div>

                  {/* PF/ESIC applicability note */}
                  <div style={{ background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', marginTop: '16px', fontSize: '11px', color: '#64748b' }}>
                    <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>📋 Indian statutory notes</div>
                    <div>• PF applicable if basic ≥ ₹15,000 (mandatory)</div>
                    <div>• ESIC applicable if gross ≤ ₹21,000/month</div>
                    <div>• Professional tax varies by state (max ₹200/month)</div>
                    <div>• TDS as per income tax slab + Section 80C declarations</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '0.5px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f8fafc', borderRadius: '0 0 12px 12px' }}>
              <button onClick={() => setEditModal(null)} style={{ padding: '9px 20px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={saveSalary} disabled={saving} style={{ padding: '9px 24px', background: saving ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : '💾 Save salary structure'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}