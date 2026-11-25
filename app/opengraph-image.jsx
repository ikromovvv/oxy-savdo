import { ImageResponse } from 'next/og';

export const alt = 'OXY SAVDO — CS2 skinlar va gaming kovriklar';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const runtime = 'edge';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          background: 'radial-gradient(ellipse at 50% 40%, #151a24 0%, #070910 60%, #030409 100%)',
        }}
      >
        <div style={{ display: 'flex', fontSize: 210, fontWeight: 800, letterSpacing: 18, lineHeight: 1 }}>OXY</div>
        <div style={{ display: 'flex', fontSize: 40, letterSpacing: 16, color: '#9aa1ad', marginTop: 12 }}>SAVDO</div>
        <div style={{ display: 'flex', fontSize: 34, color: '#d5d9e0', marginTop: 56 }}>CS2 skinlar · gaming kovriklar · UZS</div>
      </div>
    ),
    size
  );
}
