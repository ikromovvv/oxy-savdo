import { Suspense } from 'react';
import SetClient from './client';

export const metadata = {
  title: "Skin to'plami · balansga qarab",
  description: "Balansingizga mos tayyor CS2 skin to'plami: tarkibi, jami narxi va savatga qo'shish.",
  robots: { index: false, follow: true },
};

export default function Page({ params }) {
  return (
    <Suspense fallback={null}>
      <SetClient setKey={params.key} />
    </Suspense>
  );
}
