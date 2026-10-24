// Sayt bo'ylab BARCHA ikonlar shu yerdan olinadi (lucide-react). Yangi ikon kerak bo'lsa —
// shu faylga qo'shing va komponentlarda `import { ... } from '@/components/icons'` qiling.
export {
  ShoppingCart,
  Wallet,
  Plus,
  Check,
  Send,
  ArrowUpRight,
  ChevronDown,
  RotateCw,
  Trash2,
  Zap,
  ShieldCheck,
  Headset,
  Tag,
} from 'lucide-react';

// Steam — brend belgisi, lucide'da yo'q
export function SteamIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.95 2 2.8 5.8 2.14 10.7l4.5 1.86a2.7 2.7 0 0 1 1.53-.47c.06 0 .12 0 .18.01l2-2.9v-.04a3.6 3.6 0 0 1 3.6-3.6 3.6 3.6 0 0 1 0 7.2h-.08l-2.86 2.04c0 .06.01.11.01.17a2.72 2.72 0 0 1-5.4.5L2 15.06C2.9 19.14 6.6 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2Zm-2.02 15.34-1.03-.43a2.06 2.06 0 0 0 1.9 1.27 2.07 2.07 0 0 0 2.07-2.07 2.06 2.06 0 0 0-.86-1.68l1.06.44a1.52 1.52 0 1 1-1.17 2.8l-1.97-.33Zm7.65-8.32a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0Zm-2.4 1.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z" />
    </svg>
  );
}
