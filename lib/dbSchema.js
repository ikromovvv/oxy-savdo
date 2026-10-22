// Postgres migratsiyalari — bitta manba (JS). Ham CLI (db/migrate.mjs), ham
// /api/admin/db-migrate route shundan foydalanadi.
//
// DIQQAT: neon-charcoal-village boshqa loyihalar bilan bo'lishilgan bo'lishi
// mumkin — shuning uchun HAMMA narsa "oxy" sxemasi ichida (public'ga tegmaymiz).

export const DB_SCHEMA = 'oxy';

export const MIGRATIONS = [
  {
    name: '001_orders',
    sql: `
      create schema if not exists oxy;

      create table if not exists oxy.orders (
        id           text primary key,
        ref          text not null unique,
        status       text not null default 'new',
        customer     jsonb not null default '{}'::jsonb,
        steam        jsonb,
        trade_url    text,
        items        jsonb not null default '[]'::jsonb,
        total        numeric(15,2) not null default 0,
        note         text,
        admin_note   text,
        payment      jsonb not null default '{}'::jsonb,
        fulfillment  jsonb not null default '{}'::jsonb,
        history      jsonb not null default '[]'::jsonb,
        created_at   timestamptz not null default now(),
        updated_at   timestamptz not null default now()
      );

      create index if not exists orders_status_idx  on oxy.orders (status);
      create index if not exists orders_created_idx on oxy.orders (created_at desc);

      -- Har bir provider (Payme/Click) callback shu jadvalga yoziladi.
      -- UNIQUE(provider, provider_txn_id) takroriy callback'ni bloklaydi.
      create table if not exists oxy.payment_txns (
        id               bigserial primary key,
        order_id         text references oxy.orders(id) on delete set null,
        provider         text not null,
        provider_txn_id  text not null,
        action           text not null,
        amount           numeric(15,2),
        status           text not null default 'pending',
        raw              jsonb,
        created_at       timestamptz not null default now(),
        updated_at       timestamptz not null default now(),
        unique (provider, provider_txn_id)
      );

      create index if not exists payment_txns_order_idx on oxy.payment_txns (order_id);
    `,
  },
  {
    // Hamyon (balans): faqat server o'zgartiradi. Har bir o'zgarish ledger
    // (wallet_txns) ga yoziladi, (provider, provider_txn_id) UNIQUE takroriy
    // to'ldirish / yechishni bloklaydi, balans hech qachon manfiy bo'lmaydi.
    name: '002_wallet',
    sql: `
      create table if not exists oxy.wallets (
        steamid     text primary key,
        balance     numeric(15,2) not null default 0 check (balance >= 0),
        created_at  timestamptz not null default now(),
        updated_at  timestamptz not null default now()
      );

      create table if not exists oxy.wallet_txns (
        id               bigserial primary key,
        steamid          text not null,
        kind             text not null,
        amount           numeric(15,2) not null,
        balance_after    numeric(15,2) not null,
        ref              text,
        provider         text not null default 'wallet',
        provider_txn_id  text not null,
        note             text,
        created_at       timestamptz not null default now(),
        unique (provider, provider_txn_id)
      );

      create index if not exists wallet_txns_user_idx on oxy.wallet_txns (steamid, id desc);
    `,
  },
  {
    // Telegram kanaldagi skin e'lonlari (webhook yoki ochiq sahifadan o'qish).
    name: '003_tg_posts',
    sql: `
      create table if not exists oxy.tg_posts (
        id           text primary key,            -- 'kanal/xabar_id', masalan oxyskinshop/34
        channel      text not null,
        msg_id       integer not null,
        posted_at    timestamptz not null default now(),
        raw_text     text not null default '',
        name         text,
        stattrak     boolean not null default false,
        souvenir     boolean not null default false,
        quality      text,                        -- FN | MW | FT | WW | BS
        float_value  numeric(8,6),
        price_uzs    numeric(15,2),
        price_usd    numeric(12,2),
        price_raw    text,
        status       text not null default 'available',  -- available | sold | deleted | meta
        unban        text,
        no_ban       boolean not null default false,
        contact      text,
        image_url    text,
        file_id      text,
        source       text,
        updated_at   timestamptz not null default now()
      );

      create index if not exists tg_posts_status_idx on oxy.tg_posts (status, posted_at desc);
      create index if not exists tg_posts_file_idx on oxy.tg_posts (file_id);
    `,
  },
];
