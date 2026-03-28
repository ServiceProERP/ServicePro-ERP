'use client'
import { useRouter } from 'next/navigation'

export default function UnauthorizedPage() {
  const router = useRouter()

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '60vh', textAlign: 'center',
    }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '50%',
        background: '#fef2f2', border: '2px solid #fecaca',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '32px', marginBottom: '20px',
      }}>
        🔒
      </div>
      <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
        Access restricted
      </h1>
      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '6px', maxWidth: '380px', lineHeight: '1.6' }}>
        You don&apos;t have permission to view this page.
        This section requires a higher access level.
      </p>
      <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '32px' }}>
        Contact your administrator if you think this is a mistake.
      </p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '10px 24px', background: '#1a56db', color: '#fff',
            border: 'none', borderRadius: '8px', fontSize: '13px',
            fontWeight: '600', cursor: 'pointer',
          }}
        >
          ← Go to dashboard
        </button>
        <button
          onClick={() => router.back()}
          style={{
            padding: '10px 20px', border: '0.5px solid #e2e8f0',
            borderRadius: '8px', fontSize: '13px', color: '#475569',
            background: '#fff', cursor: 'pointer',
          }}
        >
          Go back
        </button>
      </div>
    </div>
  )
}