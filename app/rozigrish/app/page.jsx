import MiniAppClient from './client';

export const metadata = {
  title: 'Rozigrish',
  robots: { index: false },
};

// Telegram Mini App: kanaldagi "Qatnashish" tugmasi shu sahifani ochadi.
export default function Page() {
  return <MiniAppClient />;
}
