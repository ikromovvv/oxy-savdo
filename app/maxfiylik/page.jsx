import LegalPage, { Fill, Sec, Ul } from '@/components/LegalPage';
import { legal, site } from '@/lib/site';

export const metadata = {
  title: 'Maxfiylik siyosati',
  description: `${site.full} — qanday ma'lumotlar yig'iladi, nima uchun ishlatiladi va qanday himoyalanadi.`,
  alternates: { canonical: '/maxfiylik' },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Maxfiylik siyosati" active="/maxfiylik">
      <p className="text-sm leading-relaxed text-white/75">
        Ushbu siyosat <Fill v={legal.company} /> (STIR: <Fill v={legal.inn} />) tomonidan {site.full} saytida
        foydalanuvchilarning shaxsiy ma&apos;lumotlari qanday yig&apos;ilishi, ishlatilishi va himoyalanishini tushuntiradi.
        Saytdan foydalanish orqali siz ushbu siyosatga rozilik bildirasiz.
      </p>

      <Sec n="1" title="Qanday ma'lumotlarni yig'amiz">
        <Ul
          items={[
            <><b>Steam orqali kirishda:</b> SteamID, profil nomi va avatar (Steam OpenID orqali). Steam parolingizni biz hech qachon ko&apos;rmaymiz va so&apos;ramaymiz.</>,
            <><b>Buyurtma uchun:</b> ism, telefon raqami, Telegram foydalanuvchi nomi (ixtiyoriy), Steam Trade URL, buyurtma tarkibi va izohlar.</>,
            <><b>To&apos;lov:</b> buyurtma summasi, to&apos;lov holati va tranzaksiya raqami. Bank kartasi ma&apos;lumotlari bizga berilmaydi va saqlanmaydi — ular faqat Payme/Click sahifasida kiritiladi.</>,
            <><b>Balans:</b> hisobingizdagi summa va operatsiyalar tarixi (to&apos;ldirish, xarid, qaytarish).</>,
            <><b>Texnik ma&apos;lumotlar:</b> IP manzil, brauzer turi, so&apos;rov vaqti (xavfsizlik va suiiste&apos;molchilikdan himoya uchun).</>,
          ]}
        />
      </Sec>

      <Sec n="2" title="Nima uchun ishlatamiz">
        <Ul
          items={[
            "Buyurtmani qabul qilish, to'lovni tasdiqlash va skinni Steam orqali yetkazish;",
            "Balansni yuritish va xaridlar tarixini ko'rsatish;",
            "Siz bilan bog'lanish (buyurtma holati, savollar, nizolar);",
            "Firibgarlik va ruxsatsiz kirishning oldini olish, Sayt xavfsizligini ta'minlash;",
            "Qonunchilik talablarini bajarish.",
          ]}
        />
        <p>Ma&apos;lumotlaringiz reklama maqsadida uchinchi shaxslarga sotilmaydi.</p>
      </Sec>

      <Sec n="3" title="Kimlarga uzatiladi">
        <p>Xizmat ko&apos;rsatish uchun zarur bo&apos;lgan hollardagina quyidagi xizmatlardan foydalanamiz:</p>
        <Ul
          items={[
            "Steam (Valve) — kirish va skin yuborish;",
            "Payme va Click — to'lovlarni qabul qilish;",
            "Telegram — buyurtma xabarnomalari va kanal e'lonlari;",
            "Vercel (hosting), Neon (ma'lumotlar bazasi), Upstash (kesh) — Saytni ishlatish va ma'lumotlarni saqlash;",
            "Skin yetkazuvchi hamkorlar (masalan, Waxpeer/SkinsBack) — avtomatik yetkazish yoqilganda, faqat buyurtma bajarilishi uchun zarur ma'lumotlar bilan.",
          ]}
        />
        <p>
          Shuningdek, qonun talab qilganda vakolatli davlat organlariga ma&apos;lumot taqdim etilishi mumkin. Ba&apos;zi xizmat
          ko&apos;rsatuvchilar serverlari O&apos;zbekistondan tashqarida joylashgan bo&apos;lishi mumkin.
        </p>
      </Sec>

      <Sec n="4" title="Cookie va brauzer xotirasi">
        <Ul
          items={[
            "Sessiya cookie'si — Steam orqali kirganingizni eslab qolish uchun (zarur, o'chirib bo'lmaydi).",
            "Brauzer xotirasi (localStorage) — savat, til tanlovi, saqlangan mahsulotlar va Trade URL'ingizni qulaylik uchun eslab qolish; faqat sizning qurilmangizda saqlanadi.",
            "Sessiya xotirasi — kirish animatsiyasini bir sessiyada bir marta ko'rsatish uchun.",
          ]}
        />
        <p>Brauzer sozlamalarida cookie va saqlangan ma&apos;lumotlarni istalgan vaqt o&apos;chirishingiz mumkin; bunda ba&apos;zi funksiyalar ishlamay qolishi mumkin.</p>
      </Sec>

      <Sec n="5" title="Saqlash muddati">
        <p>
          Ma&apos;lumotlar xizmat ko&apos;rsatish va qonuniy talablarni (buyurtma va to&apos;lov hujjatlari, nizolarni hal qilish)
          bajarish uchun zarur muddat davomida saqlanadi, so&apos;ng o&apos;chiriladi yoki shaxsiylashtirilmaydi.
        </p>
      </Sec>

      <Sec n="6" title="Xavfsizlik">
        <p>
          Ma&apos;lumotlarni himoyalash uchun mantiqiy choralar ko&apos;riladi: shifrlangan (HTTPS) ulanish, imzolangan
          sessiyalar, narx va to&apos;lovlarni server tomonida tekshirish, admin panelga cheklangan kirish. Shunga qaramay,
          internet orqali uzatishning to&apos;liq xavfsizligini kafolatlab bo&apos;lmaydi. Hisobingiz xavfsizligi (Steam
          paroli, Trade URL) uchun ehtiyot bo&apos;ling va ularni begonalarga bermang.
        </p>
      </Sec>

      <Sec n="7" title="Sizning huquqlaringiz">
        <p>
          O&apos;zbekiston Respublikasining shaxsga doir ma&apos;lumotlar to&apos;g&apos;risidagi qonunchiligiga muvofiq siz
          o&apos;z ma&apos;lumotlaringizni ko&apos;rish, tuzatish, ulardan foydalanishni cheklash yoki o&apos;chirishni so&apos;rash,
          shuningdek rozilikni qaytarib olish huquqiga egasiz. Buning uchun quyidagi aloqa ma&apos;lumotlariga murojaat qiling.
          Qonun talab qilgan hujjatlar (masalan, to&apos;lov yozuvlari) o&apos;chirilmasdan saqlanishi mumkin.
        </p>
      </Sec>

      <Sec n="8" title="Bolalar">
        <p>Sayt 18 yoshga to&apos;lmaganlar uchun mo&apos;ljallanmagan. Biz ataylab voyaga yetmaganlarning ma&apos;lumotlarini yig&apos;maymiz.</p>
      </Sec>

      <Sec n="9" title="Siyosatdagi o'zgarishlar">
        <p>
          Siyosat yangilanishi mumkin. Yangi tahrir shu sahifada e&apos;lon qilinadi va yuqoridagi «Oxirgi yangilanish»
          sanasi o&apos;zgaradi.
        </p>
      </Sec>

      <Sec n="10" title="Aloqa">
        <ul className="space-y-1">
          <li>Operator: <Fill v={legal.company} /> (STIR: <Fill v={legal.inn} />)</li>
          <li>Manzil: <Fill v={legal.address} /></li>
          <li>E-pochta: {site.email}</li>
          <li>Telegram: {site.telegramName}</li>
        </ul>
      </Sec>
    </LegalPage>
  );
}
