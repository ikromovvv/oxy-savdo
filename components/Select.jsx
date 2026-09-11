'use client';

// Saytning umumiy (dark + neon) uslubiga mos maxsus dropdown — brauzerning
// standart <select> oynasi o'rniga (u OS uslubida oq/ko'k chiqadi va
// dizaynga mos kelmaydi).
import { useEffect, useRef, useState } from 'react';

export default function Select({
  value,
  onChange,
  options,
  className = '',
  menuClassName = '',
  align = 'right', // 'right' | 'left' — menyu qaysi tomonga ochilsin
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm outline-none transition-all duration-200 ${
          open
            ? 'border-accent/60 bg-panel text-white shadow-[0_0_16px_rgba(198,255,0,0.25)]'
            : 'border-line bg-panel text-white/90 hover:border-white/40'
        } ${className}`}
      >
        <span className="truncate">{current?.label ?? ''}</span>
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 flex-none fill-none stroke-current stroke-2 transition-transform duration-200 ${
            open ? 'rotate-180 text-accent' : 'text-muted'
          }`}
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute z-30 mt-2 min-w-full overflow-hidden rounded-xl border border-line bg-ink/95 py-1 shadow-[0_16px_44px_rgba(0,0,0,0.6),0_0_22px_rgba(198,255,0,0.1)] backdrop-blur-xl ${
            align === 'left' ? 'left-0' : 'right-0'
          } ${menuClassName}`}
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 whitespace-nowrap px-4 py-2.5 text-left text-sm transition-colors ${
                  active ? 'bg-accent/10 text-accent' : 'text-white/85 hover:bg-white/5 hover:text-white'
                }`}
              >
                {o.label}
                {active && <span className="text-accent">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
