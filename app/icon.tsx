import { ImageResponse } from 'next/og'
import { type NextRequest } from 'next/server'

export const contentType = 'image/png'

export default function Icon({ request }: { request?: NextRequest }) {
  const size = Number(request?.nextUrl?.searchParams.get('size')) || 32
  const radius = Math.round(size * 0.18)

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: '#a8e635',
          borderRadius: radius,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: Math.round(size * 0.38),
          fontWeight: 900,
          color: '#1a1b2e',
          letterSpacing: '-0.02em',
          fontFamily: 'serif',
        }}
      >
        CL
      </div>
    ),
    { width: size, height: size }
  )
}
