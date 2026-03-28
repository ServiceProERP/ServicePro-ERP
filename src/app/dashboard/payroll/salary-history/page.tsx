'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'

type Employee = { id: string; empCode: string; name: string; designation: string | null; department: string | null; salary: number }
type Payslip = { month: string; year: number; basicSalary: number; allowances: number; deductions: number; netSalary: number; status: string }

type SalaryHistory = {
  emp: Employee
  payslips: Payslip[]
  currentSalary: number
  lowestSalary: number
  highestSalary: number
  avgSalary: number
}

const months = ['January','February','March','April','May','June','July','August','September','October','November','December']

const statusColors: Record<string, { bg: string; color: string }> = {
  draft:    { bg: '#f1f5f9', color: '#475569' },
  approved: { bg: '#e6f1fb', color: '#185fa5' },
  paid:     { bg: '#eaf3de', color: '#3b6d11' },
  held:     { bg: '#faeeda', color: '#854f0b' },
}

export default function SalaryHistoryPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [histories, setHistories] = useState<SalaryHistory[]>([])
  const [generating, setGenerating] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState<SalaryHistory | null>(null)
  const [search, setSearch] = useState('')

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/employees?limit=200')
      const data = await res.json()
      setEmployees(data.employees || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  async function loadAllHistories() {
    setGenerating(true)
    const results: SalaryHistory[] = []
    for (const emp of employees) {
      const res = await fetch(`/api/payslips?employeeId=${emp.id}`)
      if (!res.ok) continue
      const data = await res.json()
      const payslips: Payslip[] = data.payslips || []
      if (payslips.length === 0) continue
      const salaries = payslips.map(p => p.basicSalary + p.allowances)
      results.push({
        emp,
        payslips,
        currentSalary: emp.salary,
        lowestSalary: Math.min(...salaries),
        highestSalary: Math.max(...salaries),
        avgSalary: Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length),
      })
    }
    setHistories(results)
    setGenerating(false)
  }

  const filtered = histories.filter(h =>
    !search ||
    h.emp.name.toLowerCase().includes(search.toLowerCase()) ||
    h.emp.empCode.toLowerCase().includes(search.toLowerCase())
  )

  const inputStyle = {
    height: '36px', padding: '0 10px', border: '0.5px solid #e2e8f0',
    borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#fff', color: '#0f172a',
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Salary revision history</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          View complete salary history and revisions for all employees
        </p>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input
          placeholder="Search employee..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, width: '240px' }}
        />
        <button
          onClick={loadAllHistories}
          disabled={generating || loading}
          style={{ padding: '9px 20px', background: generating ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: generating ? 'not-allowed' : 'pointer' }}
        >
          {generating ? '⏳ Loading...' : '📊 Load salary history'}
        </button>
      </div>

      {histories.length === 0 && !generating ? (
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          Click "Load salary history" to view salary revisions for all employees
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedEmp ? '1fr 420px' : '1fr', gap: '16px' }}>

          {/* Summary table */}
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Employee', 'Emp ID', 'Payslips', 'Lowest salary', 'Highest salary', 'Avg salary', 'Current salary', ''].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No history found</td></tr>
                ) : filtered.map((h, i) => (
                  <tr
                    key={i}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = selectedEmp?.emp.id === h.emp.id ? '#f0f7ff' : 'transparent')}
                    style={{ background: selectedEmp?.emp.id === h.emp.id ? '#f0f7ff' : 'transparent', cursor: 'pointer' }}
                    onClick={() => setSelectedEmp(selectedEmp?.emp.id === h.emp.id ? null : h)}
                  >
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e6f1fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#185fa5' }}>
                          {h.emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{h.emp.name}</div>
                          <div style={{ fontSize: '10px', color: '#94a3b8' }}>{h.emp.designation || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{h.emp.empCode}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#475569', textAlign: 'center' as const }}>{h.payslips.length}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#dc2626' }}>{formatCurrency(h.lowestSalary)}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#16a34a' }}>{formatCurrency(h.highestSalary)}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#475569' }}>{formatCurrency(h.avgSalary)}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{formatCurrency(h.currentSalary)}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                      <span style={{ fontSize: '11px', color: '#1a56db', cursor: 'pointer' }}>
                        {selectedEmp?.emp.id === h.emp.id ? 'Hide ▲' : 'View ▼'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail panel */}
          {selectedEmp && (
            <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '16px', height: 'fit-content' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '0.5px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{selectedEmp.emp.name}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>{selectedEmp.emp.empCode} · {selectedEmp.emp.designation || 'No designation'}</div>
                </div>
                <button onClick={() => setSelectedEmp(null)} style={{ background: 'none', border: 'none', fontSize: '16px', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
              </div>

              {/* Month by month */}
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Month-by-month history</div>
              {[...selectedEmp.payslips].sort((a, b) => {
                if (b.year !== a.year) return b.year - a.year
                return months.indexOf(b.month) - months.indexOf(a.month)
              }).map((p, i, arr) => {
                const gross = p.basicSalary + p.allowances
                const prev = arr[i + 1]
                const prevGross = prev ? prev.basicSalary + prev.allowances : null
                const change = prevGross ? gross - prevGross : null
                const sc = statusColors[p.status] || statusColors.draft
                return (
                  <div key={i} style={{ padding: '10px 0', borderBottom: '0.5px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{p.month} {p.year}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                        Basic: {formatCurrency(p.basicSalary)} + Allow: {formatCurrency(p.allowances)}
                      </div>
                      {change !== null && change !== 0 && (
                        <div style={{ fontSize: '10px', marginTop: '2px', color: change > 0 ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                          {change > 0 ? '▲' : '▼'} {formatCurrency(Math.abs(change))} vs prev month
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' as const }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{formatCurrency(p.netSalary)}</div>
                      <span style={{ background: sc.bg, color: sc.color, padding: '1px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: '500' }}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}