# MangaTimeline — Anime/Manga reader (RU / EN)

Manga o'qish sayti: mangalar **yildan yilga** (timeline) tartibida, interfeys va boblar **Русский / English**,
yangi manga va yangi boblar **avtomatik** qo'shiladi. Tashqi kutubxonalarsiz (faqat Node.js ≥ 20).

## Imkoniyatlar
- Yillar bo'yicha lenta (yangi→eski yoki eski→yangi), yil paneli, har yil uchun "ko'proq ko'rsatish"
- Qidiruv, janr/status filtri, saralash (mashhur / yangilangan / yangi qo'shilgan / A–Z)
- Manga sahifasi: tavsif, janrlar, boblar (RU/EN, tomlar bo'yicha), o'qilgan boblar belgisi
- O'qish rejimlari: vertikal lenta va sahifa-sahifa, klaviatura (← →), keyingi/oldingi bob, kenglik sozlamasi
- Kutubxona: sevimlilar va "davom ettirish" (brauzer localStorage'da), tungi/kunduzgi mavzu
- **Avto-yangilanish**: server har `SYNC_INTERVAL_MIN` daqiqada MangaDex API'dan yangi seriyalar va yangi boblarni oladi

## Ishga tushirish
```bash
npm start                # haqiqiy MangaDex ma'lumotlari bilan (internet kerak), http://localhost:3000
npm run demo             # oflayn demo (original, sun'iy ma'lumotlar)
MOCK_LIVE=1 npm run demo # demo + har sinxronda "yangi manga" paydo bo'lishini ko'rsatadi
npm run sync             # bir martalik sinxronizatsiya (cron uchun)
npm test
```

## Sozlamalar (env)
| O'zgaruvchi | Default | Ma'nosi |
|---|---|---|
| `PORT` | 3000 | port |
| `START_YEAR` | 1990 | timeline boshlanadigan yil |
| `PER_YEAR` | 60 | har yil uchun nechta eng mashhur manga |
| `SYNC_INTERVAL_MIN` | 30 | avto-yangilanish oralig'i |
| `LANGS` | ru,en | tillar |
| `CONTENT_RATINGS` | safe,suggestive | kontent reytingi |
| `DATA_DIR` | ./data | katalog saqlanadigan papka |
| `ADMIN_TOKEN` | — | `POST /api/sync` (Bearer) ni yoqadi |

Birinchi ishga tushishda katalog yillar bo'yicha (yangi yildan boshlab) to'ldiriladi; keyin faqat yangiliklar olinadi.

## Eslatma
Kontent MangaDex jamoasining ochiq API'sidan olinadi, rasmlar ularning CDN'idan to'g'ridan-to'g'ri yuklanadi
(serverga nusxalanmaydi). Barcha huquqlar mualliflarda. Deploy uchun `Dockerfile` bor; `/data` ni volume qiling.
