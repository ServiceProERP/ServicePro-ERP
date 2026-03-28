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
      minHeight: '100vh',
      background: '#f8f9fb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        display: 'flex',
        width: '900px',
        minHeight: '520px',
        background: '#fff',
        borderRadius: '16px',
        border: '0.5px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>

        {/* LEFT PANEL */}
        <div style={{
          width: '45%',
          background: '#0f1729',
          padding: '48px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>
              Service Pro <span style={{ color: '#4a9eff' }}>ERP</span>
            </div>
            <div style={{ fontSize: '11px', color: '#4a6080', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Built for Indian Service Industry
            </div>
          </div>

          <div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: '#fff', lineHeight: '1.35', marginBottom: '20px' }}>
              From job card to payment — everything in one place
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { icon: '⚡', title: 'Zero missed jobs', desc: 'Assign, track and close every service job in real time' },
                { icon: '💰', title: 'Get paid faster', desc: 'Auto-generate invoices the moment a job is completed' },
                { icon: '👷', title: 'Control your team', desc: 'Know exactly what every technician is doing, right now' },
                { icon: '📊', title: 'Run on data', desc: 'Reports that tell you where to grow and what to fix' },
              ].map(item => (
                <div key={item.title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: '#1a2f50', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '16px', flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>{item.title}</div>
                    <div style={{ fontSize: '12px', color: '#5a7a9a', lineHeight: '1.5' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '11px', color: '#3a5070' }}>
            © 2026 Service Pro ERP. All rights reserved.
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{
          flex: 1,
          padding: '48px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          <div style={{ fontSize: '22px', fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>
            Welcome back
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '32px' }}>
            Sign in to your account to continue
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                style={{
                  width: '100%', height: '40px', padding: '0 12px',
                  border: '0.5px solid #d1d5db', borderRadius: '8px',
                  fontSize: '14px', outline: 'none', background: '#fff', transition: 'border 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#1a56db'}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', height: '40px', padding: '0 12px',
                  border: '0.5px solid #d1d5db', borderRadius: '8px',
                  fontSize: '14px', outline: 'none', background: '#fff',
                }}
                onFocus={e => e.target.style.borderColor = '#1a56db'}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            {error && (
              <div style={{
                background: '#fef2f2', border: '0.5px solid #fecaca',
                color: '#dc2626', padding: '10px 14px',
                borderRadius: '8px', fontSize: '13px', marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', height: '42px',
                background: loading ? '#93a3b8' : '#1a56db',
                color: '#fff', border: 'none', borderRadius: '8px',
                fontSize: '14px', fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          <div style={{ marginTop: '32px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
            Having trouble signing in? Contact your administrator.
          </div>
        </div>
      </div>
    </div>
  )
}
