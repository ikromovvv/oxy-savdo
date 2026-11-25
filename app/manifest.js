export default function manifest() {
  return {
    name: 'OXY SAVDO — CS2 skinlar va gaming kovriklar',
    short_name: 'OXY SAVDO',
    description: "CS2 skinlarini sotib oling va soting. UZS'da to'lov, avtomatik yetkazish.",
    start_url: '/',
    display: 'standalone',
    background_color: '#030409',
    theme_color: '#030409',
    lang: 'uz',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
