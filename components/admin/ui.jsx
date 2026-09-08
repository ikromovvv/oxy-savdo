'use client';

// Admin panel uchun umumiy: ikonalar, SVG yordamchi, input klasslari.

export const Icon = {
  grid: <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" strokeLinecap="round" strokeLinejoin="round" />,
  box: <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 0v20M3 7l9 5 9-5" strokeLinecap="round" strokeLinejoin="round" />,
  cart: (
    <path
      d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h9.2a2 2 0 0 0 2-1.6L23 6H6M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  lock: <path d="M7 10V8a5 5 0 0 1 10 0v2m-11 0h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" />,
  plus: <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />,
  edit: <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3ZM14 7l3 3" strokeLinecap="round" strokeLinejoin="round" />,
  trash: <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7" strokeLinecap="round" strokeLinejoin="round" />,
  check: <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />,
  star: <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 22l-5.2-2.9 1-5.8L3.5 9.2l5.9-.9L12 3Z" strokeLinecap="round" strokeLinejoin="round" />,
  logout: <path d="M15 12H4m0 0 4-4m-4 4 4 4m2-12h6a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-6" strokeLinecap="round" strokeLinejoin="round" />,
  close: <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" strokeLinejoin="round" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />,
  image: <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 12 4.5-5 3 3L15 9l4 5M8.5 9.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" strokeLinecap="round" strokeLinejoin="round" />,
  refresh: <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v6h-6" strokeLinecap="round" strokeLinejoin="round" />,
  chevron: <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />,
  copy: <path d="M9 9h10v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1Zm-3 6H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1" strokeLinecap="round" strokeLinejoin="round" />,
  play: <path d="M7 4v16l13-8L7 4Z" strokeLinecap="round" strokeLinejoin="round" />,
  wallet: <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm14 6h.01" strokeLinecap="round" strokeLinejoin="round" />,
};

export function Svg({ d, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current stroke-[1.7]`}>
      {d}
    </svg>
  );
}

export const inputCls =
  'w-full rounded-xl border border-line bg-ink px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-muted/50 focus:border-accent/60 focus:ring-1 focus:ring-accent/25';
export const labelCls = 'label mb-1.5 block';
