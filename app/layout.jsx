import './globals.css';
import { StoreProvider } from '@/components/StoreProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import SmoothScroll from '@/components/SmoothScroll';
import ScrollToTop from '@/components/ScrollToTop';
import CursorFx from '@/components/CursorFx';

export const metadata = {
  title: 'OXY SAVDO — skinlar va gaming kovriklar',
  description:
    "O'yin skinlari va professional gaming kovriklar. Ishonchli savdo, tez yetkazib berish.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz">
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
