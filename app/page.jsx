import BuyCatalogHome from '@/components/BuyCatalogHome';

// Bosh sahifa = skinlar katalogi (kirishdan oldin ham skinlar darrov ko'rinadi).
// Eski "hero" bosh sahifa git tarixida (app/page.jsx, commit 07a9563 va undan oldin).
export default function Home() {
  return (
    <>
      <h1 className="sr-only">CS2 skinlarni so&apos;mda sotib oling — OXY SAVDO</h1>
      <BuyCatalogHome />
    </>
  );
}
