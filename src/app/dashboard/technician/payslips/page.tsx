'use client'
import { useState, useEffect } from 'react'

type Payslip = {
  id: string; month: string; year: number
  basicSalary: number; allowances: number; deductions: number; netSalary: number
  pf: number; status: string; createdAt: string
}

const statusColor: Record<string, { bg: string; color: string }> = {
  draft:    { bg: '#f1f5f9', color: '#475569' },
  approved: { bg: '#e6f1fb', color: '#185fa5' },
  released: { bg: '#eaf3de', color: '#3b6d11' },
  held:     { bg: '#fef2f2', color: '#dc2626' },
}

export default function MyPayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)
  const [viewSlip, setViewSlip] = useState<Payslip | null>(null)

  useEffect(() => {
    fetch('/api/payslips/mine')
      .then(r => r.json())
      .then(d => { setPayslips(d.payslips || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function printSlip(slip: Payslip) {
    const w = window.open('', '_blank', 'width=800,height=600')
    if (!w) return
    w.document.write(`<html><head><title>Payslip ${slip.month} ${slip.year}</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px}table{border-collapse:collapse;width:100%}td,th{padding:8px;border:1px solid #e2e8f0}@page{size:A4;margin:15mm}</style>
    </head><body>
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:18px;font-weight:700">SALARY SLIP</div>
      <div style="font-size:13px;color:#555">${slip.month} ${slip.year}</div>
    </div>
    <table style="margin-bottom:14px">
      <tr><td style="font-weight:600;width:50%">Basic salary</td><td>₹ ${slip.basicSalary.toLocaleString('en-IN')}</td></tr>
      <tr><td style="font-weight:600">Allowances</td><td>₹ ${slip.allowances.toLocaleString('en-IN')}</td></tr>
      <tr><td style="font-weight:600">Gross salary</td><td style="font-weight:600">₹ ${(slip.basicSalary + slip.allowances).toLocaleString('en-IN')}</td></tr>
      <tr><td style="font-weight:600">PF deduction</td><td>₹ ${slip.pf.toLocaleString('en-IN')}</td></tr>
      <tr><td style="font-weight:600">Other deductions</td><td>₹ ${(slip.deductions - slip.pf).toLocaleString('en-IN')}</td></tr>
      <tr style="background:#eaf3de"><td style="font-weight:700;font-size:14px">Net salary</td><td style="font-weight:700;font-size:14px;color:#16a34a">₹ ${slip.netSalary.toLocaleString('en-IN')}</td></tr>
    </table>
    </body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 400)
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>My payslips</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Your monthly salary statements</p>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading payslips...</div>
      ) : payslips.length === 0 ? (
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
          No payslips available yet. Contact HR if you think this is incorrect.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Period', 'Basic', 'Allowances', 'Deductions', 'Net salary', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#64748b', borderBottom: '0.5px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payslips.map(slip => {
                const sc = statusColor[slip.status] || statusColor.draft
                return (
                  <tr key={slip.id} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{slip.month} {slip.year}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#475569' }}>₹{slip.basicSalary.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#475569' }}>₹{slip.allowances.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px', color: '#dc2626' }}>₹{slip.deductions.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '14px', fontWeight: '700', color: '#16a34a' }}>₹{slip.netSalary.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                      <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500', textTransform: 'capitalize' }}>{slip.status}</span>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setViewSlip(slip)} style={{ padding: '4px 8px', border: '0.5px solid #e2e8f0', borderRadius: '5px', fontSize: '11px', color: '#475569', background: '#f8fafc', cursor: 'pointer' }}>View</button>
                        {slip.status === 'released' && (
                          <button onClick={() => printSlip(slip)} style={{ padding: '4px 8px', border: '0.5px solid #bfdbfe', borderRadius: '5px', fontSize: '11px', color: '#1a56db', background: '#eff6ff', cursor: 'pointer' }}>🖨 Print</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* View modal */}
      {viewSlip && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>Salary slip — {viewSlip.month} {viewSlip.year}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', textTransform: 'capitalize' }}>Status: {viewSlip.status}</div>
              </div>
              <button onClick={() => setViewSlip(null)} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>
            {[
              { label: 'Basic salary', value: `₹${viewSlip.basicSalary.toLocaleString('en-IN')}` },
              { label: 'Allowances', value: `₹${viewSlip.allowances.toLocaleString('en-IN')}` },
              { label: 'Gross salary', value: `₹${(viewSlip.basicSalary + viewSlip.allowances).toLocaleString('en-IN')}`, bold: true },
              { label: 'PF deduction', value: `₹${viewSlip.pf.toLocaleString('en-IN')}`, red: true },
              { label: 'Other deductions', value: `₹${(viewSlip.deductions - viewSlip.pf).toLocaleString('en-IN')}`, red: true },
              { label: 'Net salary', value: `₹${viewSlip.netSalary.toLocaleString('en-IN')}`, bold: true, green: true },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '0.5px solid #f1f5f9', fontSize: '13px' }}>
                <span style={{ color: '#475569', fontWeight: f.bold ? '600' : '400' }}>{f.label}</span>
                <span style={{ fontWeight: f.bold ? '700' : '500', color: f.green ? '#16a34a' : f.red ? '#dc2626' : '#0f172a' }}>{f.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              {viewSlip.status === 'released' && (
                <button onClick={() => { printSlip(viewSlip); setViewSlip(null) }} style={{ flex: 1, padding: '9px', background: '#1a56db', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', cursor: 'pointer' }}>🖨 Print slip</button>
              )}
              <button onClick={() => setViewSlip(null)} style={{ flex: 1, padding: '9px', border: '0.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}