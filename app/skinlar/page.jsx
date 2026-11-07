import BuyCatalogHome from '@/components/BuyCatalogHome';

export const metadata = {
  title: 'CS2 skinlar',
  description:
    "CS2 skinlarini so'mda sotib oling: Payme yoki Click bilan to'lang, skin Steam trade orqali yetkaziladi.",
  alternates: { canonical: '/skinlar' },
  openGraph: { type: 'website', url: '/skinlar', title: 'CS2 skinlar · OXY SAVDO' },
};

export default function Page() {
  return <BuyCatalogHome />;
}
