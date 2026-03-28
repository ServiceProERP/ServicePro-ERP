'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'

type Invoice = {
  id: string
  invoiceNo: string
  invoiceDate: string
  status: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  additionalTax: number
  serviceCharges: number
  visitingCharges: number
  additionalChargesDesc: string | null
  totalAmount: number
  dueDate: string | null
  notes: string | null
  bankName: string | null
  accountNo: string | null
  ifscCode: string | null
  upiId: string | null
  termsConditions: string | null
  client: {
    companyName: string
    contactPerson: string
    phone: string
    email: string | null
    address: string | null
    gstin: string | null
    city: string | null
    state: string | null
    postalCode: string | null
  }
  job: { jobNo: string; jobTitle: string } | null
  payments: { amount: number; paymentDate: string; paymentMode: string }[]
}

type CompanyConfig = {
  companyName: string
  companyTagline: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  companyGstin: string
}

export default function PrintInvoicePage() {
  const params = useParams()
  const id = params.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [company, setCompany] = useState<CompanyConfig>({
    companyName: '',
    companyTagline: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyGstin: '',
  })
  const [loading, setLoading] = useState(true)
  const [showQR, setShowQR] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      try {
        const [invRes, settingsRes] = await Promise.all([
          fetch(`/api/invoices/${id}`),
          fetch('/api/settings'),
        ])
        const invData = await invRes.json()
        const settingsData = await settingsRes.json()
        setInvoice(invData.invoice)
        if (settingsData.config) {
          setCompany({
            companyName: settingsData.config.companyName || 'Your Company Name',
            companyTagline: settingsData.config.companyTagline || 'Professional Service Management',
            companyAddress: settingsData.config.companyAddress || '',
            companyPhone: settingsData.config.companyPhone || '',
            companyEmail: settingsData.config.companyEmail || '',
            companyGstin: settingsData.config.companyGstin || '',
          })
        }
      } catch (err) {
        console.error(err)
      }
      setLoading(false)
    }
    if (id) fetchAll()
  }, [id])

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
      Preparing invoice...
    </div>
  )

  if (!invoice) return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#dc2626' }}>
      Invoice not found.
    </div>
  )

  const totalPaid = invoice.payments.reduce((s, p) => s + p.amount, 0)
  const remaining = Math.max(0, invoice.totalAmount - totalPaid)

  const upiQRUrl = invoice.upiId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
        `upi://pay?pa=${invoice.upiId}&pn=${encodeURIComponent(company.companyName)}&am=${invoice.totalAmount}&cu=INR&tn=Invoice ${invoice.invoiceNo}`
      )}`
    : null

  const amountInWords = (amount: number): string => {
    const ones = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
    ]
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    if (amount === 0) return 'Zero'
    const numToWords = (n: number): string => {
      if (n < 20) return ones[n]
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '')
      if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '')
      if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '')
      return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '')
    }
    const intPart = Math.floor(amount)
    const decPart = Math.round((amount - intPart) * 100)
    let result = 'Rupees ' + numToWords(intPart)
    if (decPart > 0) result += ' and ' + numToWords(decPart) + ' Paise'
    return result + ' Only'
  }

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .invoice-print-area, .invoice-print-area * { visibility: visible; }
          .invoice-print-area {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .no-print { display: none !important; }
        }
        @page { margin: 8mm; size: A4; }
      `}</style>

      {/* Controls — hidden on print */}
      <div
        className="no-print"
        style={{
          padding: '14px 24px',
          background: '#f8fafc',
          borderBottom: '0.5px solid #e2e8f0',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => window.print()}
          style={{ padding: '9px 20px', background: '#1a56db', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}
        >
          🖨️ Print / Save as PDF
        </button>
        <button
          onClick={() => window.history.back()}
          style={{ padding: '9px 16px', border: '0.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', background: '#fff', cursor: 'pointer' }}
        >
          ← Back
        </button>
        {invoice.upiId && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer', padding: '6px 12px', border: '0.5px solid #e2e8f0', borderRadius: '7px', background: '#fff' }}>
            <input
              type="checkbox"
              checked={showQR}
              onChange={e => setShowQR(e.target.checked)}
            />
            Print payment QR code
          </label>
        )}
        {!invoice.upiId && (
          <div style={{ fontSize: '12px', color: '#f59e0b', background: '#fffbeb', padding: '6px 12px', borderRadius: '7px', border: '0.5px solid #fde68a' }}>
            ⚠️ No UPI ID on this invoice — QR not available. Add UPI in invoice settings to enable.
          </div>
        )}
        {(!company.companyName || company.companyName === 'Your Company Name') && (
          <div style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', padding: '6px 12px', borderRadius: '7px', border: '0.5px solid #fecaca' }}>
            ⚠️ Company details not set — go to Settings → System config to add your company name, address and phone.
          </div>
        )}
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
          Browser → Print → Save as PDF for digital copy
        </span>
      </div>

      {/* Invoice — this is what gets printed */}
      <div
        className="invoice-print-area"
        style={{
          maxWidth: '794px',
          margin: '20px auto',
          background: '#fff',
          padding: '36px 40px',
          fontFamily: "'Segoe UI', Arial, sans-serif",
          fontSize: '13px',
          color: '#0f172a',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          borderRadius: '4px',
        }}
      >

        {/* Header — Company on left, TAX INVOICE on right */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '20px', borderBottom: '2px solid #1a56db' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#1a56db', marginBottom: '3px' }}>
              {company.companyName || 'Your Company Name'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
              {company.companyTagline}
            </div>
            <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.8' }}>
              {company.companyAddress && <div>{company.companyAddress}</div>}
              {company.companyPhone && <div>📞 {company.companyPhone}{company.companyEmail ? ` · ✉ ${company.companyEmail}` : ''}</div>}
              {company.companyGstin && <div>GSTIN: {company.companyGstin}</div>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', letterSpacing: '1px', marginBottom: '6px' }}>
              TAX INVOICE
            </div>
            <div style={{ background: '#1a56db', color: '#fff', padding: '4px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', display: 'inline-block', marginBottom: '6px' }}>
              {invoice.invoiceNo}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Date: <strong>{formatDate(invoice.invoiceDate)}</strong>
            </div>
            {invoice.dueDate && (
              <div style={{ fontSize: '12px', color: remaining > 0 ? '#dc2626' : '#64748b' }}>
                Due: <strong>{formatDate(invoice.dueDate)}</strong>
              </div>
            )}
            <div style={{ marginTop: '6px' }}>
              <span style={{
                background: invoice.status === 'paid' ? '#eaf3de' : invoice.status === 'partial' ? '#faeeda' : '#fcebeb',
                color: invoice.status === 'paid' ? '#3b6d11' : invoice.status === 'partial' ? '#854f0b' : '#a32d2d',
                padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
              }}>
                {invoice.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Bill To + Job Reference */}
        <div style={{ display: 'grid', gridTemplateColumns: invoice.job ? '1fr 1fr' : '1fr', gap: '24px', marginBottom: '24px' }}>
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '14px 16px', border: '0.5px solid #e2e8f0' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
              Bill To
            </div>
            <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a', marginBottom: '6px' }}>
              {invoice.client.companyName}
            </div>
            <div style={{ color: '#475569', lineHeight: '1.7', fontSize: '12px' }}>
              <div>Contact: {invoice.client.contactPerson}</div>
              <div>📞 {invoice.client.phone}</div>
              {invoice.client.email && <div>✉ {invoice.client.email}</div>}
              {invoice.client.address && <div>{invoice.client.address}</div>}
              {invoice.client.city && (
                <div>
                  {invoice.client.city}
                  {invoice.client.state ? `, ${invoice.client.state}` : ''}
                  {invoice.client.postalCode ? ` — ${invoice.client.postalCode}` : ''}
                </div>
              )}
            </div>
            {invoice.client.gstin && (
              <div style={{ marginTop: '6px', fontSize: '11px', background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '4px', padding: '4px 8px', display: 'inline-block' }}>
                GSTIN: <strong>{invoice.client.gstin}</strong>
              </div>
            )}
          </div>

          {invoice.job && (
            <div style={{ background: '#f0f7ff', borderRadius: '8px', padding: '14px 16px', border: '0.5px solid #bfdbfe' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#185fa5', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                Job Reference
              </div>
              <div style={{ fontWeight: '600', color: '#1a56db', fontSize: '14px' }}>
                {invoice.job.jobNo}
              </div>
              <div style={{ color: '#475569', marginTop: '4px', fontSize: '12px' }}>
                {invoice.job.jobTitle}
              </div>
            </div>
          )}
        </div>

        {/* Services Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
          <thead>
            <tr style={{ background: '#1a56db' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', color: '#fff', fontSize: '12px', fontWeight: '600', width: '40px' }}>#</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', color: '#fff', fontSize: '12px', fontWeight: '600' }}>Description</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', color: '#fff', fontSize: '12px', fontWeight: '600' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: '#f8fafc' }}>
              <td style={{ padding: '10px 14px', borderBottom: '0.5px solid #e2e8f0', fontSize: '12px' }}>1</td>
              <td style={{ padding: '10px 14px', borderBottom: '0.5px solid #e2e8f0' }}>
                <div style={{ fontWeight: '500' }}>
                  Services rendered{invoice.job ? ` — ${invoice.job.jobTitle}` : ''}
                </div>
              </td>
              <td style={{ padding: '10px 14px', borderBottom: '0.5px solid #e2e8f0', textAlign: 'right', fontWeight: '500' }}>
                {formatCurrency(invoice.subtotal)}
              </td>
            </tr>
            {(invoice.serviceCharges ?? 0) > 0 && (
              <tr>
                <td style={{ padding: '8px 14px', borderBottom: '0.5px solid #e2e8f0', fontSize: '12px' }}>2</td>
                <td style={{ padding: '8px 14px', borderBottom: '0.5px solid #e2e8f0', fontSize: '12px' }}>
                  Service charges
                </td>
                <td style={{ padding: '8px 14px', borderBottom: '0.5px solid #e2e8f0', textAlign: 'right', fontSize: '12px' }}>
                  {formatCurrency(invoice.serviceCharges ?? 0)}
                </td>
              </tr>
            )}
            {(invoice.visitingCharges ?? 0) > 0 && (
              <tr>
                <td style={{ padding: '8px 14px', borderBottom: '0.5px solid #e2e8f0', fontSize: '12px' }}>
                  {(invoice.serviceCharges ?? 0) > 0 ? '3' : '2'}
                </td>
                <td style={{ padding: '8px 14px', borderBottom: '0.5px solid #e2e8f0', fontSize: '12px' }}>
                  Visiting / site charges
                </td>
                <td style={{ padding: '8px 14px', borderBottom: '0.5px solid #e2e8f0', textAlign: 'right', fontSize: '12px' }}>
                  {formatCurrency(invoice.visitingCharges ?? 0)}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals + QR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '24px' }}>

          {showQR && upiQRUrl && (
            <div style={{ border: '0.5px solid #e2e8f0', borderRadius: '8px', padding: '12px', textAlign: 'center', minWidth: '130px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Scan to pay
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={upiQRUrl}
                alt="UPI QR Code"
                width={100}
                height={100}
                style={{ display: 'block', margin: '0 auto' }}
              />
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '6px' }}>
                UPI: {invoice.upiId}
              </div>
            </div>
          )}

          <div style={{ flex: 1, maxWidth: '320px', marginLeft: 'auto' }}>
            {[
              { label: 'Subtotal', value: formatCurrency(invoice.subtotal), show: true },
              { label: 'Discount', value: `— ${formatCurrency(invoice.discountAmount)}`, show: invoice.discountAmount > 0 },
              { label: 'GST', value: formatCurrency(invoice.taxAmount), show: true },
              { label: invoice.additionalChargesDesc || 'Additional tax', value: formatCurrency(invoice.additionalTax), show: invoice.additionalTax > 0 },
              { label: 'Service charges', value: formatCurrency(invoice.serviceCharges ?? 0), show: (invoice.serviceCharges ?? 0) > 0 },
              { label: 'Visiting charges', value: formatCurrency(invoice.visitingCharges ?? 0), show: (invoice.visitingCharges ?? 0) > 0 },
            ].filter(r => r.show).map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', borderBottom: '0.5px solid #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '16px', fontWeight: '700', borderTop: '2px solid #1a56db', marginTop: '4px' }}>
              <span>Total</span>
              <span style={{ color: '#1a56db' }}>{formatCurrency(invoice.totalAmount)}</span>
            </div>
            {totalPaid > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Amount paid</span>
                  <span style={{ color: '#16a34a', fontWeight: '500' }}>{formatCurrency(totalPaid)}</span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700',
                  background: remaining > 0 ? '#fef2f2' : '#f0fdf4',
                  borderRadius: '6px', padding: '8px 10px', marginTop: '4px',
                }}>
                  <span>Balance due</span>
                  <span style={{ color: remaining > 0 ? '#dc2626' : '#16a34a' }}>
                    {remaining > 0 ? formatCurrency(remaining) : '✓ FULLY PAID'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Amount in words */}
        <div style={{ background: '#f0f7ff', border: '0.5px solid #bfdbfe', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#1e40af' }}>
          <strong>Amount in words:</strong> {amountInWords(invoice.totalAmount)}
        </div>

        {/* Bank Details */}
        {(invoice.bankName || invoice.upiId) && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#f8fafc', borderRadius: '6px', border: '0.5px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Payment details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px', color: '#475569' }}>
              {invoice.bankName && <div><strong>Bank:</strong> {invoice.bankName}</div>}
              {invoice.accountNo && <div><strong>Account:</strong> {invoice.accountNo}</div>}
              {invoice.ifscCode && <div><strong>IFSC:</strong> {invoice.ifscCode}</div>}
              {invoice.upiId && <div><strong>UPI:</strong> {invoice.upiId}</div>}
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div style={{ marginBottom: '12px', fontSize: '12px', color: '#475569', padding: '10px 14px', background: '#fffbeb', borderRadius: '6px', border: '0.5px solid #fde68a' }}>
            <strong>Notes:</strong> {invoice.notes}
          </div>
        )}

        {/* Terms */}
        {invoice.termsConditions && (
          <div style={{ marginBottom: '16px', fontSize: '11px', color: '#64748b', borderTop: '0.5px solid #e2e8f0', paddingTop: '12px', lineHeight: '1.7' }}>
            <strong style={{ color: '#475569' }}>Terms & conditions:</strong><br />
            {invoice.termsConditions}
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '2px solid #1a56db', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            <div>{company.companyName} {company.companyPhone ? `· ${company.companyPhone}` : ''}</div>
            <div style={{ marginTop: '2px' }}>
              Generated: {formatDate(new Date().toISOString())} · {invoice.invoiceNo}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ height: '40px', borderBottom: '0.5px solid #0f172a', width: '140px', marginBottom: '4px' }}></div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Authorised signature</div>
          </div>
        </div>

      </div>
    </div>
  )
}