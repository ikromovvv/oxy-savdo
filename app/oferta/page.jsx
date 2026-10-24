import LegalPage, { Fill, Sec, Ul } from '@/components/LegalPage';
import { legal, site } from '@/lib/site';

export const metadata = {
  title: 'Ommaviy oferta',
  description: `${site.full} — ommaviy oferta: buyurtma, to'lov, yetkazish va taraflar javobgarligi.`,
  alternates: { canonical: '/oferta' },
};

export default function OfertaPage() {
  return (
    <LegalPage title="Ommaviy oferta" active="/oferta">
      <p className="text-sm leading-relaxed text-white/75">
        Ushbu hujjat <Fill v={legal.company} /> (STIR: <Fill v={legal.inn} />) — keyingi o&apos;rinlarda{' '}
        <b>«Sotuvchi»</b> — nomidan har qanday jismoniy shaxsga (<b>«Xaridor»</b>) {site.full} saytida
        (<b>«Sayt»</b>) mahsulot sotib olish bo&apos;yicha taklif (ommaviy oferta) hisoblanadi.
      </p>

      <Sec n="1" title="Umumiy qoidalar">
        <p>
          Sayt orqali buyurtma berish, to&apos;lov qilish yoki balansni to&apos;ldirish ushbu ofertani to&apos;liq va shartsiz
          qabul qilish (aksept) hisoblanadi. Qabul qilishdan oldin hujjatni diqqat bilan o&apos;qing. Xaridor buyurtma
          berish orqali kamida 18 yoshda ekanini tasdiqlaydi.
        </p>
      </Sec>

      <Sec n="2" title="Atamalar">
        <Ul
          items={[
            <><b>Mahsulot</b> — Saytda sotiladigan CS2 (Counter-Strike 2) raqamli skinlari va jismoniy mahsulotlar (gaming kovriklar va aksessuarlar).</>,
            <><b>Trade URL</b> — Xaridorning Steam hisobiga skin yuborish uchun maxsus havolasi.</>,
            <><b>Balans</b> — Xaridorning Saytdagi ichki hisobi; faqat Saytda xarid qilish uchun ishlatiladi.</>,
            <><b>Telegram skinlari</b> — Sotuvchining Telegram kanalida e&apos;lon qilingan, yagona nusxadagi skinlar.</>,
          ]}
        />
      </Sec>

      <Sec n="3" title="Shartnoma predmeti">
        <p>
          Sotuvchi Xaridorga Saytda ko&apos;rsatilgan mahsulotni topshirish majburiyatini oladi, Xaridor esa uni to&apos;lash
          majburiyatini oladi. Mahsulotning nomi, sifati (exterior), float qiymati, miqdori va narxi buyurtma
          rasmiylashtirilgan paytda Saytda ko&apos;rsatilgan ma&apos;lumotga muvofiq bo&apos;ladi.
        </p>
      </Sec>

      <Sec n="4" title="Narx va buyurtma">
        <Ul
          items={[
            "Narxlar O'zbekiston so'mida ko'rsatiladi. Yakuniy narx buyurtma rasmiylashtirilayotganda server tomonidan hisoblanadi va to'lovdan oldin Xaridorga ko'rsatiladi.",
            "Skin narxlari bozor narxiga va valyuta kursiga bog'liq bo'lgani uchun o'zgarishi mumkin. Buyurtma tasdiqlangan paytdagi narx o'zgarmaydi.",
            "Telegram kanalidagi skinlar yagona nusxada. Skin boshqa xaridorga sotilgan bo'lsa, buyurtma rad etiladi yoki to'langan summa to'liq qaytariladi.",
            "Sotuvchi aniq xatolik (noto'g'ri narx va shu kabi) aniqlansa, buyurtmani bekor qilish va pulni to'liq qaytarish huquqiga ega.",
          ]}
        />
      </Sec>

      <Sec n="5" title="To'lov">
        <Ul
          items={[
            "To'lov Payme yoki Click to'lov tizimlari orqali yoki Saytdagi Balansdan amalga oshiriladi.",
            "Bank kartasi ma'lumotlari Saytda kiritilmaydi va saqlanmaydi — ular faqat to'lov tizimining xavfsiz sahifasida kiritiladi.",
            "Buyurtma to'lov tasdiqlangandan keyin bajarishga qabul qilinadi.",
            "Balans to'ldirilganda summa Xaridorning hisobiga tushadi va faqat Saytdagi xaridlar uchun sarflanadi. Balans qoldig'ini qaytarish alohida ariza asosida ko'rib chiqiladi.",
            "Saytning sinov (demo) rejimida kiritilgan summalar haqiqiy pul emas va haqiqiy mahsulot olish uchun ishlatilmaydi.",
          ]}
        />
      </Sec>

      <Sec n="6" title="Yetkazish">
        <Ul
          items={[
            <>Skinlar Steam Trade Offer orqali Xaridor ko&apos;rsatgan Trade URL&apos;ga yuboriladi. Odatdagi muddat: <Fill v={legal.deliveryTime} />.</>,
            "Xaridor Trade URL to'g'ri ekanini, Steam hisobida trade cheklovlari (ban, trade hold) yo'qligini va Steam Guard talablariga rioya qilishini o'zi ta'minlaydi.",
            "Noto'g'ri Trade URL yoki Xaridor hisobidagi cheklovlar tufayli kechikish yoki yetkazib bo'lmaslik uchun Sotuvchi javobgar emas; bunday holda Xaridor Trade URL'ni to'g'rilab, yetkazishni qayta so'rashi yoki pulni qaytarishni talab qilishi mumkin.",
            "Valve/Steam qoidalari tufayli skinlarda trade hold (odatda 7 kungacha) bo'lishi mumkin; bu Sotuvchining nazoratidan tashqarida.",
            "Jismoniy mahsulotlar (kovriklar, aksessuarlar) yetkazib berish shartlari buyurtma rasmiylashtirilganda kelishiladi.",
          ]}
        />
      </Sec>

      <Sec n="7" title="Qaytarish va pulni qaytarish">
        <p>
          Qaytarish va pulni qaytarish tartibi{' '}
          <a className="text-accent underline-offset-2 hover:underline" href="/qaytarish">«Qaytarish shartlari»</a> sahifasida
          bayon etilgan va ushbu oferta bilan birga ajralmas qismdir.
        </p>
      </Sec>

      <Sec n="8" title="Taraflar javobgarligi">
        <Ul
          items={[
            "Sayt Valve Corporation, Steam yoki Counter-Strike bilan bog'liq emas va ular tomonidan tasdiqlanmagan. Barcha tovar belgilari ularning egalariga tegishli.",
            "Xaridor Steam hisobining xavfsizligi, Trade URL va login ma'lumotlarini uchinchi shaxslarga bermaslik uchun o'zi javobgar. Sotuvchi hech qachon Steam parolini yoki Steam Guard kodini so'ramaydi.",
            "Sotuvchi Valve tomonidan skin yoki hisobga qo'yilgan cheklovlar, o'yin qoidalaridagi o'zgarishlar va Steam xizmatidagi uzilishlar uchun javobgar emas.",
            "Taraflar nazorat qila olmaydigan holatlar (favqulodda vaziyat, to'lov tizimlari yoki Steam xizmatlaridagi uzilishlar) yuz berganda majburiyatlarni bajarmaslik uchun javobgarlikdan ozod bo'ladilar.",
            "Sotuvchining javobgarligi har qanday holatda buyurtma qiymati bilan cheklanadi.",
          ]}
        />
      </Sec>

      <Sec n="9" title="Shaxsiy ma'lumotlar">
        <p>
          Xaridorning shaxsiy ma&apos;lumotlari{' '}
          <a className="text-accent underline-offset-2 hover:underline" href="/maxfiylik">«Maxfiylik siyosati»</a>ga muvofiq
          qayta ishlanadi. Buyurtma berish orqali Xaridor ma&apos;lumotlarini shu maqsadlarda qayta ishlashga rozilik
          bildiradi.
        </p>
      </Sec>

      <Sec n="10" title="Nizolarni hal qilish">
        <p>
          Nizolar avvalo muzokaralar yo&apos;li bilan hal qilinadi. Kelishuvga erishilmasa, nizo O&apos;zbekiston
          Respublikasi amaldagi qonunchiligiga muvofiq vakolatli sudda ko&apos;riladi.
        </p>
      </Sec>

      <Sec n="11" title="Oferta muddati va o'zgartirishlar">
        <p>
          Oferta Saytda e&apos;lon qilingan paytdan kuchga kiradi va bekor qilinmaguncha amal qiladi. Sotuvchi shartlarni
          bir tomonlama o&apos;zgartirish huquqiga ega; yangi tahrir Saytda e&apos;lon qilingan paytdan boshlab kuchga
          kiradi va undan keyin berilgan buyurtmalarga tatbiq etiladi.
        </p>
      </Sec>

      <Sec n="12" title="Sotuvchi rekvizitlari">
        <ul className="space-y-1">
          <li>Nomi: <Fill v={legal.company} /></li>
          <li>STIR: <Fill v={legal.inn} /></li>
          <li>Manzil: <Fill v={legal.address} /></li>
          <li>Bank: <Fill v={legal.bank} /></li>
          <li>Telefon: {site.phone}</li>
          <li>E-pochta: {site.email}</li>
          <li>Telegram: {site.telegramName}</li>
        </ul>
      </Sec>
    </LegalPage>
  );
}
