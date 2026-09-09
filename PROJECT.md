# OXY SAVDO — loyiha hujjati

CS2 skinlari + gaming kovriklari va aksessuarlar uchun onlayn marketplace.
Xaridor skin sotib oladi (yoki inventaridan sotadi), to'lov UZS'da (Payme / Click),
skin avtomatik Steam trade orqali yetkaziladi.

- **Prod:** https://oxy-savdo.vercel.app
- **Repo:** github.com/ikromovvv/oxy-savdo (`master` = prod)
- **Vercel:** `sardors-projects-e6d8ffaa/oxy-savdo` (Hobby plan)
- **Holat:** ✅ ishlayapti. Kod tomondan production'ga tayyor. Qolgani — tashqi
  hisoblar (domen, Payme/Click kalitlari, skin-provider + Steam bot).

Asosiy oqim:
```
User → Steam login → skin tanlaydi → savat → checkout (trade URL)
     → Payme/Click → to'lov callback → PAID
     → auto fulfillment → Steam trade offer → SENT → user qabul qiladi → DONE
```

---

## 1. Texnologiyalar

| Qatlam | Nima |
|---|---|
| Framework | Next.js 14 App Router, **JavaScript** (TS emas) |
| UI | React 18, Tailwind CSS 3, GSAP, Lenis smooth-scroll |
| Ma'lumot | Neon **Postgres** (buyurtma + to'lov), Upstash **Redis KV** (kesh/mahsulot), lokalda `data/*.json` |
| Postgres klient | `postgres` (porsager), `search_path=oxy` |
| Auth | Steam OpenID (HMAC-imzolangan cookie) + admin parol |
| To'lov | Payme (JSON-RPC 2.0) + Click (prepare/complete, md5) — plagin adapterlar |
| Skin narx | Skinport public API (`api.skinport.com/v1/items`) |
| Skin rasm/rarity | ByMykel CSGO-API (GitHub raw) |
| Testlar | `node:test` (kutubxonasiz), 25 ta |
| Hosting | Vercel serverless + Cron |

---

## 2. Loyiha tuzilishi

```
app/
  page.jsx                       Bosh sahifa — skin katalogi + hero
  katalog/[slug]/
    page.jsx  (server)           generateMetadata (SEO)
    client.jsx                   kategoriya ro'yxati (loading/error/empty)
  mahsulot/[id]/
    page.jsx  (server)           generateMetadata: skin/mahsulot title+narx+canonical+OG
    client.jsx                   mahsulot/skin sahifasi (404 vs retry ajratilgan)
  sotish/page.jsx                Steam inventarini sotish (login talab)
  buyurtmalarim/page.jsx         "Mening buyurtmalarim" + delivery timeline (login talab)
  tolov/[ref]/page.jsx           to'lovdan qaytish (status polling)
  parvarish/ yordam/            statik
  saqlangan/page.jsx             sevimlilar (localStorage)
  admin/page.jsx                 admin panel shell (sidebar + 4 bo'lim)
  sitemap.js  robots.js  icon.svg   SEO fayllari
  api/...                        backend (3-bo'lim)

components/
  Header / Footer / CartDrawer / StoreProvider   chrome + savat state
  SkinCard / ProductCard / Gallery / BuyCatalogHome
  SmoothScroll / CursorFx / Magnetic / Reveal / SteamLoginGate
  admin/  AdminDashboard  AdminOrders  AdminProducts  AdminFailed  ui.jsx

lib/
  db.js dbSchema.js dbMigrate.js       Postgres ulanish + migratsiya
  orderStore.js                        buyurtma + to'lov (Postgres yoki KV/fayl)
  productStore.js products.js          kovrik/aksessuar
  skinportFeed.js                      skin katalogi (Skinport, kesh)
  skinImages.js skinMeta.js            rasm / rarity / float / wear
  steamInventory.js steamTrade.js steamAuth.js steamMobile.js
  session.js adminAuth.js              cookie imzolash, admin auth
  payments.js  pay/payme.js  pay/click.js
  fulfillment.js  fulfill/{test,skinsback,waxpeer}.js
  kv.js                                Upstash REST klienti
  rateLimit.js                         rate-limit (xotira + KV)
  i18n.js                              UZ / RU

test/
  payments.test.mjs                    17 ta — to'lov callbacklari
  fulfillment.test.mjs                 8 ta — auto-yetkazish + retry
  _resolver.mjs  _setup.mjs            ESM loader hook (test uchun)

db/migrate.mjs                         lokal migratsiya CLI
vercel.json                            Cron (kunlik fulfill recovery)
```

---

## 3. API endpointlar

### Ochiq (foydalanuvchi)
| Endpoint | Nima | Cheklov |
|---|---|---|
| `GET /api/skins` `?query&weaponType&wear&priceFrom&priceTo&sort&offset&limit` | skin katalogi | — |
| `GET /api/skins/[id]` | bitta skin + o'xshashlar | — |
| `GET /api/products` `?category` | mahsulotlar | — |
| `GET /api/products/[id]` | bitta mahsulot | — |
| `POST /api/orders` | buyurtma yaratish (steam sessiyadan olinadi) | 12 / 5 daq / IP |
| `GET /api/orders/[id]` | buyurtma holati (ochiq, cheklangan) | — |
| `GET /api/my/orders` | **kirgan foydalanuvchining** buyurtmalari | sessiya |
| `GET /api/pay/status/[ref]` | to'lov holati (qaytish sahifasi) | — |
| `GET /api/inventory` | Steam inventari + narx | sessiya |
| `GET /api/img/[id]` | KV'dagi rasm | — |

### To'lov callbacklari (provayder chaqiradi)
| Endpoint | Provayder | Cheklov |
|---|---|---|
| `POST /api/pay/payme` | Payme JSON-RPC | 120 / daq / IP |
| `POST /api/pay/click/prepare` | Click action=0 | 120 / daq / IP |
| `POST /api/pay/click/complete` | Click action=1 | 120 / daq / IP |
| `POST /api/pay/test/[ref]` | test rejimi (faqat `NODE_ENV != production`) | 20 / daq / IP |

### Auth
`GET /api/auth/steam/login` → `/callback` → `/logout` · `GET /api/auth/me`

### Admin (cookie `oxy_admin`)
| Endpoint | Nima | Cheklov |
|---|---|---|
| `POST /api/admin/login` | parol (timing-safe) | 8 / 5 daq / IP |
| `POST /api/admin/logout` · `GET /api/admin/me` | | |
| `GET /api/admin/stats` | dashboard aggregatlari (counts, revenue, 30-kun seriya, recent) | admin |
| `GET /api/admin/orders` `?status=&fulfillment=error` | buyurtmalar | admin |
| `PATCH /api/admin/orders/[id]` | `{status}` / `{action:'fulfill', force?}` / `{action:'poll'}` | admin |
| `POST /api/admin/upload` | rasm → KV | admin |
| `GET\|POST /api/admin/db-migrate` | migratsiya (`MIGRATE_SECRET` bearer yoki admin) | |

### Cron
| Endpoint | Jadval | Rol |
|---|---|---|
| `GET /api/fulfill/run` | `0 3 * * *` (Hobby faqat kunlik) | **backup/recovery** — stuck `fulfilling` ni poll qiladi, `error` larni backoff bilan qayta urinadi |

Asosiy yetkazish — to'lov muvaffaqiyatidan **darhol** (`maybeAutoFulfill`). Cron faqat tiklash uchun.

---

## 4. Ma'lumot saqlash

3 qatlam, avtomatik tanlanadi:
1. **Postgres** (`DATABASE_URL` bor) — buyurtma + to'lov. `oxy` sxemasi. ✅ prod'da ulangan
2. **Upstash KV** (`KV_REST_API_URL` bor) — mahsulot, skin keshi, rasm, inventar keshi, rate-limit. ✅ prod'da ulangan
3. **Lokal fayl** `data/*.json` — hech biri bo'lmasa (faqat `npm run dev`)

### Postgres sxemasi (`oxy`)
```sql
oxy.orders (
  id text PK, ref text UNIQUE, status text,
  customer jsonb, steam jsonb, trade_url text,
  items jsonb, total numeric(15,2),
  note text, admin_note text,
  payment jsonb, fulfillment jsonb, history jsonb,
  created_at timestamptz, updated_at timestamptz
)
oxy.payment_txns (                       -- takroriy callback'ni bloklaydi
  id bigserial PK, order_id text FK,
  provider text, provider_txn_id text, action text,
  amount numeric(15,2), status text, raw jsonb, ...,
  UNIQUE (provider, provider_txn_id)
)
oxy._migrations (name text PK, applied_at timestamptz)
```
Migratsiya **birinchi so'rovda avtomatik** ishga tushadi (`ensureMigrations`).
Qo'lda: `npm run db:migrate` (lokal) yoki `/api/admin/db-migrate`.

### Buyurtma holat mashinasi
```
new ─▶ pending ─▶ paid ─▶ fulfilling ─▶ sent ─▶ done
                    └────────┴────────┴──▶ cancelled / refunded
```
- `new` — yaratildi (manual to'lov)
- `pending` — Payme/Click havolasi yaratildi, to'lov kutilmoqda
- `paid` — to'lov tasdiqlandi (`new` yoki `pending` dan)
- `fulfilling` / `sent` / `done` — auto-yetkazish bosqichlari

To'lov holati: `none → pending → paid → failed`
Fulfillment: `none → processing → sent → done` (yoki `error` + retry)

---

## 5. Autentifikatsiya

- **Foydalanuvchi:** Steam OpenID → HMAC-imzolangan cookie (`SESSION_SECRET`).
  Balans/hisob jadvali **yo'q** — faqat steamid + profil. Skin xaridida Trade URL so'raladi.
  `POST /api/orders` steamid'ni **sessiyadan** oladi (client yuborganiga ishonmaydi).
- **Admin:** `/admin` da parol (`ADMIN_PASSWORD`, timing-safe). 7 kunlik `oxy_admin` cookie.
  Sayt header/footer `/admin` da ko'rsatilmaydi.

---

## 6. To'lov tizimi

`PAYMENT_PROVIDER` env:

| Qiymat | Xatti-harakat |
|---|---|
| `manual` (default) | buyurtma `new`, operator admin'da "To'landi" qiladi |
| `test` | soxta to'lov, darhol `paid` (faqat dev) |
| `payme` | `PAYME_MERCHANT_ID` + `PAYME_KEY` kerak |
| `click` | `CLICK_SERVICE_ID` + `CLICK_MERCHANT_ID` + `CLICK_SECRET_KEY` kerak |

**Xavfsizlik (audit spec bo'yicha bajarilgan):**
- Narx **serverda** hisoblanadi — client `price` e'tiborsiz (`resolveItemPrices`: mahsulot → productStore, skin → Skinport)
- Callback amount har doim `order.total` bilan solishtiriladi (payme + click)
- Takroriy callback `oxy.payment_txns` UNIQUE + `ON CONFLICT DO NOTHING` bilan bloklanadi → `{duplicate:true}`, holat qayta o'zgarmaydi, Telegram qayta yubormaydi, auto-fulfill qayta ishga tushmaydi
- Summa chegarasi: `ORDER_MIN_UZS` (5 000) … `ORDER_MAX_UZS` (100 000 000)
- Barcha callbacklar rate-limit ostida
- Karta ma'lumoti hech qayerda saqlanmaydi/loglanmaydi (provayder o'z sahifasida oladi)
- `steamid` login sessiyadan tekshiriladi

Payme kabinetida endpoint: `https://oxy-savdo.vercel.app/api/pay/payme`
Click: `.../api/pay/click/prepare` va `.../complete`

---

## 7. Auto-fulfillment (avtomatik yetkazish)

`FULFILL_PROVIDER` env: `manual` (default) | `test` | `skinsback` | `waxpeer`

- To'lov `paid` bo'lgach `maybeAutoFulfill` darhol chaqiriladi (provider ≠ manual bo'lsa)
- Provider skinni sotib oladi va xaridorning Trade URL'iga yuboradi
- **Retry tizimi:** `fulfillment` obyektida `attempts`, `lastAttemptAt`, `lastError`, `nextRetryAt`, `exhausted`
  - Eksponensial backoff: 5 daq → 10 → 20 → 40 … (maks 6 soat)
  - `FULFILL_MAX_RETRIES` (default 5) — limitdan keyin `exhausted:true`, avtomatik to'xtaydi (**cheksiz sikl yo'q**)
  - Xato → Telegram: `⚠️ Yetkazish xatosi — OXY-… / Urinish #N`; limitda `❗️ Qo'lda aralashuv kerak`
- Cron (`/api/fulfill/run`) har kuni backoff'ni hurmat qilib qayta urinadi + stuck'larni poll qiladi
- Admin panel → **"Yetkazish xatolari"** bo'limida har bir xato + **"Majburan qayta urinish"** (backoff/limitni chetlab o'tadi)
- `manual` rejimda — operator admin'da "Avtomatik yetkazish" / status tugmalari

Hozir prod'da `manual` — real provider kaliti qo'yilmagan.

---

## 8. Skin katalogi

- **Narx:** Skinport `/v1/items` — 1 so'rov, KV'da 30 daq kesh (limit ~8 so'rov / 5 daq). USD → UZS `USD_UZS` (12700)
- Eng ko'p mavjud ~2000 skin (`SKINS_MAX_ITEMS`)
- **Rasm / rarity / float:** ByMykel CSGO-API (`getSkinMeta`)
- `SKINS_ENABLED=false` — skinlarni o'chiradi
- Eski LIS-SKINS to'liq eksporti Vercel'da OOM berardi — Skinport bilan almashtirilgan

---

## 9. SEO

- Root metadata: `metadataBase`, title shablon (`%s · OXY SAVDO`), keywords, OpenGraph, Twitter card, robots
- Dynamic metadata: mahsulot/skin sahifasi — nom + narx + tavsif + canonical + OG; kategoriya — nom + canonical
- `app/sitemap.js` → `/sitemap.xml` — statik + barcha mahsulot + top ~600 skin (prod'da ~613 URL), har soatda yangilanadi
- `app/robots.js` → `/robots.txt` — `/admin` `/api/` `/buyurtmalarim` `/tolov/` yopiq, sitemap + host
- `app/icon.svg` — favicon (Next avtomatik ulaydi)

---

## 10. Environment o'zgaruvchilari

Vercel → Settings → Environment Variables. `.env.local` — lokal (Vercel-managed, `vercel env pull`).

### Majburiy (prod)
| Var | Tavsif | Holat |
|---|---|---|
| `SESSION_SECRET` | cookie imzolash | ✅ |
| `ADMIN_PASSWORD` | admin panel paroli | ✅ |
| `STEAM_API_KEY` | Steam OpenID / profil | ✅ |

### Ma'lumot bazasi (Neon + Upstash integratsiyasi avtomatik qo'yadi)
| Var | Holat |
|---|---|
| `DATABASE_URL` (+ `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `PGHOST`…) | ✅ |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | ✅ |

### To'lov (real to'lov yoqilganda — ⏳)
| Var | |
|---|---|
| `PAYMENT_PROVIDER` | `manual` / `test` / `payme` / `click` |
| `PAYMENT_RETURN_URL_BASE` | `https://oxy-savdo.vercel.app` (ixtiyoriy) |
| `PAYME_MERCHANT_ID`, `PAYME_KEY` | Payme kabinetidan |
| `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY`, `CLICK_MERCHANT_USER_ID` | Click kabinetidan |

### Fulfillment (⏳)
| Var | |
|---|---|
| `FULFILL_PROVIDER` | `manual` / `test` / `skinsback` / `waxpeer` |
| `FULFILL_MAX_RETRIES` | default 5 |
| `SKINSBACK_SHOP_ID`, `SKINSBACK_SECRET` / `WAXPEER_API_KEY` | provider kaliti |
| `FULFILL_CRON_SECRET` | `/api/fulfill/run` bearer (ixtiyoriy) |

### Sozlash (ixtiyoriy)
| Var | Default |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://oxy-savdo.vercel.app` (SEO canonical/OG uchun) |
| `USD_UZS` | `12700` |
| `SKINS_MAX_ITEMS` | `2000` |
| `SKINS_ENABLED` | `true` |
| `ORDER_MIN_UZS` / `ORDER_MAX_UZS` | `5000` / `100000000` |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | yangi buyurtma + yetkazish xatosi xabari |
| `MIGRATE_SECRET` | `/api/admin/db-migrate` bearer |

---

## 11. Buyruqlar

```bash
npm run dev          # lokal server (http://localhost:3000)
npm run build        # prod build
npm start            # build'dan keyin
npm run lint         # ESLint (interaktiv sozlash so'raydi — hozir ishlatilmaydi)
npm test             # barcha testlar (25 ta: payment 17 + fulfillment 8)
npm run db:migrate   # Postgres migratsiya (lokal, DATABASE_URL kerak)
```

---

## 12. Lokal ishga tushirish

```bash
npm install
# .env.local (kamida):
#   SESSION_SECRET=xohlagan-uzun-satr
#   ADMIN_PASSWORD=parol
#   STEAM_API_KEY=...
npm run dev
```
`DATABASE_URL` / KV'siz — hammasi `data/*.json` ga yoziladi (git'da e'tiborsiz).
Admin: `http://localhost:3000/admin`.

---

## 13. Deploy

GitHub `master` ga push → Vercel avtomatik deploy **(ba'zan ishlamaydi)**. Ishonchli yo'l:
```bash
git push
npx vercel --prod --yes
npx vercel inspect oxy-savdo.vercel.app   # alias yangi deploy'ga o'tganini tekshirish
```
> `vercel --prod` ba'zan deploy qiladi-yu aliasni yangilamaydi — `inspect` bilan tekshiring, kerak bo'lsa qayta yuboring.

---

## 14. Bajarilgan ishlar (commitlar bo'yicha)

### Xavfsizlik poydevori (1–6 bosqich)
| # | Ish | Commit |
|---|---|---|
| 1 | Postgres poydevori — Neon, `oxy` sxema, migratsiya runner | `3ebae68` |
| 2 | `orderStore` Postgres'da — `sql.begin` + `FOR UPDATE`, KV fallback | `31dadf5` |
| 3 | Narx avtoriteti — client `price` e'tiborsiz | `8335257` |
| 4 | Idempotent callbacklar — `payment_txns` UNIQUE + `ON CONFLICT` | `b56454c` |
| 5 | Summa chegaralari + rate-limit | `b30b1c3` |
| 6 | Callback testlari (17 ta) | `6d6b783` |

### Production readiness (A–E)
| # | Ish | Commit |
|---|---|---|
| — | `pending` holati + fulfillment **retry tizimi** (backoff, limit, Telegram) | `8f579de` |
| A | `/buyurtmalarim` + delivery timeline; `steamid` sessiyadan | `0fb275b` |
| B | Admin dashboard (8 stat + tushum grafik) + buyurtma qidiruv/filtr | `a92b1c6` |
| C | "Yetkazish xatolari" bo'limi + force retry + CSV eksport | `4173dc6` |
| D | SEO — dynamic metadata, sitemap, robots, favicon | `244a29e` |
| E | Fulfillment testlari (8 ta) + loading/error/empty auditi | `fffc200` |

---

## 15. Nima qilish mumkin (keyingi qadamlar)

### ⏳ Real to'lov yoqish
1. Payme yoki Click kabinetidan **test kalitlarini** oling
2. Vercel env: `PAYMENT_PROVIDER=payme` (yoki `click`) + tegishli `PAYME_*` / `CLICK_*`
3. Kabinetda callback URL'larni ko'rsating (6-bo'lim)
4. `test/payments.test.mjs` allaqachon oqimni qoplaydi; real sinov to'lovini o'tkazing

### ⏳ Auto-fulfillment yoqish
1. SkinsBack yoki Waxpeer B2B akkaunt + API kaliti
2. Skinlarni ushlab turadigan **Steam bot akkaunti** (2FA, sessiya) sozlanishi kerak
3. Vercel env: `FULFILL_PROVIDER=skinsback` (yoki `waxpeer`) + kalitlar
4. `lib/fulfill/skinsback.js` / `waxpeer.js` dagi imzo tartibi va endpoint'larni provayder hujjatiga moslang

### ⏳ Custom domain
- `oxy.uz` (yoki boshqa) sotib oling → Vercel → Domains → qo'shing → DNS ko'rsating
- Vercel env: `NEXT_PUBLIC_SITE_URL=https://oxy.uz` (SEO canonical/OG uchun)
- `PAYMENT_RETURN_URL_BASE=https://oxy.uz`

### Ixtiyoriy yaxshilanishlar
- Mahsulotlarni `oxy.products` jadvaliga ko'chirish (hozir KV'da)
- Admin'da tushum eksporti (CSV allaqachon bor), oylik hisobot
- E-mail / SMS xabarnoma (hozir faqat Telegram)
- Skin narxini bir nechta manbadan (Skinport + CSFloat) o'rtacha olish
- Skin qidiruvni server-side full-text qilish
- Steam trade offer holatini real-time kuzatish (bot bo'lsa)

---

## 16. Ma'lum eslatmalar / tuzoqlar

- **`.next` buzilishi:** dev/preview server ishlab turганда `next build` qilsa `.next` buziladi → 404 chunk. Yechim: preview to'xtat → `rm -rf .next` → qayta ishga tushir.
- **Hobby plan cron faqat kunlik** — `vercel.json` da soatlik jadval deploy'ni rad etadi.
- **GitHub→Vercel auto-deploy ishonchsiz** — qo'lda `vercel --prod`, alias promotion `inspect` bilan tekshiring.
- **`vercel env pull` `.env.local` ni qayta yozadi** — izohlar yo'qoladi; `DATABASE_URL` `[SENSITIVE]` bo'lib keladi (lokal migratsiya uchun Neon konsolidan qo'lda oling).
- **Steam inventar 429** — Steam IP bo'yicha bloklaydi, ~15–30 daq o'zi ochiladi. KV'da oxirgi yaxshi nusxa 6 soat (`stale` bayrog'i bilan ko'rsatiladi).
- **Skinport rate limit** ~8 so'rov / 5 daq — katalog 30 daq keshlanadi; `/sitemap.xml` shu keshdan foydalanadi.
- **`npm run lint`** interaktiv sozlash so'raydi (ESLint hali init qilinmagan) — hozircha `npm test` + `npm run build` bilan tekshiriladi.
- **Test seam'lari:** `FULFILL_TEST_MODE` (`ok`/`fail`/`slow`) va `skinportFeed.__seedCatalogForTest` — faqat testlar uchun, production'ga ta'sir qilmaydi.
