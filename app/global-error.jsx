'use client';

// Ildiz (layout) darajasidagi xato uchun: o'zining <html>/<body> si bilan oddiy qayta yuklash oynasi.
export default function GlobalError() {
  return (
    <html lang="uz">
      <body style={{ margin: 0, background: '#030409', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 16 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: 4, color: '#9aa1ad' }}>OXY SAVDO</div>
            <h1 style={{ fontSize: 24, margin: '12px 0 8px' }}>Sahifani yuklab bo&apos;lmadi</h1>
            <p style={{ color: '#9aa1ad', fontSize: 14, margin: 0 }}>Sahifani qayta yuklang.</p>
            <button
              onClick={() => window.location.reload()}
              style={{ marginTop: 20, padding: '10px 20px', borderRadius: 12, border: 0, background: '#fff', color: '#030409', fontWeight: 600, cursor: 'pointer' }}
            >
              Qayta yuklash
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
