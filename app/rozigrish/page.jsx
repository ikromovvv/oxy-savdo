import RozigrishClient from './client';

export const metadata = {
  title: 'Rozigrish',
  description: "OXY SAVDO rozigrishida qatnashing: kanalga obuna bo'ling va saytda Steam bilan kiring.",
  alternates: { canonical: '/rozigrish' },
  robots: { index: false },
};

export default function Page() {
  return <RozigrishClient botUsername={process.env.GIVEAWAY_BOT_USERNAME || ''} channel={process.env.TG_CHANNEL || 'oxyskinshop'} />;
}
