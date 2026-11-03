'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, X } from '@/components/icons';

function Row({ ok, warn, children }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm">
      <span
        className={`grid h-7 w-7 flex-none place-items-center rounded-full border ${
          ok ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-300' : warn ? 'border-amber-400/50 text-amber-300' : 'border-white/25 text-white/60'
        }`}
      >
        {ok ? <Check className="h-4 w-4" strokeWidth={2.5} /> : warn ? '!' : <X className="h-4 w-4" strokeWidth={2.5} />}
      </span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

// Telegram Mini App ichida ochiladi: initData imzosi bilan foydalanuvchini aniqlaydi va shartlarni tekshiradi.
export default function MiniAppClient() {
  const [phase, setPhase] = useState('loading'); // loading | ready | outside | error
  const [st, setSt] = useState(null);
  const [busy, setBusy] = useState(false);
  const tgRef = useRef(null);

  const check = useCallback(async () => {
    const tg = tgRef.current;
    if (!tg?.initData) return setPhase('outside');
    setBusy(true);
    try {
      const startParam = tg.initDataUnsafe?.start_param;
      const r = await fetch('/api/giveaway/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData, msg: startParam || null }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) return setPhase('error');
      setSt(d);
      setPhase('ready');
    } catch {
      setPhase('error');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const s = document.createElement('script');
    s.src = 'https://telegram.org/js/telegram-web-app.js';
    s.onload = () => {
      try {
        tgRef.current = window.Telegram.WebApp;
        tgRef.current.ready();
        tgRef.current.expand();
      } catch {
        /* Mini App tashqarisida */
      }
      check();
    };
    s.onerror = () => setPhase('error');
    document.head.appendChild(s);
  }, [check]);

  const open = (url, tg) => {
    const w = tgRef.current;
    if (!w) return window.open(url, '_blank');
    if (tg) w.openTelegramLink(url);
    else w.openLink(url);
  };

  return (
    <section className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="text-center text-2xl font-semibold tracking-tight">🎁 Rozigrish</h1>

      {phase === 'loading' && <p className="mt-6 text-center text-sm text-muted">Tekshirilmoqda...</p>}

      {phase === 'outside' && (
        <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-white/80">
          Bu sahifa faqat Telegram ichida ishlaydi. Kanaldagi &laquo;Qatnashish&raquo; tugmasini bosing.
        </p>
      )}

      {phase === 'error' && (
        <div className="mt-6 text-center">
          <p className="text-sm text-rose-300">Xatolik yuz berdi. Qayta urinib ko&apos;ring.</p>
          <button onClick={check} className="btn-primary mt-4">Qayta urinish</button>
        </div>
      )}

      {phase === 'ready' && st && (
        <div className="mt-6 space-y-3">
          <Row ok={st.subscribed} warn={st.checkFailed}>
            {st.channelLabel} kanaliga obuna
            {st.checkFailed && <span className="block text-xs text-amber-300">Obunani tekshirib bo&apos;lmadi</span>}
          </Row>
          <Row ok={st.steam}>
            Saytda Steam orqali kirish
            {st.steamName && <span className="block text-xs text-muted">{st.steamName}</span>}
          </Row>

          {st.eligible ? (
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-4 text-center">
              <div className="text-lg font-semibold text-emerald-200">Siz rozigrishda ishtirok etyapsiz! 🎉</div>
              <div className="mt-1 text-sm text-white/70">Ishtirokchilar: {st.count}. Omad!</div>
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              {!st.subscribed && (
                <button onClick={() => open(st.channelLink, true)} className="btn-primary w-full">
                  📢 Kanalga o&apos;tish
                </button>
              )}
              {!st.steam && st.steamUrl && (
                <button onClick={() => open(st.steamUrl, false)} className="btn-primary w-full">
                  🎮 Saytda Steam bilan kirish
                </button>
              )}
              <button onClick={check} disabled={busy} className="w-full rounded-xl border border-white/20 px-4 py-3 text-sm font-medium disabled:opacity-50">
                {busy ? 'Tekshirilmoqda...' : '🔄 Qayta tekshirish'}
              </button>
              <p className="pt-1 text-center text-xs text-muted">Ikkala shart bajarilganda ishtirokchi bo&apos;lasiz.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
