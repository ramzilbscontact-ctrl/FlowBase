import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'GetAgenzia — Le CRM intelligent'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #4f46e5 100%)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 'bold',
            }}
          >
            a.
          </div>
          <span style={{ fontSize: '48px', fontWeight: 'bold' }}>GetAgenzia</span>
        </div>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 600,
            opacity: 0.95,
            textAlign: 'center',
            maxWidth: '700px',
          }}
        >
          Le CRM intelligent qui close vos deals
        </div>
        <div
          style={{
            fontSize: '18px',
            opacity: 0.7,
            marginTop: '16px',
            textAlign: 'center',
          }}
        >
          Pipeline AI-powered &bull; 50+ integrations &bull; Assistant IA
        </div>
      </div>
    ),
    { ...size }
  )
}
