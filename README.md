# OXY SAVDO

Skin, gaming kovrik va aksessuar sotadigan sayt (Next.js 14 + Tailwind).
Dizayn strogo.shop uslubida: qora fon, minimal tipografika, katta hero, sokin animatsiyalar.

## Ishga tushirish

```bash
npm install
npm run dev      # http://localhost:3000
```

Production:

```bash
npm run build
npm start
```

## Sozlash

| Nima | Qayerda |
|---|---|
| Telegram, telefon, email | `lib/site.js` |
| Mahsulotlar va narxlar | `lib/products.js` |
| Uz/Ru matnlar | `lib/i18n.js` |
| Ranglar (accent, fon) | `tailwind.config.js` |

### Rasm qo'shish
Rasmlarni `public/products/` ichiga tashlang va `lib/products.js` da
`image: '/products/nom.jpg'` deb yozing. Rasm bo'sh bo'lsa gradient placeholder chiqadi.

### Buyurtmalarni Telegram'ga olish
Loyiha ildizida `.env.local` yarating:

```
TELEGRAM_BOT_TOKEN=123456:AA...
TELEGRAM_CHAT_ID=123456789
```

Bot token — @BotFather dan, chat id — @userinfobot dan olinadi.
Env to'ldirilmasa buyurtma faqat konsolga yoziladi (sayt ishlayveradi).

### Steam orqali kirish

Saytda "Steam orqali kirish" tugmasi bor (lis-skins kabi). Steam OAuth emas, OpenID
ishlatadi — tashqi kutubxona shart emas. Ishlashi uchun `.env.local` ga qo'shing:

```
STEAM_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
SESSION_SECRET=istalgan_uzun_tasodifiy_matn
```

- `STEAM_API_KEY` — https://steamcommunity.com/dev/apikey dan bepul olinadi (domain
  sifatida lokal test uchun `localhost` yozsa ham bo'ladi). Foydalanuvchining ismi va
  avatarini olish uchun kerak; bo'lmasa ham login ishlaydi, faqat ism "Steam 1234"
  ko'rinishida chiqadi.
- `SESSION_SECRET` — sessiya cookie'sini imzolash uchun, o'zingiz istalgan uzun matn
  yozing (masalan parol generatordan).

Ishlash tartibi: foydalanuvchi tugmani bosadi → Steam sahifasiga o'tadi → tasdiqlaydi →
saytga qaytadi va ismi/avatari header'da chiqadi. Sessiya 30 kun saqlanadi
(`oxy_session` nomli httpOnly cookie).

## Animatsiya

- **GSAP + ScrollTrigger** — hero timeline, scroll bo'yicha karta va bloklar stagger bilan chiqadi
  (`components/Reveal.jsx` — `<Reveal stagger>` bilan istalgan blokni o'rash mumkin).
- **Lenis** — smooth scroll (`components/SmoothScroll.jsx`), GSAP ticker bilan sinxron.
- Karta hover: rasm 1.06 ga kattalashadi, karta 6px ko'tariladi; "Savatga" bosilganda elastic effekt.
- `prefers-reduced-motion: reduce` yoqilgan bo'lsa animatsiyalar o'chadi.

Tezlikni o'zgartirish: `SmoothScroll.jsx` dagi `duration`, `Reveal.jsx` dagi `duration` / `stagger`.

## Sahifalar

- `/` — bosh sahifa (hero, kategoriyalar, tanlangan mahsulot, skinlar, kovriklar)
- `/katalog/skins`, `/katalog/kovriklar`, `/katalog/aksessuar`
- `/mahsulot/[id]` — mahsulot sahifasi
- `/parvarish` — kovrikni parvarish qilish
- `/yordam` — aloqa, qaytarish, oferta, maxfiylik

## Hostingga qo'yish
Eng oson yo'l — Vercel: GitHub'ga push qiling, vercel.com da import qiling,
Environment Variables ga TELEGRAM_* larni qo'shing.
