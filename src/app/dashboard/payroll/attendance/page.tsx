'use client'
import { useState, useEffect, useCallback } from 'react'

type Employee = { id: string; empCode: string; name: string; designation: string | null; department: string | null }
type AttendanceRecord = {
  id?: string
  employeeId: string
  month: string
  year: number
  totalDays: number
  presentDays: number
  absentDays: number
  halfDays: number
  overtimeHours: number
  leaveDays: number
}

const months = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function AttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({})

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(months[now.getMonth()])
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()))

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [empRes, attRes] = await Promise.all([
        fetch('/api/employees?limit=200'),
        fetch(`/api/attendance?month=${selectedMonth}&year=${selectedYear}`),
      ])
      const empData = await empRes.json()
      const attData = await attRes.json()

      const emps: Employee[] = empData.employees || []
      setEmployees(emps)

      // Build attendance map
      const attMap: Record<string, AttendanceRecord> = {}
      // Init defaults for all employees
      emps.forEach(e => {
        attMap[e.id] = {
          employeeId: e.id,
          month: selectedMonth,
          year: parseInt(selectedYear),
          totalDays: 26,
          presentDays: 26,
          absentDays: 0,
          halfDays: 0,
          overtimeHours: 0,
          leaveDays: 0,
        }
      })
      // Overlay saved records
      ;(attData.attendance || []).forEach((a: AttendanceRecord & { id: string }) => {
        attMap[a.employeeId] = { ...a }
      })
      setAttendance(attMap)
    } catch { /* ignore */ }
    setLoading(false)
  }, [selectedMonth, selectedYear])

  useEffect(() => { fetchData() }, [fetchData])

  function showMsg(text: string, type: 'success' | 'error') {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  function updateField(empId: string, field: keyof AttendanceRecord, value: number) {
    setAttendance(prev => {
      const rec = { ...prev[empId], [field]: value }
      // Auto-calculate absent days
      if (field === 'presentDays' || field === 'halfDays' || field === 'leaveDays') {
        rec.absentDays = Math.max(0, rec.totalDays - rec.presentDays - rec.halfDays * 0.5 - rec.leaveDays)
      }
      return { ...prev, [empId]: rec }
    })
  }

  async function saveAttendance(empId: string) {
    setSaving(empId)
    const rec = attendance[empId]
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rec),
      })
      if (res.ok) showMsg(`Attendance saved for ${employees.find(e => e.id === empId)?.name}`, 'success')
      else showMsg('Failed to save', 'error')
    } catch {
      showMsg('Failed to save attendance', 'error')
    }
    setSaving(null)
  }

  async function saveAll() {
    setSaving('all')
    let saved = 0
    for (const empId of Object.keys(attendance)) {
      const rec = attendance[empId]
      try {
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rec),
        })
        if (res.ok) saved++
      } catch { /* ignore */ }
    }
    showMsg(`Attendance saved for ${saved} employees`, 'success')
    setSaving(null)
  }

  const selectStyle = {
    height: '36px', padding: '0 10px', border: '0.5px solid #e2e8f0',
    borderRadius: '6px', fontSize: '13px', color: '#475569', background: '#fff', outline: 'none',
  }

  const numInput = {
    width: '60px', height: '32px', padding: '0 6px', border: '0.5px solid #e2e8f0',
    borderRadius: '5px', fontSize: '13px', outline: 'none', background: '#fff',
    textAlign: 'center' as const,
  }

  const totalPresent = Object.values(attendance).reduce((s, a) => s + a.presentDays, 0)
  const totalAbsent = Object.values(attendance).reduce((s, a) => s + a.absentDays, 0)

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>Attendance</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          Mark monthly attendance — affects salary calculation when payroll is run
        </p>
      </div>

      {message.text && (
        <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `0.5px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#16a34a' : '#dc2626', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {message.text}
        </div>
      )}

      {/* Info box */}
      <div style={{ background: '#f0f7ff', border: '0.5px solid #bfdbfe', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '12px', color: '#185fa5' }}>
        💡 <strong>How attendance affects salary:</strong> Salary = (Gross / Working days) × Effective days. Effective days = Present + (Half days × 0.5) + Leave days. Fill attendance before running payroll.
      </div>

      {/* Controls */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={selectStyle}>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={selectStyle}>
            {[2024, 2025, 2026].map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {employees.length} employees · Avg present: {employees.length > 0 ? (totalPresent / employees.length).toFixed(1) : 0} days · Total absent: {totalAbsent} days
          </div>
        </div>
        <button
          onClick={saveAll}
          disabled={saving === 'all' || loading}
          style={{ padding: '9px 20px', background: saving === 'all' ? '#93c5fd' : '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: saving === 'all' ? 'not-allowed' : 'pointer' }}
        >
          {saving === 'all' ? '⏳ Saving...' : '💾 Save all attendance'}
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Employee</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Working days</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '500', color: '#16a34a', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Present ✓</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '500', color: '#92400e', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Half days</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '500', color: '#185fa5', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Leave</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '500', color: '#dc2626', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Absent ✗</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '500', color: '#534ab7', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>OT hours</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Effective</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading...</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No employees found</td></tr>
            ) : employees.map(emp => {
              const a = attendance[emp.id] || { totalDays: 26, presentDays: 26, absentDays: 0, halfDays: 0, overtimeHours: 0, leaveDays: 0 }
              const effective = a.presentDays + (a.halfDays * 0.5) + a.leaveDays
              const effectivePct = Math.round((effective / a.totalDays) * 100)
              return (
                <tr key={emp.id} style={{ borderBottom: '0.5px solid #f1f5f9' }} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e6f1fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#185fa5', flexShrink: 0 }}>
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{emp.name}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{emp.empCode} · {emp.department || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' as const }}>
                    <input type="number" value={a.totalDays} min={1} max={31} onChange={e => updateField(emp.id, 'totalDays', parseInt(e.target.value) || 26)} style={numInput} />
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' as const }}>
                    <input type="number" value={a.presentDays} min={0} max={a.totalDays} onChange={e => updateField(emp.id, 'presentDays', parseFloat(e.target.value) || 0)} style={{ ...numInput, borderColor: '#bbf7d0', background: '#f0fdf4' }} />
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' as const }}>
                    <input type="number" value={a.halfDays} min={0} max={a.totalDays} onChange={e => updateField(emp.id, 'halfDays', parseFloat(e.target.value) || 0)} style={{ ...numInput, borderColor: '#fde68a', background: '#fffbeb' }} />
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' as const }}>
                    <input type="number" value={a.leaveDays} min={0} max={a.totalDays} onChange={e => updateField(emp.id, 'leaveDays', parseFloat(e.target.value) || 0)} style={{ ...numInput, borderColor: '#bfdbfe', background: '#eff6ff' }} />
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' as const }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: a.absentDays > 0 ? '#dc2626' : '#94a3b8' }}>
                      {a.absentDays.toFixed(1)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' as const }}>
                    <input type="number" value={a.overtimeHours} min={0} onChange={e => updateField(emp.id, 'overtimeHours', parseFloat(e.target.value) || 0)} style={{ ...numInput, borderColor: '#ddd6fe', background: '#f5f3ff' }} />
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' as const }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: effectivePct >= 90 ? '#16a34a' : effectivePct >= 75 ? '#92400e' : '#dc2626' }}>
                        {effective.toFixed(1)}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{effectivePct}%</div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button
                      onClick={() => saveAttendance(emp.id)}
                      disabled={saving === emp.id}
                      style={{ padding: '4px 10px', border: '0.5px solid #bbf7d0', borderRadius: '5px', fontSize: '11px', color: '#16a34a', background: '#f0fdf4', cursor: saving === emp.id ? 'not-allowed' : 'pointer' }}
                    >
                      {saving === emp.id ? '...' : 'Save'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '11px', color: '#64748b' }}>
        <span>🟢 Green = Present days</span>
        <span>🟡 Yellow = Half days (counts as 0.5)</span>
        <span>🔵 Blue = Paid leave (counts as full day)</span>
        <span>🔴 Red = Absent (auto-calculated)</span>
        <span>🟣 Purple = Overtime hours</span>
      </div>
    </div>
  )
}