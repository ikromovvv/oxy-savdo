'use client';

import Link from 'next/link';
import { useStore } from '@/components/StoreProvider';
import Reveal from '@/components/Reveal';
import { ArrowRight } from '@/components/icons';
import { pick } from '@/lib/i18n';
import { site } from '@/lib/site';

// "Pul ishlash" sahifasi: saytda daromad qilishning yo'llari (skin sotish, rozigrish, hamkorlik).
// Hamkorlik shartlari raqamsiz: har bir hamkor bilan alohida kelishiladi.
const TXT = {
  uz: {
    kicker: 'OXY / daromad', title: 'Pul ishlash', sub: "OXY SAVDO bilan daromad qilishning bir necha yo'li.",
    c1: ['Skinlaringizni soting', "Steam inventaringizdagi skinlarni so'mga almashtiring. Narxni oldindan ko'rasiz, so'rov yuborasiz — to'lov balansga, kartaga yoki kriptoga.", "Sotishga o'tish"],
    c2: ['Rozigrishlar', "Telegram kanalimiz rozigrishlarida qatnashing va skinlar yutib oling.", 'Rozigrishga qatnashish'],
    c3: ['Hamkorlik', "Telegram kanal, YouTube yoki Instagram auditoriyangiz bormi? Hamkorlik shartlarini bilish uchun admin bilan bog'laning.", 'Telegramda yozish'],
    note: "Hamkorlik shartlari har bir hamkor bilan alohida kelishiladi.",
  },
  ru: {
    kicker: 'OXY / доход', title: 'Заработок', sub: 'Несколько способов зарабатывать вместе с OXY SAVDO.',
    c1: ['Продайте свои скины', 'Обменяйте скины из инвентаря Steam на сумы. Цену видно заранее, вы отправляете заявку — выплата на баланс, карту или крипто.', 'Перейти к продаже'],
    c2: ['Розыгрыши', 'Участвуйте в розыгрышах нашего Telegram-канала и выигрывайте скины.', 'Участвовать в розыгрыше'],
    c3: ['Партнёрство', 'Есть аудитория в Telegram, YouTube или Instagram? Свяжитесь с админом, чтобы узнать условия сотрудничества.', 'Написать в Telegram'],
    note: 'Условия партнёрства обсуждаются с каждым партнёром отдельно.',
  },
  en: {
    kicker: 'OXY / earn', title: 'Earn money', sub: 'A few ways to earn with OXY SAVDO.',
    c1: ['Sell your skins', 'Turn the skins in your Steam inventory into UZS. You see the price upfront, send a request — payout to your balance, card or crypto.', 'Go to selling'],
    c2: ['Giveaways', 'Take part in our Telegram channel giveaways and win skins.', 'Join the giveaway'],
    c3: ['Partnership', 'Have an audience on Telegram, YouTube or Instagram? Contact the admin to learn the partnership terms.', 'Message on Telegram'],
    note: 'Partnership terms are agreed with each partner individually.',
  },
  es: {
    kicker: 'OXY / ingresos', title: 'Ganar dinero', sub: 'Varias formas de ganar con OXY SAVDO.',
    c1: ['Vende tus skins', 'Convierte las skins de tu inventario de Steam en UZS. Ves el precio de antemano, envías una solicitud y cobras en tu saldo, tarjeta o cripto.', 'Ir a vender'],
    c2: ['Sorteos', 'Participa en los sorteos de nuestro canal de Telegram y gana skins.', 'Participar en el sorteo'],
    c3: ['Colaboración', '¿Tienes audiencia en Telegram, YouTube o Instagram? Contacta con el administrador para conocer las condiciones de colaboración.', 'Escribir por Telegram'],
    note: 'Las condiciones de colaboración se acuerdan con cada socio por separado.',
  },
  zh: {
    kicker: 'OXY / 赚钱', title: '赚钱', sub: '通过 OXY SAVDO 赚钱的几种方式。',
    c1: ['出售您的饰品', '把 Steam 库存中的饰品换成 UZS。价格事先可见，提交请求即可——可收款到余额、银行卡或加密货币。', '前往出售'],
    c2: ['抽奖活动', '参加我们 Telegram 频道的抽奖，赢取饰品。', '参加抽奖'],
    c3: ['合作', '在 Telegram、YouTube 或 Instagram 上有受众？联系管理员了解合作条款。', '通过 Telegram 联系'],
    note: '合作条款将与每位合作伙伴单独商定。',
  },
  tr: {
    kicker: 'OXY / kazanç', title: 'Para kazan', sub: 'OXY SAVDO ile kazanmanın birkaç yolu.',
    c1: ['Skinlerinizi satın', 'Steam envanterinizdeki skinleri UZS’ye çevirin. Fiyatı önceden görürsünüz, talep gönderirsiniz — ödeme bakiyenize, karta veya kripto olarak yapılır.', 'Satışa git'],
    c2: ['Çekilişler', 'Telegram kanalımızın çekilişlerine katılın ve skin kazanın.', 'Çekilişe katıl'],
    c3: ['İş birliği', 'Telegram, YouTube veya Instagram’da kitleniz mi var? İş birliği koşullarını öğrenmek için yöneticiyle iletişime geçin.', 'Telegram’dan yaz'],
    note: 'İş birliği koşulları her ortakla ayrı ayrı belirlenir.',
  },
  kk: {
    kicker: 'OXY / табыс', title: 'Ақша табу', sub: 'OXY SAVDO арқылы табыс табудың бірнеше жолы.',
    c1: ['Скиндеріңізді сатыңыз', 'Steam инвентарыңыздағы скиндерді UZS-ке айналдырыңыз. Бағаны алдын ала көресіз, сұраныс жібересіз — төлем балансқа, картаға немесе криптоға түседі.', 'Сатуға өту'],
    c2: ['Розыгрыштар', 'Telegram арнамыздың розыгрыштарына қатысып, скиндер ұтып алыңыз.', 'Розыгрышқа қатысу'],
    c3: ['Серіктестік', 'Telegram, YouTube немесе Instagram-да аудиторияңыз бар ма? Серіктестік шарттарын білу үшін әкімшімен байланысыңыз.', 'Telegram-да жазу'],
    note: 'Серіктестік шарттары әр серіктеспен жеке келісіледі.',
  },
};

export default function EarnClient() {
  const { lang } = useStore();
  const L = pick(TXT, lang);

  const cards = [
    { c: L.c1, href: '/sotish', ext: false },
    { c: L.c2, href: '/rozigrish', ext: false },
    { c: L.c3, href: site.telegram, ext: true },
  ];

  return (
    <section className="container-site max-w-5xl py-14">
      <Reveal>
        <span className="label">{L.kicker}</span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{L.title}</h1>
        <p className="mt-4 max-w-2xl text-muted">{L.sub}</p>
      </Reveal>

      <Reveal stagger className="mt-10 grid gap-4 md:grid-cols-3">
        {cards.map(({ c, href, ext }, i) => (
          <div key={i} className="card flex flex-col p-6">
            <div className="text-sm font-semibold text-accent">0{i + 1}</div>
            <h2 className="mt-3 text-lg font-semibold">{c[0]}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{c[1]}</p>
            {ext ? (
              <a href={href} target="_blank" rel="noreferrer" className="btn-primary mt-5">
                {c[2]} <ArrowRight className="h-4 w-4" />
              </a>
            ) : (
              <Link href={href} className="btn-primary mt-5">
                {c[2]} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        ))}
      </Reveal>

      <p className="mt-6 text-xs text-muted">{L.note}</p>
    </section>
  );
}
