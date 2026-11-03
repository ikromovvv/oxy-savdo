'use client';

import { useCallback, useEffect, useState } from 'react';

// Admin: rozigrysh ishtirokchilari va g'olibni tanlash (admin sessiyasi /admin orqali ochiladi).
export default function AdminGiveaway() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [winner, setWinner] = useState(null);
  const [notify, setNotify] = useState(true);

  const load = useCallback(async () => {
    const r = await fetch('/api/giveaway/admin', { cache: 'no-store' });
    if (r.status === 401) return setError('unauthorized');
    setData(await r.json());
  }, []);

  useEffect(() => {
    load().catch(() => setError('network'));
  }, [load]);

  async function draw() {
    setBusy(true);
    setWinner(null);
    try {
      const r = await fetch('/api/giveaway/admin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'draw', notify }),
      });
      const d = await r.json();
      if (!r.ok) setError(d.error || 'draw_failed');
      else {
        setError('');
        setWinner(d);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  if (error === 'unauthorized') {
    return (
      <section className="container-site max-w-xl py-16">
        <h1 className="text-2xl font-semibold">Rozigrish (admin)</h1>
        <p className="mt-3 text-sm text-muted">
          Avval <a className="text-white underline" href="/admin">/admin</a> orqali admin sifatida kiring, so&apos;ng bu sahifani qayta oching.
        </p>
      </section>
    );
  }

  return (
    <section className="container-site max-w-3xl py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Rozigrish (admin)</h1>

      {!data ? (
        <p className="mt-4 text-sm text-muted">Yuklanmoqda...</p>
      ) : (
        <>
          {!data.configured && (
            <p className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
              Bot sozlanmagan: Vercel&apos;da <code>GIVEAWAY_BOT_TOKEN</code> va <code>GIVEAWAY_WEBHOOK_SECRET</code> kerak.
            </p>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="card p-5">
              <div className="label">Botni boshlaganlar</div>
              <div className="mt-2 text-3xl font-semibold">{data.total}</div>
            </div>
            <div className="card p-5">
              <div className="label">Ikkala shart bajargan</div>
              <div className="mt-2 text-3xl font-semibold">{data.eligible}</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button onClick={draw} disabled={busy || !data.configured} className="btn-primary disabled:opacity-50">
              {busy ? 'Tanlanmoqda...' : "G'olibni tanlash"}
            </button>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              G&apos;olibga botda xabar yuborish
            </label>
          </div>
          <p className="mt-2 text-xs text-muted">Tanlashdan oldin hamma nomzodning kanalga obunasi qayta tekshiriladi.</p>

          {error && error !== 'unauthorized' && (
            <p className="mt-4 text-sm text-rose-300">
              {error === 'no_eligible' ? "Ikkala shartni bajargan ishtirokchi yo'q." : `Xato: ${error}`}
            </p>
          )}

          {winner && (
            <div className="mt-6 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-5">
              <div className="text-sm text-emerald-200">G&apos;olib ({winner.pool} nomzoddan):</div>
              <div className="mt-1 text-xl font-semibold">
                {winner.winner.tgUsername ? `@${winner.winner.tgUsername}` : winner.winner.tgName || winner.winner.tgId}
              </div>
              <div className="mt-1 text-sm text-white/80">
                Steam: {winner.winner.steamName || '—'} (<a className="underline" href={`https://steamcommunity.com/profiles/${winner.winner.steamid}`} target="_blank" rel="noreferrer">{winner.winner.steamid}</a>)
              </div>
            </div>
          )}

          {data.winners?.length > 0 && (
            <div className="mt-8">
              <h2 className="label">Oldingi g&apos;oliblar</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {data.winners.map((w, i) => (
                  <li key={i} className="flex justify-between gap-3 rounded-lg border border-white/[0.07] px-3 py-2">
                    <span>TG {w.tgId} · Steam {w.steamid}</span>
                    <span className="text-muted">{new Date(w.drawnAt).toLocaleString('ru-RU')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8">
            <h2 className="label">Ishtirokchilar (oxirgi 200)</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.07]">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="px-3 py-2">Telegram</th>
                    <th className="px-3 py-2">Obuna</th>
                    <th className="px-3 py-2">Steam</th>
                    <th className="px-3 py-2">Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((e) => (
                    <tr key={e.tgId} className="border-t border-white/[0.06]">
                      <td className="px-3 py-2">{e.tgUsername ? `@${e.tgUsername}` : e.tgName || e.tgId}</td>
                      <td className="px-3 py-2">{e.subscribed ? 'ha' : "yo'q"}</td>
                      <td className="px-3 py-2">{e.steamName || (e.steamid ? e.steamid : '—')}</td>
                      <td className="px-3 py-2">{e.eligible ? 'qatnashadi' : 'shart yetishmaydi'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
