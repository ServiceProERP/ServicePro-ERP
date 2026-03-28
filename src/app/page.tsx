'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Invalid credentials')
        setLoading(false)
        return
      }
      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f0f4f8',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        display: 'flex', width: '920px', minHeight: '560px',
        background: '#fff', borderRadius: '16px',
        border: '0.5px solid #e2e8f0', overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
      }}>

        {/* LEFT PANEL */}
        <div style={{
          width: '46%', background: '#0b1220',
          padding: '48px 44px', display: 'flex',
          flexDirection: 'column', justifyContent: 'space-between',
        }}>

          {/* Product name */}
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff', letterSpacing: '-0.3px', marginBottom: '4px' }}>
              Service Pro <span style={{ color: '#4a9eff' }}>ERP</span>
            </div>
            <div style={{ fontSize: '10px', color: '#3a5070', letterSpacing: '2px', textTransform: 'uppercase' as const, fontWeight: '500' }}>
              Enterprise Service Management
            </div>
          </div>

          {/* Main copy */}
          <div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#ffffff', lineHeight: '1.4', marginBottom: '28px', letterSpacing: '-0.3px' }}>
              The complete operations platform for service businesses.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                'Field service management',
                'Finance & invoicing',
                'Workforce & payroll',
                'Inventory & spare parts',
                'Reports & analytics',
              ].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#4a9eff', flexShrink: 0 }} />
                  <span style={{ fontSize: '14px', color: '#7a9ab8', lineHeight: '1.5' }}>{item}</span>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '32px', paddingTop: '24px',
              borderTop: '0.5px solid #1a2d4a',
              fontSize: '13px', color: '#4a6080', fontWeight: '500', letterSpacing: '0.3px',
            }}>
              Trusted. Reliable. Built for India.
            </div>
          </div>

          {/* Bottom — servyn.ai + copyright */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6a7a8a', marginBottom: '4px', letterSpacing: '0.5px' }}>
              A product by <span style={{ color: '#7ed321', fontWeight: '700' }}>servyn</span><span style={{ color: '#7ed321', fontWeight: '700' }}>.ai</span>
            </div>
            <div style={{ fontSize: '11px', color: '#2a3a50' }}>
              © 2026 Service Pro ERP &nbsp;·&nbsp; Secure · Reliable · Always on
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{
          flex: 1, padding: '56px 48px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          <div style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', marginBottom: '6px', letterSpacing: '-0.3px' }}>
            Welcome back
          </div>
          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '36px' }}>
            Sign in to your account to continue
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Email address
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" required
                style={{
                  width: '100%', height: '42px', padding: '0 14px',
                  border: '1px solid #e2e8f0', borderRadius: '8px',
                  fontSize: '14px', outline: 'none', background: '#fff',
                  color: '#0f172a', boxSizing: 'border-box' as const,
                }}
                onFocus={e => e.target.style.borderColor = '#1a56db'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                style={{
                  width: '100%', height: '42px', padding: '0 14px',
                  border: '1px solid #e2e8f0', borderRadius: '8px',
                  fontSize: '14px', outline: 'none', background: '#fff',
                  color: '#0f172a', boxSizing: 'border-box' as const,
                }}
                onFocus={e => e.target.style.borderColor = '#1a56db'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                color: '#dc2626', padding: '10px 14px', borderRadius: '8px',
                fontSize: '13px', marginBottom: '20px',
              }}>
                ⚠ {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', height: '44px',
                background: loading ? '#93a3b8' : '#1a56db',
                color: '#fff', border: 'none', borderRadius: '8px',
                fontSize: '14px', fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div style={{
            marginTop: '36px', padding: '14px 16px',
            background: '#f8fafc', borderRadius: '8px',
            border: '0.5px solid #e2e8f0',
            fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const,
          }}>
            Having trouble signing in? Contact your system administrator.
          </div>
        </div>

      </div>
    </div>
  )
}
