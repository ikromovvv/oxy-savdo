'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useStore } from '@/components/StoreProvider';
import SkinCard from '@/components/SkinCard';
import SteamLoginGate from '@/components/SteamLoginGate';

export default function SaqlanganPage() {
  const { t, favorites, user, userLoading } = useStore();

  // favorites — endi to'liq mahsulot "snapshot"i (skinlar statik ro'yxatda
  // emas, shuning uchun qayta so'rovsiz shu yerdan to'g'ridan-to'g'ri ko'rsatamiz)
  const items = useMemo(() => favorites.filter((f) => f.name), [favorites]);

  if (!userLoading && !user) {
    return <SteamLoginGate title={t('saved_title')} subtitle={t('saved_subtitle')} />;
  }

  return (
    <section className="container-site py-10">
      <div className="mb-8">
        <span className="label">OXY</span>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{t('saved_title')}</h1>
        <p className="mt-2 max-w-lg text-sm text-muted">{t('saved_subtitle')}</p>
      </div>

      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-muted">{t('saved_empty')}</p>
          <Link href="/" className="btn-ghost mt-5 inline-flex">
            ← {t('saved_back')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <SkinCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
