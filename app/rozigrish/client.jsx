'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, X, Send } from '@/components/icons';
import { SteamIcon } from '@/components/icons';
import { useStore } from '@/components/StoreProvider';

function Step({ n, ok, title, children }) {
  return (
    <div className="flex gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <span
        className={`grid h-9 w-9 flex-none place-items-center rounded-full border text-sm font-bold ${
          ok ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-300' : 'border-white/20 text-white/70'
        }`}
      >
        {ok ? <Check className="h-4 w-4" strokeWidth={2.5} /> : n}
      </span>
      <div className="min-w-0">
        <div className="font-medium">{title}</div>
        <div className="mt-1 text-sm text-muted">{children}</div>
      </div>
    </div>
  );
}

// Rozigrysh sahifasi: bot bergan havola (?t=...) orqali ochiladi, Steam bilan kirilgach Telegram akkauntga bog'lanadi.
export default function RozigrishClient({ botUsername, channel }) {
  const { user, userLoading } = useStore();
  const [token, setToken] = useState('');
  const [state, setState] = useState({ phase: 'idle' }); // idle | linking | done | error
  const started = useRef(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('t') || '');
  }, []);

  useEffect(() => {
    if (!user || !token || started.current) return;
    started.current = true;
    setState({ phase: 'linking' });
    fetch('/api/giveaway/link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ t: token }),
    })
      .then(async (r) => ({ status: r.status, data: await r.json().catch(() => ({})) }))
      .then(({ data }) => setState(data.ok ? { phase: 'done', ...data } : { phase: 'error', error: data.error }))
      .catch(() => setState({ phase: 'error', error: 'network' }));
  }, [user, token]);

  const loginHref = `/api/auth/steam/login?next=${encodeURIComponent(`/rozigrish${token ? `?t=${token}` : ''}`)}`;
  const botHref = botUsername ? `https://t.me/${botUsername.replace(/^@/, '')}` : `https://t.me/${channel}`;

  const errText = {
    steam_taken: "Bu Steam akkaunt boshqa Telegram akkauntga ulangan. Bitta Steam akkaunt bilan faqat bir marta qatnashish mumkin.",
    bad_or_expired_token: "Havola eskirgan. Botga qaytib /start yuboring va yangi havolani oling.",
    not_logged_in: 'Avval Steam orqali kiring.',
    network: "Aloqa xatosi. Qayta urinib ko'ring.",
  };

  return (
    <section className="container-site max-w-xl py-14">
      <span className="label">OXY / rozigrish</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Rozigrishda qatnashing</h1>
      <p className="mt-3 text-sm text-muted">
        Ishtirokchi bo&apos;lish uchun ikkala shartni bajaring. Birortasi bajarilmasa, rozigrishda qatnashtirilmaydi.
      </p>

      <div className="mt-6 space-y-3">
        <Step n="1" ok={state.phase === 'done' && state.subscribed} title="Kanalga obuna bo'ling">
          Telegramda <a className="text-white underline-offset-2 hover:underline" href={`https://t.me/${channel}`}>@{channel}</a> kanaliga obuna bo&apos;lib, botda
          &laquo;Qayta tekshirish&raquo; ni bosing.
        </Step>
        <Step n="2" ok={Boolean(user) && (state.phase === 'done' || state.phase === 'linking')} title="Saytda Steam orqali kiring">
          Kirish faqat Steam sahifasida bo&apos;ladi, parolingiz so&apos;ralmaydi.
        </Step>
      </div>

      <div className="mt-6">
        {!token && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80">
            Bu sahifaga <b>botdagi havola</b> orqali kiring: botga <code>/start</code> yuboring va &laquo;Saytda Steam bilan kirish&raquo; tugmasini bosing.
            <a href={botHref} target="_blank" rel="noreferrer" className="btn-primary mt-4 inline-flex gap-2">
              <Send className="h-4 w-4" strokeWidth={2.25} /> Botni ochish
            </a>
          </div>
        )}

        {token && !userLoading && !user && (
          <a href={loginHref} className="btn-primary inline-flex w-full justify-center gap-2.5">
            <SteamIcon className="h-4 w-4" />
            Steam orqali kirish
          </a>
        )}

        {token && state.phase === 'linking' && <p className="text-sm text-muted">Tekshirilmoqda...</p>}

        {state.phase === 'done' && (
          <div
            className={`rounded-xl border p-4 text-sm ${
              state.eligible ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' : 'border-amber-400/40 bg-amber-400/10 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {state.eligible ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <X className="h-4 w-4" strokeWidth={2.5} />}
              {state.eligible ? 'Siz rozigrishda ishtirok etyapsiz!' : 'Steam ulandi, lekin kanalga obuna topilmadi'}
            </div>
            {!state.eligible && (
              <p className="mt-2">
                @{channel} kanaliga obuna bo&apos;ling va botda <b>&laquo;Qayta tekshirish&raquo;</b> ni bosing.
              </p>
            )}
          </div>
        )}

        {state.phase === 'error' && (
          <div className="rounded-xl border border-rose-400/40 bg-rose-400/10 p-4 text-sm text-rose-200">
            {errText[state.error] || "Xatolik yuz berdi. Qayta urinib ko'ring."}
          </div>
        )}
      </div>
    </section>
  );
}
