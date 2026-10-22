import TelegramSkinsClient from './client';

export const metadata = {
  title: 'Telegram skinlar',
  description:
    "Telegram kanalimizdagi float skinlar: nom, sifat, aniq float, narx va unban sanasi. Admin orqali sotib oling.",
  alternates: { canonical: '/telegram-skinlar' },
  openGraph: { type: 'website', url: '/telegram-skinlar', title: 'Telegram skinlar · OXY SAVDO' },
};

export default function Page() {
  return <TelegramSkinsClient />;
}
