'use client';

import Link from 'next/link';
import { useStore } from '@/components/StoreProvider';
import Reveal from '@/components/Reveal';
import { site } from '@/lib/site';

// Huquqiy hujjatlarning to'liq matni alohida sahifalarda (/oferta, /maxfiylik, /qaytarish).
const content = {
  uz: {
    intro: "Savollaringiz bo'lsa Telegram orqali yozing — o'rtacha 10 daqiqada javob beramiz.",
    docsTitle: 'Hujjatlar va shartlar',
    docs: [
      { href: '/qaytarish', title: 'Qaytarish shartlari', text: "Pulni qaytarish va mahsulotni almashtirish tartibi" },
      { href: '/oferta', title: 'Ommaviy oferta', text: "Buyurtma, to'lov, yetkazish va taraflar javobgarligi" },
      { href: '/maxfiylik', title: 'Maxfiylik siyosati', text: "Qanday ma'lumotlar yig'iladi va qanday himoyalanadi" },
    ],
  },
  ru: {
    intro: 'Есть вопросы? Напишите в Telegram — отвечаем в среднем за 10 минут.',
    docsTitle: 'Документы и условия',
    docs: [
      { href: '/qaytarish', title: 'Условия возврата', text: 'Порядок возврата денег и обмена товара' },
      { href: '/oferta', title: 'Публичная оферта', text: 'Заказ, оплата, доставка и ответственность сторон' },
      { href: '/maxfiylik', title: 'Политика конфиденциальности', text: 'Какие данные собираются и как защищаются' },
    ],
  },
};

export default function SupportPage() {
  const { t, lang } = useStore();
  const c = content[lang] || content.uz;

  return (
    <section className="container-site max-w-3xl py-16">
      <Reveal>
        <span className="label">OXY / support</span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t('support_title')}</h1>
        <p className="mt-4 text-muted">{c.intro}</p>
      </Reveal>

      <Reveal stagger className="mt-8 flex flex-wrap gap-3">
        <a href={site.telegram} className="btn-primary">Telegram {site.telegramName}</a>
        <a href={`tel:${site.phone.replace(/\s/g, '')}`} className="btn-ghost">{site.phone}</a>
      </Reveal>

      <Reveal className="mt-12">
        <h2 className="label">{c.docsTitle}</h2>
      </Reveal>
      <Reveal stagger className="mt-4 grid gap-4 sm:grid-cols-3">
        {c.docs.map((d) => (
          <Link key={d.href} href={d.href} className="card card-hover group flex flex-col p-6">
            <span className="flex items-center justify-between text-base font-medium">
              {d.title}
              <span className="text-muted transition-all duration-300 group-hover:translate-x-1 group-hover:text-accent">→</span>
            </span>
            <span className="mt-2 text-sm leading-relaxed text-muted">{d.text}</span>
          </Link>
        ))}
      </Reveal>
    </section>
  );
}
