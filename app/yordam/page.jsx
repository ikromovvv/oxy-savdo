'use client';

import Link from 'next/link';
import { useStore } from '@/components/StoreProvider';
import Reveal from '@/components/Reveal';
import { site } from '@/lib/site';
import { ArrowRight, ChevronDown } from '@/components/icons';
import { useState } from 'react';

// Huquqiy hujjatlarning to'liq matni alohida sahifalarda (/oferta, /maxfiylik, /qaytarish).
const content = {
  uz: {
    intro: "Savollaringiz bo'lsa Telegram orqali yozing — o'rtacha 10 daqiqada javob beramiz.",
    faqTitle: "Ko'p so'raladigan savollar",
    faq: [
      ['Qanday kiraman? Parolimni berishim kerakmi?', "Yo'q. «Steam orqali kirish» tugmasi sizni Steam'ning rasmiy sahifasiga olib boradi. U yerda kirasiz va Steam bizga faqat Steam ID'ingizni yuboradi. Parol va Steam Guard kodlari hech qachon so'ralmaydi."],
      ['Trade havolani qayerdan olaman?', "Steam'da Inventar → Trade takliflari → «Kim menga taklif yubora oladi?» sahifasiga kiring va havolani nusxalab, profilingizga saqlang. Inventaringiz ommaviy (public) bo'lishi kerak."],
      ["Qanday to'lash mumkin?", "Payme yoki Click orqali, yoki sayt balansidan. Balansni oldindan to'ldirib qo'ysangiz, xarid bir bosishda bo'ladi."],
      ['Skin qancha vaqtda keladi?', "To'lovdan so'ng skinni sotuvchidan sotib olamiz va u Steam trade taklifi sifatida sizga yuboriladi. Jarayonni «Buyurtmalarim» sahifasida jonli kuzatishingiz mumkin."],
      ['Trade taklifini qanday qabul qilaman?', "«Buyurtmalarim» sahifasida «Steam'da ochish» tugmasini bosing yoki Steam ilovasida Trade takliflari bo'limiga kiring. Faqat buyurtmangizdagi skin bo'lgan taklifni qabul qiling — boshqa taklif va havolalarga ishonmang."],
      ['7 kunlik himoya nima?', "Valve qoidasiga ko'ra trade orqali kelgan skin 7 kun davomida Trade Protection ostida bo'ladi. Shu vaqtda skin sizniki, lekin bu muddat tugagach buyurtma «Yakunlandi» holatiga o'tadi."],
      ["«Siz tomondan amal kerak» degani nima?", "Steam akkauntingiz trade qila olmayapti: trade havola eskirgan, inventar yopiq yoki Steam Guard yoqilmagan bo'lishi mumkin. Muammoni tuzatib, profilda yangi trade havolani saqlang — yetkazish avtomatik davom etadi."],
      ['Xarid shartlari', "To'lov qilish orqali siz ommaviy oferta shartlariga rozilik bildirasiz. Qaytarish tartibi alohida sahifada yozilgan. OXY SAVDO Valve Corporation bilan bog'liq emas."],
    ],
    docsTitle: 'Hujjatlar va shartlar',
    docs: [
      { href: '/qaytarish', title: 'Qaytarish shartlari', text: "Pulni qaytarish va mahsulotni almashtirish tartibi" },
      { href: '/oferta', title: 'Ommaviy oferta', text: "Buyurtma, to'lov, yetkazish va taraflar javobgarligi" },
      { href: '/maxfiylik', title: 'Maxfiylik siyosati', text: "Qanday ma'lumotlar yig'iladi va qanday himoyalanadi" },
    ],
  },
  ru: {
    intro: 'Есть вопросы? Напишите в Telegram — отвечаем в среднем за 10 минут.',
    faqTitle: 'Частые вопросы',
    faq: [
      ['Как войти? Нужно ли давать пароль?', 'Нет. Кнопка «Войти через Steam» ведёт на официальную страницу Steam. Там вы входите, а Steam передаёт нам только ваш Steam ID. Пароль и коды Steam Guard не запрашиваются никогда.'],
      ['Где взять trade-ссылку?', 'В Steam: Инвентарь → Предложения обмена → «Кто может отправлять мне предложения?». Скопируйте ссылку и сохраните в профиле. Инвентарь должен быть открытым.'],
      ['Как можно оплатить?', 'Через Payme или Click, либо с баланса на сайте. Если пополнить баланс заранее, покупка совершается в один клик.'],
      ['Как быстро придёт скин?', 'После оплаты мы покупаем скин у продавца и отправляем его вам предложением обмена Steam. Ход выполнения можно смотреть на странице «Мои заказы».'],
      ['Как принять предложение обмена?', 'На странице «Мои заказы» нажмите «Открыть в Steam» или зайдите в раздел предложений обмена в приложении Steam. Принимайте только предложение с вашим скином — другим предложениям и ссылкам не верьте.'],
      ['Что такое 7-дневная защита?', 'По правилам Valve скин, полученный обменом, 7 дней находится под Trade Protection. Скин при этом уже ваш, а заказ получит статус «Завершён» по окончании срока.'],
      ['Что значит «Требуется действие с вашей стороны»?', 'Ваш аккаунт Steam не может принимать обмен: trade-ссылка устарела, инвентарь закрыт или не включён Steam Guard. Исправьте и сохраните новую ссылку в профиле — доставка продолжится автоматически.'],
      ['Условия покупки', 'Оплачивая, вы соглашаетесь с условиями публичной оферты. Порядок возврата описан на отдельной странице. OXY SAVDO не связан с Valve Corporation.'],
    ],
    docsTitle: 'Документы и условия',
    docs: [
      { href: '/qaytarish', title: 'Условия возврата', text: 'Порядок возврата денег и обмена товара' },
      { href: '/oferta', title: 'Публичная оферта', text: 'Заказ, оплата, доставка и ответственность сторон' },
      { href: '/maxfiylik', title: 'Политика конфиденциальности', text: 'Какие данные собираются и как защищаются' },
    ],
  },
};

function Faq({ items }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="mt-4 space-y-3">
      {items.map(([q, a], i) => {
        const isOpen = open === i;
        return (
          <div key={q} className="card overflow-hidden p-0">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold sm:text-base"
            >
              {q}
              <ChevronDown className={`h-4 w-4 flex-none text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
                <p className="px-5 pb-4 text-sm leading-relaxed text-muted">{a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
        {site.phone2 && <a href={`tel:${site.phone2.replace(/\s/g, '')}`} className="btn-ghost">{site.phone2}</a>}
      </Reveal>

      {/* TODO: savol-javob (FAQ) bo'limi vaqtincha o'chirilgan — keyin chiroyli qilib qaytaramiz
      <Reveal className="mt-12">
        <h2 className="label">{c.faqTitle}</h2>
        <Faq items={c.faq} />
      </Reveal>
      */}

      <Reveal className="mt-12">
        <h2 className="label">{c.docsTitle}</h2>
      </Reveal>
      <Reveal stagger className="mt-4 grid gap-4 sm:grid-cols-3">
        {c.docs.map((d) => (
          <Link key={d.href} href={d.href} className="card card-hover group flex flex-col p-6">
            <span className="flex items-center justify-between text-base font-medium">
              {d.title}
              <span className="text-muted transition-all duration-300 group-hover:translate-x-1 group-hover:text-accent"><ArrowRight className="h-4 w-4" /></span>
            </span>
            <span className="mt-2 text-sm leading-relaxed text-muted">{d.text}</span>
          </Link>
        ))}
      </Reveal>
    </section>
  );
}
