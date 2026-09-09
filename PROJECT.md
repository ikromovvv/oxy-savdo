# OXY SAVDO — loyiha hujjati

CS2 skinlari + gaming kovriklari va aksessuarlar uchun onlayn do'kon/marketplace.
Foydalanuvchi skin sotib oladi (yoki inventaridan sotadi), to'lov UZS'da (Payme / Click),
skin avtomatik trade orqali yetkaziladi.

- **Prod:** https://oxy-savdo.vercel.app
- **Repo:** github.com/ikromovvv/oxy-savdo (`master` = prod)
- **Vercel:** `sardors-projects-e6d8ffaa/oxy-savdo` (Hobby plan)
- **Holat:** ✅ deploy qilingan, ishlayapti (oxirgi: stage 6, commit `6d6b783`)

---

## 1. Texnologiyalar

| Qatlam | Nima ishlatilgan |
|---|---|
| Framework | Next.js 14 (App Router), **JavaScript** (TypeScript emas) |
| UI | React 18, Tailwind CSS 3, GSAP (animatsiya), Lenis (smooth-scroll) |
| Ma'lumot | Neon **Postgres** (buyurtma + to'lov), Upstash **Redis KV** (kesh, mahsulotlar), lokalda `data/*.json` |
| Postgres klient | `postgres` (porsager) — `search_path=oxy` |
| Auth | Steam OpenID (HMAC-imzolangan cookie), admin parol (`ADMIN_PASSWORD`) |
| To'lov | Payme (JSON-RPC 2.0) + Click (prepare/complete, md5) — plagin adapterlar |
| Skin narxlari | Skinport public API (`api.skinport.com/v1/items`) |
| Skin rasm/rarity | ByMykel CSGO-API (GitHub raw) |
| Hosting | Vercel (serverless + Cron) |

---

## 2. Loyiha tuzilishi

```
app/                         Next.js App Router
  page.jsx                   Bosh sahifa (skin katalog + hero)
  katalog/[slug]/            Kategoriya: skins / kovriklar / aksessuar
  mahsulot/[id]/             Bitta mahsulot / skin sahifasi
  sotish/                    Steam inventarini sotish (login talab qiladi)
  parvarish/  yordam/        Statik sahifalar
  tolov/[ref]/               To'lovdan qaytish sahifasi (status polling)
  admin/                     Admin panel (alohida shell, sidebar + sahifalar)
  api/                       Barcha backend endpointlar (pastda)

components/
  Header / Footer / CartDrawer / StoreProvider   sayt chrome + savat state
  SkinCard / ProductCard / Gallery               katalog kartochkalari
  SmoothScroll / CursorFx / Magnetic / Reveal    animatsiya effektlari
  admin/                                          admin UI (Dashboard, Products, Orders, ui.jsx)

lib/
  db.js  dbSchema.js  dbMigrate.js               Postgres ulanish + migratsiya
  orderStore.js                                  Buyurtma + to'lov saqlash (Postgres yoki KV/fayl)
  productStore.js  products.js                   Kovrik/aksessuar mahsulotlari
  skinportFeed.js                                Skin katalogi (Skinport)
  skinImages.js  skinMeta.js                     Skin rasm / rarity / float / wear
  steamInventory.js  steamTrade.js  steamAuth.js Steam inventar + trade URL + OpenID
  session.js  adminAuth.js                       Cookie imzolash, admin auth
  payments.js  pay/payme.js  pay/click.js        To'lov abstraktsiyasi + adapterlar
  fulfillment.js  fulfill/{test,skinsback,waxpeer}.js   Auto-yetkazish
  kv.js                                          Upstash REST klienti
  rateLimit.js                                   Rate-limit (xotira + KV)
  i18n.js                                        UZ / RU tarjimalar

test/
  payments.test.mjs                              17 ta to'lov callback testi
  _resolver.mjs  _setup.mjs                      Node ESM loader hook (test uchun)

db/migrate.mjs                                   Lokal migratsiya CLI
vercel.json                                      Cron (kunlik fulfill)
```

---

## 3. Sahifalar

| URL | Tavsif |
|---|---|
| `/` | Bosh sahifa — skin katalogi, hero, feature kartalari |
| `/katalog/skins` | Skinlar (Skinport'dan, wear bar + rarity rang) |
| `/katalog/kovriklar`, `/katalog/aksessuar` | Kovrik / aksessuar mahsulotlari |
| `/mahsulot/[id]` | Bitta mahsulot/skin — galereya, narx, savatga qo'shish |
| `/sotish` | Steam login → inventar → sotish (narxlar Skinport, USD) |
| `/parvarish`, `/yordam` | Statik ma'lumot sahifalari |
| `/saqlangan` | Sevimlilar ro'yxati (localStorage) |
| `/tolov/[ref]` | To'lovdan qaytish — `/api/pay/status/[ref]` ni pollingga qo'yadi |
| `/admin` | Admin panel — login, Dashboard, Mahsulotlar, Buyurtmalar |

---

## 4. API endpointlar

### Ochiq (foydalanuvchi)
| Endpoint | Nima qiladi |
|---|---|
| `GET /api/skins` `?query&weaponType&wear&priceFrom&priceTo&sort&offset&limit` | Skin katalogi |
| `GET /api/skins/[id]` | Bitta skin + o'xshashlar |
| `GET /api/products` `?category` | Mahsulotlar |
| `GET /api/products/[id]` | Bitta mahsulot |
| `POST /api/orders` | Buyurtma yaratish (rate-limit: 12 / 5 daq / IP) |
| `GET /api/orders/[id]` | Buyurtma holati (ochiq, cheklangan maydonlar) |
| `GET /api/pay/status/[ref]` | To'lov holati (qaytish sahifasi uchun) |
| `GET /api/inventory` | Steam inventari + narxlar (login talab) |
| `GET /api/img/[id]` | KV'dagi rasmni uzatish |

### To'lov callbacklari (provayder chaqiradi)
| Endpoint | Provayder |
|---|---|
| `POST /api/pay/payme` | Payme Merchant API (JSON-RPC) |
| `POST /api/pay/click/prepare` | Click action=0 |
| `POST /api/pay/click/complete` | Click action=1 |
| `POST /api/pay/test/[ref]` | Test rejimi (faqat `NODE_ENV != production`) |

### Auth
| Endpoint | |
|---|---|
| `GET /api/auth/steam/login` → `/callback` → `/logout` | Steam OpenID |
| `GET /api/auth/me` | Joriy foydalanuvchi |

### Admin (cookie `oxy_admin` talab qiladi)
| Endpoint | |
|---|---|
| `POST /api/admin/login` | Parol (rate-limit: 8 / 5 daq / IP) |
| `POST /api/admin/logout`, `GET /api/admin/me` | |
| `GET /api/admin/orders` `?status` | Buyurtmalar ro'yxati |
| `PATCH /api/admin/orders/[id]` | `{status}` yoki `{action:'fulfill'|'poll'}` |
| `POST /api/admin/upload` | Rasm yuklash (KV'ga) |
| `GET|POST /api/admin/db-migrate` | Migratsiyani ishga tushirish (`MIGRATE_SECRET` bearer yoki admin) |

### Cron
| Endpoint | Jadval |
|---|---|
| `GET /api/fulfill/run` | `0 3 * * *` (har kuni 03:00 — Hobby plan faqat kunlik) |

---

## 5. Ma'lumot saqlash

Uch qatlamli, avtomatik tanlanadi:

1. **Postgres** (`DATABASE_URL` bor bo'lsa) — buyurtma va to'lovlar. `oxy` sxemasi.
2. **Upstash KV** (`KV_REST_API_URL` bor bo'lsa) — mahsulotlar, skin keshi, rasm, inventar keshi, rate-limit.
3. **Lokal fayl** `data/*.json` — hech biri bo'lmasa (faqat `npm run dev`).

Prod'da 1 va 2 ham ulangan. Buyurtmalar → Postgres, qolgani → KV.

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

oxy.payment_txns (              -- takroriy callback'ni bloklaydi
  id bigserial PK, order_id text FK,
  provider text, provider_txn_id text,
  action text, amount numeric(15,2), status text, raw jsonb,
  created_at, updated_at,
  UNIQUE (provider, provider_txn_id)
)

oxy._migrations (name text PK, applied_at timestamptz)
```

Migratsiya **birinchi so'rovda avtomatik** ishga tushadi (`ensureMigrations`).
Qo'lda: `npm run db:migrate` (lokal, `DATABASE_URL` kerak) yoki `/api/admin/db-migrate`.

### Buyurtma holat mashinasi
```
new → paid → fulfilling → sent → done
          ↘ cancelled / refunded
```
To'lov holati: `none → pending → paid → failed`

---

## 6. Autentifikatsiya

- **Foydalanuvchi:** Steam OpenID. Muvaffaqiyatdan keyin HMAC-imzolangan cookie
  (`lib/session.js`, `SESSION_SECRET` bilan). Balans/hisob jadvali YO'Q — faqat
  steamid + profil. Skin sotib olishda Trade URL so'raladi.
- **Admin:** `/admin` da parol (`ADMIN_PASSWORD`, timing-safe solishtirish).
  7 kunlik `oxy_admin` cookie. Sayt header/footer `/admin` da ko'rsatilmaydi.

---

## 7. To'lov tizimi

`PAYMENT_PROVIDER` env bilan boshqariladi:

| Qiymat | Xatti-harakat |
|---|---|
| `manual` (default) | Buyurtma `new` bo'lib qoladi, operator admin'da "To'landi" qiladi |
| `test` | Soxta to'lov, darhol `paid` (faqat dev) |
| `payme` | `PAYME_MERCHANT_ID` + `PAYME_KEY` kerak. Checkout: `checkout.paycom.uz` |
| `click` | `CLICK_SERVICE_ID` + `CLICK_MERCHANT_ID` + `CLICK_SECRET_KEY` kerak |

**Xavfsizlik:**
- Narx **serverda** hisoblanadi — client yuborgan `price` e'tiborsiz (`resolveItemPrices`).
- Callback amount har doim `order.total` bilan solishtiriladi.
- Takroriy callback `oxy.payment_txns` UNIQUE bilan bloklanadi (`{duplicate:true}`).
- Summa chegarasi: `ORDER_MIN_UZS` (5 000) … `ORDER_MAX_UZS` (100 000 000).
- Barcha callbacklar rate-limit ostida.
- Karta ma'lumoti hech qayerda saqlanmaydi/loglanmaydi (provayder o'z sahifasida oladi).

---

## 8. Auto-fulfillment (avtomatik yetkazish)

`FULFILL_PROVIDER` env: `manual` (default) | `test` | `skinsback` | `waxpeer`.

- To'lov `paid` bo'lgach `maybeAutoFulfill` chaqiriladi (agar provider ≠ manual).
- Provider skinni sotib oladi va foydalanuvchining Trade URL'iga yuboradi.
- `POST /api/fulfill/run` cron har kuni holatlarni tekshiradi (`pollFulfillment`).
- `manual` rejimda — operator admin'da "Yuborish" tugmasini bosadi.

Hozir prod'da `manual` — real fulfill kaliti qo'yilmagan.

---

## 9. Skin katalogi manbai

- **Narx:** Skinport `/v1/items` — 1 ta so'rov, KV'da 30 daq keshlanadi
  (rate limit ~8 so'rov / 5 daq). USD → UZS `USD_UZS` (12700) bilan.
- Eng ko'p mavjud ~2000 skin olinadi (`SKINS_MAX_ITEMS`).
- **Rasm / rarity / float oralig'i:** ByMykel CSGO-API (`getSkinMeta`).
- `SKINS_ENABLED=false` — skinlarni umuman o'chiradi.
- Eski LIS-SKINS to'liq eksporti Vercel'da OOM berardi — Skinport bilan almashtirilgan.

---

## 10. Environment o'zgaruvchilari

Vercel → Settings → Environment Variables. `.env.local` — lokal (Vercel-managed, `vercel env pull`).

### Majburiy (prod)
| Var | Tavsif |
|---|---|
| `SESSION_SECRET` | Cookie imzolash kaliti (prod'da majburiy) |
| `ADMIN_PASSWORD` | Admin panel paroli |
| `STEAM_API_KEY` | Steam OpenID / profil |

### Ma'lumot bazasi (Neon integratsiyasi avtomatik qo'yadi)
| Var | |
|---|---|
| `DATABASE_URL` | Neon pooled ulanish satri — **bor** ✅ |
| `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `PGHOST` … | Neon qo'shimchalari |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash KV — **bor** ✅ |

### To'lov (real to'lov yoqilganda)
| Var | |
|---|---|
| `PAYMENT_PROVIDER` | `manual` / `test` / `payme` / `click` |
| `PAYMENT_RETURN_URL_BASE` | `https://oxy-savdo.vercel.app` (ixtiyoriy) |
| `PAYME_MERCHANT_ID`, `PAYME_KEY` | Payme kabinetidan |
| `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY`, `CLICK_MERCHANT_USER_ID` | Click kabinetidan |

### Fulfillment
| Var | |
|---|---|
| `FULFILL_PROVIDER` | `manual` / `test` / `skinsback` / `waxpeer` |
| `SKINSBACK_*` / `WAXPEER_API_KEY` | Tegishli provider kalitlari |

### Sozlash (ixtiyoriy)
| Var | Default |
|---|---|
| `USD_UZS` | `12700` |
| `SKINS_MAX_ITEMS` | `2000` |
| `SKINS_ENABLED` | `true` |
| `ORDER_MIN_UZS` / `ORDER_MAX_UZS` | `5000` / `100000000` |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | yangi buyurtma xabarnomasi |
| `MIGRATE_SECRET` | `/api/admin/db-migrate` uchun bearer |

---

## 11. Buyruqlar

```bash
npm run dev          # lokal server (http://localhost:3000)
npm run build        # prod build
npm start            # build'dan keyin ishga tushirish
npm run lint         # ESLint
npm test             # to'lov callback testlari (17 ta, node:test)
npm run db:migrate   # Postgres migratsiya (lokal, DATABASE_URL kerak)
```

---

## 12. Lokal ishga tushirish

```bash
npm install
# .env.local yarating (kamida):
#   SESSION_SECRET=xohlagan-uzun-satr
#   ADMIN_PASSWORD=parol
#   STEAM_API_KEY=...            (Steam login uchun)
npm run dev
```

`DATABASE_URL` / KV kalitlarisiz — hammasi `data/*.json` ga yoziladi (git' da e'tiborsiz).
Admin: `http://localhost:3000/admin`.

---

## 13. Deploy qilish

GitHub `master` ga push → Vercel avtomatik deploy **(ba'zan ishlamaydi)**.
Ishonchli yo'l — qo'lda:

```bash
git push
npx vercel --prod --yes
npx vercel inspect oxy-savdo.vercel.app   # alias yangi deploy'ga o'tganini tekshirish
```

> Eslatma: `vercel --prod` ba'zan deploy qiladi-yu, `oxy-savdo.vercel.app`
> aliasini yangilamaydi — `inspect` bilan tekshiring, kerak bo'lsa qayta yuboring.

---

## 14. Xavfsizlik holati (bosqichma-bosqich bajarilgan)

| # | Nima | Commit |
|---|---|---|
| 1 | Postgres poydevori — Neon, `oxy` sxema, migratsiya runner | `3ebae68` |
| 2 | `orderStore` Postgres'da — `sql.begin` + `FOR UPDATE`, KV fallback | `31dadf5` |
| 3 | Narx avtoriteti — client `price` e'tiborsiz | `8335257` |
| 4 | Idempotent callbacklar — `payment_txns` UNIQUE + `ON CONFLICT` | `b56454c` |
| 5 | Summa chegaralari + rate-limit | `b30b1c3` |
| 6 | Callback testlari — 17 ta | `6d6b783` |

---

## 15. Nima qo'shish/qilish mumkin (keyingi qadamlar)

**To'lovni real yoqish**
- Payme yoki Click kabinetidan test kalitlarini olib env'ga qo'ying,
  `PAYMENT_PROVIDER=payme` (yoki `click`).
- Payme kabinetida endpoint: `https://oxy-savdo.vercel.app/api/pay/payme`
- Click kabinetida: `.../api/pay/click/prepare` va `.../complete`

**Auto-fulfillment yoqish**
- SkinsBack yoki Waxpeer akkaunt + API kaliti → `FULFILL_PROVIDER=skinsback` (yoki `waxpeer`).
- Bot Steam akkaunti (skinlarni ushlab turadigan) sozlanishi kerak.

**Mahsulotlarni Postgres'ga ko'chirish** (ixtiyoriy, reja item 7)
- Hozir kovrik/aksessuar KV'da — istasa `oxy.products` jadvaliga ko'chirsa bo'ladi.

**Boshqa g'oyalar**
- Foydalanuvchi "Mening buyurtmalarim" sahifasi (hozir faqat `ref` bo'yicha status).
- Admin'da tushum grafigi / eksport (CSV).
- Skin qidiruvni tezlashtirish (server-side full-text).
- Narxni bir nechta manbadан (Skinport + CSFloat) o'rtacha olish.
- E-mail / SMS xabarnoma (hozir faqat Telegram).
- Domen ulash (`oxy.uz` kabi) — Vercel → Domains.

---

## 16. Ma'lum eslatmalar / tuzoqlar

- **`.next` buzilishi:** dev/preview server ishlab turганда `next build` qilsa,
  `.next` buziladi → 404 chunk'lar. Yechim: preview'ni to'xtat → `rm -rf .next` → qayta ishga tushir.
- **Hobby plan cron faqat kunlik** — `vercel.json` da soatlik jadval deploy'ni rad etadi.
- **GitHub→Vercel auto-deploy ishonchsiz** — qo'lda `vercel --prod` qiling.
- **`vercel env pull` `.env.local` ni qayta yozadi** — izoh/tuzilma yo'qoladi.
  `DATABASE_URL` `[SENSITIVE]` bo'lib keladi (lokal migratsiya uchun Neon'dan qo'lda oling).
- **Steam inventar 429** — Steam IP bo'yicha bloklaydi, ~15-30 daq o'zi ochiladi.
  KV'da oxirgi yaxshi nusxa 6 soat saqlanadi (`stale` bayrog'i bilan ko'rsatiladi).
- **Skinport rate limit** ~8 so'rov / 5 daq — shuning uchun katalog 30 daq keshlanadi.
