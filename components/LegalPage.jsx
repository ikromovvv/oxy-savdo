import Link from 'next/link';
import { legal, site } from '@/lib/site';

// Hali to'ldirilmagan rekvizit ([...]) sariq ajratiladi — unutib qoldirmaslik uchun.
export function Fill({ v }) {
  const s = String(v);
  if (!s.startsWith('[')) return <>{s}</>;
  return <mark className="rounded bg-amber-400/20 px-1 text-amber-300">{s}</mark>;
}

export function Sec({ n, title, children }) {
  return (
    <section className="mt-8 scroll-mt-24">
      <h2 className="text-lg font-semibold tracking-tight">
        {n ? <span className="mr-2 text-accent">{n}.</span> : null}
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-white/75">{children}</div>
    </section>
  );
}

export function Ul({ items }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-accent/70">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}

const TABS = [
  { href: '/oferta', label: 'Ommaviy oferta' },
  { href: '/maxfiylik', label: 'Maxfiylik siyosati' },
  { href: '/qaytarish', label: 'Qaytarish shartlari' },
];

export default function LegalPage({ title, active, children }) {
  return (
    <section className="container-site max-w-3xl py-14">
      <span className="label">OXY / huquqiy</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-xs text-muted">Oxirgi yangilanish: {legal.updated}</p>

      <nav className="no-scrollbar -mx-5 mt-6 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0" aria-label="Huquqiy hujjatlar">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-none whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${
              tab.href === active
                ? 'border-accent/60 bg-accent/10 text-white'
                : 'border-line text-white/70 hover:border-white/40'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <article className="card mt-6 p-6 sm:p-8">{children}</article>

      <p className="mt-6 text-xs text-muted">
        Savollar bo&apos;lsa: <a className="text-white/80 hover:text-white" href={`mailto:${site.email}`}>{site.email}</a> ·{' '}
        <a className="text-white/80 hover:text-white" href={site.telegram}>{site.telegramName}</a>
      </p>
    </section>
  );
}
