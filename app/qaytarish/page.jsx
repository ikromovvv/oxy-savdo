import LegalPage, { Fill, Sec, Ul } from '@/components/LegalPage';
import { legal, site } from '@/lib/site';

export const metadata = {
  title: 'Qaytarish shartlari',
  description: `${site.full} — pulni qaytarish va mahsulotni almashtirish shartlari.`,
  alternates: { canonical: '/qaytarish' },
};

export default function ReturnsPage() {
  return (
    <LegalPage title="Qaytarish shartlari" active="/qaytarish">
      <p className="text-sm leading-relaxed text-white/75">
        Ushbu shartlar {site.full} Saytidagi buyurtmalarni bekor qilish, pulni qaytarish va mahsulotni almashtirish
        tartibini belgilaydi. Ular{' '}
        <a className="text-accent underline-offset-2 hover:underline" href="/oferta">Ommaviy oferta</a>ning ajralmas qismidir.
      </p>

      <Sec n="1" title="Raqamli skinlar (CS2)">
        <p>
          Skin Steam orqali xaridorga topshirilgach, uni qaytarib olishning texnik imkoni yo&apos;q, shuning uchun
          <b> yetkazilgan va qabul qilingan skin qaytarilmaydi va almashtirilmaydi</b>, quyidagi hollar bundan mustasno.
        </p>
        <p className="font-medium text-white/90">Pul to&apos;liq qaytariladi, agar:</p>
        <Ul
          items={[
            "to'lov o'tgan, lekin skin yetkazilmagan bo'lsa;",
            "skin boshqa xaridorga sotilgan yoki mavjud bo'lmasa (xususan, Telegram kanalidagi yagona nusxa);",
            "Sotuvchining aybi bilan buyurtmaga mos kelmaydigan skin yuborilgan bo'lsa (nomi, sifati yoki float e'lon qilinganidan farq qilsa) va uni almashtirishning imkoni bo'lmasa;",
            "buyurtma Sotuvchi tomonidan bekor qilingan bo'lsa.",
          ]}
        />
        <p className="font-medium text-white/90">Pul qaytarilmaydi, agar:</p>
        <Ul
          items={[
            "skin to'g'ri yetkazilgan, lekin xaridor fikridan qaytgan bo'lsa;",
            "yetkazib bo'lmasligi xaridorning aybi bilan bo'lsa (noto'g'ri Trade URL, trade ban, yopiq inventar) va xaridor muammoni bartaraf etmagan bo'lsa — bunda yetkazish qayta urinib ko'riladi;",
            "skin narxi bozorda o'zgargan bo'lsa.",
          ]}
        />
      </Sec>

      <Sec n="2" title="Buyurtmani bekor qilish">
        <p>
          Skin yetkazilishidan <b>oldin</b> buyurtmani bekor qilish mumkin: {site.telegramName} yoki {site.email} orqali
          buyurtma raqami (OXY-XXXXXX) bilan murojaat qiling. Yetkazish allaqachon boshlangan bo&apos;lsa, bekor qilish
          mumkin bo&apos;lmasligi mumkin.
        </p>
      </Sec>

      <Sec n="3" title="Jismoniy mahsulotlar (kovriklar, aksessuarlar)">
        <Ul
          items={[
            "Sifatli mahsulotni olganingizdan keyin 14 kun ichida qaytarishingiz mumkin, agar u ishlatilmagan, tovar ko'rinishi va qadog'i saqlangan bo'lsa.",
            "Nuqsonli yoki buyurtmaga mos kelmaydigan mahsulot almashtiriladi yoki pul qaytariladi.",
            "Qaytarish uchun mahsulot rasmi va buyurtma raqami bilan murojaat qiling.",
          ]}
        />
      </Sec>

      <Sec n="4" title="Pul qaytarish usuli va muddati">
        <Ul
          items={[
            "Pul asosan to'lov qilingan usulga (Payme/Click) yoki xaridorning roziligi bilan Saytdagi Balansga qaytariladi.",
            "Balansdan to'langan buyurtmalar uchun pul Balansga qaytariladi.",
            <>Qaytarish muddati: <Fill v={legal.refundDays} /> (bank va to&apos;lov tizimi jarayonlariga qarab).</>,
            "Demo (sinov) rejimidagi summalar haqiqiy pul emas va qaytarilmaydi.",
          ]}
        />
      </Sec>

      <Sec n="5" title="Murojaat tartibi">
        <p>Murojaatda quyidagilarni ko&apos;rsating: buyurtma raqami, sabab, imkon bo&apos;lsa skrinshot yoki rasm.</p>
        <ul className="space-y-1">
          <li>Telegram: {site.telegramName}</li>
          <li>E-pochta: {site.email}</li>
          <li>Telefon: {site.phone}</li>
        </ul>
        <p>Murojaatlar odatda 1–2 ish kuni ichida ko&apos;rib chiqiladi.</p>
      </Sec>
    </LegalPage>
  );
}
