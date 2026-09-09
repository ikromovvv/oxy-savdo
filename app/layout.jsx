import './globals.css';
import { StoreProvider } from '@/components/StoreProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import SmoothScroll from '@/components/SmoothScroll';
import ScrollToTop from '@/components/ScrollToTop';
import CursorFx from '@/components/CursorFx';

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://oxy-savdo.vercel.app'
).replace(/\/+$/, '');

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'OXY SAVDO — CS2 skinlar va gaming kovriklar',
    template: '%s · OXY SAVDO',
  },
  description:
    "CS2 skinlarini sotib oling va soting, professional gaming kovriklar. UZS'da to'lov (Payme, Click), avtomatik yetkazish.",
  keywords: [
    'CS2 skin', 'CS2 skin sotib olish', 'skin savdo', 'gaming kovrik',
    'mousepad', 'Payme', 'Click', 'OXY SAVDO', 'skin marketplace',
  ],
  applicationName: 'OXY SAVDO',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'OXY SAVDO',
    locale: 'uz_UZ',
    url: SITE_URL,
    title: 'OXY SAVDO — CS2 skinlar va gaming kovriklar',
    description:
      "CS2 skinlarini sotib oling va soting. UZS'da to'lov, avtomatik yetkazish.",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OXY SAVDO — CS2 skinlar va gaming kovriklar',
    description: "CS2 skinlarini sotib oling va soting. UZS'da to'lov, avtomatik yetkazish.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <div className="grid-bg" aria-hidden="true" />
        <StoreProvider>
          <SmoothScroll />
          <ScrollToTop />
          <CursorFx />
          <div className="relative z-10">
            <Header />
            <main>{children}</main>
            <Footer />
          </div>
          <CartDrawer />
        </StoreProvider>
      </body>
    </html>
  );
}
