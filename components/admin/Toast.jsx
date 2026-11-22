'use client';

import { useEffect, useState } from 'react';
import { X, CircleAlert, CircleCheck, Info } from '@/components/icons';

// Yengil toast tizimi (js alert o'rniga). Istalgan joydan:
//   import { toast } from './Toast';  toast.error('...');  toast.success('...');  toast.info('...')
// <ToastHost /> admin sahifasida bir marta ulangan.

const listeners = new Set();
let seq = 0;

function push(type, message, ms) {
  const msg = String(message || '').trim();
  if (!msg) return;
  const t = { id: ++seq, type, message: msg, ms: ms || (type === 'error' ? 7000 : 3500) };
  listeners.forEach((fn) => fn(t));
}

export const toast = {
  error: (m, ms) => push('error', m, ms),
  success: (m, ms) => push('success', m, ms),
  info: (m, ms) => push('info', m, ms),
};

const STYLE = {
  error: { ring: 'border-rose-400/40', bar: 'bg-rose-400', icon: 'text-rose-300', title: 'Xatolik', Icon: CircleAlert },
  success: { ring: 'border-emerald-400/40', bar: 'bg-emerald-400', icon: 'text-emerald-300', title: 'Tayyor', Icon: CircleCheck },
  info: { ring: 'border-sky-400/40', bar: 'bg-sky-400', icon: 'text-sky-300', title: "Ma'lumot", Icon: Info },
};

function Item({ t, onClose }) {
  const s = STYLE[t.type] || STYLE.info;
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const a = requestAnimationFrame(() => setShown(true));
    const b = setTimeout(onClose, t.ms);
    return () => {
      cancelAnimationFrame(a);
      clearTimeout(b);
    };
  }, [t, onClose]);

  return (
    <div
      role={t.type === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto relative w-full overflow-hidden rounded-2xl border ${s.ring} bg-[#14151a]/95 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur transition-all duration-300 ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
    >
      <div className="flex items-start gap-3 p-4 pr-3">
        <span className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center ${s.icon}`}><s.Icon className="h-5 w-5" strokeWidth={2} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{s.title}</div>
          <div className="mt-0.5 break-words text-sm leading-snug text-white">{t.message}</div>
        </div>
        <button onClick={onClose} aria-label="Yopish" className="flex-none rounded-lg px-2 py-1 text-muted transition hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className={`h-0.5 ${s.bar} origin-left`} style={{ animation: `toast-bar ${t.ms}ms linear forwards` }} />
    </div>
  );
}

export function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const fn = (t) => setItems((p) => [...p.filter((x) => x.message !== t.message || x.type !== t.type), t].slice(-4));
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  return (
    <>
      <style>{'@keyframes toast-bar{from{transform:scaleX(1)}to{transform:scaleX(0)}}'}</style>
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[300] mx-auto flex w-full max-w-md flex-col gap-2 px-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:mx-0">
        {items.map((t) => (
          <Item key={t.id} t={t} onClose={() => setItems((p) => p.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </>
  );
}
