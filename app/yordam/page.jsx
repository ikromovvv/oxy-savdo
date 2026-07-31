'use client';

import { useStore } from '@/components/StoreProvider';
import Reveal from '@/components/Reveal';
import { site } from '@/lib/site';

const content = {
  uz: {
    intro: "Savollaringiz bo'lsa Telegram orqali yozing — o'rtacha 10 daqiqada javob beramiz.",
    blocks: [
      {
        id: 'qaytarish',
        title: 'Qaytarish shartlari',
        text: [
          'Mahsulotni olganingizdan keyin 14 kun ichida qaytarish mumkin.',
          'Mahsulot ishlatilmagan, o\'z qadog\'ida va tovar ko\'rinishi saqlangan bo\'lishi kerak.',
          'Yetkazib berish xarajati xaridor zimmasida bo\'ladi (nuqsonli mahsulotdan tashqari).',
          'Raqamli mahsulotlar (skinlar) uzatilgandan keyin qaytarilmaydi.',
        ],
      },
      {
        id: 'oferta',
        title: 'Ommaviy oferta',
        text: [
          'Saytda buyurtma berish orqali siz ushbu shartlarga rozilik bildirasiz.',
          'Narxlar so\'mda ko\'rsatilgan va o\'zgarishi mumkin.',
          'Buyurtma menejer tasdiqlagandan keyin kuchga kiradi.',
        ],
      },
      {
        id: 'maxfiylik',
        title: 'Maxfiylik siyosati',
        text: [
          'Ism, telefon va Telegram ma\'lumotlari faqat buyurtmani rasmiylashtirish uchun ishlatiladi.',
          'Ma\'lumotlar uchinchi shaxslarga berilmaydi.',
        ],
      },
    ],
  },
  ru: {
    intro: 'Есть вопросы? Напишите в Telegram — отвечаем в среднем за 10 минут.',
    blocks: [
      {
        id: 'qaytarish',
        title: 'Условия возврата',
        text: [
          'Вернуть товар можно в течение 14 дней после получения.',
          'Товар должен быть не использован, в оригинальной упаковке и с сохранённым товарным видом.',
          'Стоимость доставки оплачивает покупатель (кроме брака).',
          'Цифровые товары (скины) возврату после передачи не подлежат.',
        ],
      },
      {
        id: 'oferta',
        title: 'Публичная оферта',
        text: [
          'Оформляя заказ на сайте, вы соглашаетесь с данными условиями.',
          'Цены указаны в сумах и могут меняться.',
          'Заказ вступает в силу после подтверждения менеджером.',
        ],
      },
      {
        id: 'maxfiylik',
        title: 'Политика конфиденциальности',
        text: [
          'Имя, телефон и Telegram используются только для оформления заказа.',
          'Данные не передаются третьим лицам.',
        ],
      },
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

      <Reveal stagger className="mt-12 space-y-4">
        {c.blocks.map((b) => (
          <div key={b.id} id={b.id} className="card scroll-mt-24 p-7">
            <h2 className="text-lg font-medium">{b.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-white/75">
              {b.text.map((x, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-accent">—</span>
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
