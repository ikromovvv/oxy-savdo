import BalansClient from './client';

export const metadata = {
  title: 'Balansga qarab CS2 skin tanlash',
  description: "Balansingizga mos eng ommabop CS2 skinlar va tayyor to'plamlar: bitta kuchli skin, qurol to'plami yoki arzon-mazali set.",
  alternates: { canonical: '/balans' },
  openGraph: { type: 'website', url: '/balans', title: 'Balansga qarab skin tanlash · OXY SAVDO' },
};

export default function Page() {
  return <BalansClient />;
}
