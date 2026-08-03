'use client';

// Telefondan "Steam orqali kirish" bosilganda, agar qurilmada Steam mobil
// ilovasi o'rnatilgan bo'lsa, telefon brauzeri o'rniga ilovaning o'zini
// ochishga harakat qilamiz (ilova o'z ichidagi brauzerda login sahifasini
// ochadi). Agar ilova o'rnatilmagan bo'lsa (yoki bir oz kutib hech narsa
// bo'lmasa), oddiy veb-login oqimiga qaytamiz.
export function handleSteamLoginClick(e) {
  if (typeof window === 'undefined') return;

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isMobile) return; // desktopda oddiy <a href> o'zi ishlayveradi

  e.preventDefault();

  const loginUrl = `${window.location.origin}/api/auth/steam/login`;
  const deepLink = `steammobile://openurl/${encodeURIComponent(loginUrl)}`;

  let handled = false;
  const goToWeb = () => {
    if (handled) return;
    handled = true;
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.location.href = loginUrl;
  };

  // Ilova ochilib, sahifa fon (background)ga ketsa — bu link ishlagan
  // degani, veb-fallback shart emas
  function onVisibilityChange() {
    if (document.hidden) {
      handled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  window.location.href = deepLink;
  setTimeout(goToWeb, 1500);
}
