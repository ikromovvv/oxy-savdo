import EarnClient from './client';

export const metadata = {
  title: 'Pul ishlash',
  description: "OXY SAVDO bilan daromad qilish: skinlaringizni soting, rozigrishlarda qatnashing yoki hamkor bo'ling.",
  alternates: { canonical: '/pul-ishlash' },
  openGraph: { type: 'website', url: '/pul-ishlash', title: 'Pul ishlash · OXY SAVDO' },
};

export default function Page() {
  return <EarnClient />;
}
