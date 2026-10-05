# @umid_codevision reels boti

Telegram'da yozasiz -> bot Claude API orqali reels g'oyasi yoki ssenariy tayyorlaydi -> javob qaytaradi.
Qoidalar (brend pasporti, rubrika, Veo qoidalari) `prompts.py` faylida. O'zgartirsangiz, botni qayta ishga tushiring.

## 1. Kerakli narsalar

1. **Bot tokeni:** BotFather -> botingiz -> API Token. Token oshkor bo'lgan bo'lsa, BotFather'da `/revoke` qiling.
2. **Claude API kaliti:** console.anthropic.com -> API Keys -> Create Key. Billing bo'limida balans to'ldiring.
   Byudjetdan chiqmaslik uchun Console'da oylik xarajat limitini qo'ying.
   Bu claude.ai obunasidan alohida to'lanadi.
3. **Python 3.10+.**

## 2. Kompyuterda sinash (Windows PowerShell)

```powershell
cd C:\Users\User\Downloads\reels_bot
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env
notepad .env
.\venv\Scripts\python.exe bot.py
```

`.env` ichiga `BOT_TOKEN` va `ANTHROPIC_API_KEY` ni yozing, `ALLOWED_USER_IDS` ni hozircha bo'sh qoldiring.
Bot ishga tushgach, Telegram'da `/start` yozing: bot ID'ingizni aytadi. Uni `ALLOWED_USER_IDS=` ga yozing,
terminalda `Ctrl+C` bosib, botni qayta ishga tushiring. Endi "reels g'oyasi kerak" deb yozib ko'ring.

Bot faqat terminal ochiq va kompyuter yoniq turganda javob beradi. 24/7 ishlashi uchun 3-bo'limga o'ting.

## 3. AWS EC2'ga joylash (24/7)

Avval kompyuterdagi botni to'xtating (`Ctrl+C`). Bitta token bilan ikki nusxa ishlasa, `Conflict` xatosi chiqadi.

Kompyuteringizdan papkani serverga yuboring (PowerShell):

```powershell
scp -i C:\yol\kalit.pem -r C:\Users\User\Downloads\reels_bot ubuntu@SERVER_IP:~/
ssh -i C:\yol\kalit.pem ubuntu@SERVER_IP
```

Serverda:

```bash
cd ~/reels_bot
sudo apt update && sudo apt install -y python3-venv
python3 -m venv venv
venv/bin/pip install -r requirements.txt
chmod 600 .env
sudo cp reels-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now reels-bot
journalctl -u reels-bot -f
```

Logda `bot_started username=@...` chiqsa, hammasi joyida. Logdan chiqish: `Ctrl+C` (bot ishlashda davom etadi).

Foydali buyruqlar:

- `sudo systemctl restart reels-bot` — `prompts.py` yoki `.env` o'zgargandan keyin
- `sudo systemctl status reels-bot` — ishlayaptimi
- `journalctl -u reels-bot -n 50` — oxirgi 50 qator log (har javobda token sarfi ham yoziladi)

Amazon Linux bo'lsa: foydalanuvchi `ec2-user`, `apt` o'rniga `dnf`, va `reels-bot.service` ichidagi yo'llarni moslang.

## 4. Botdan foydalanish

- `reels g'oyasi kerak` — 3 ta qisqa g'oya, keyin raqam yozsangiz to'liq ssenariy
- `Seshanba uchun ssenariy yoz` — bitta to'liq ssenariy
- `faqat hook kerak: ...` — 3-5 ta hook
- `/veo` — [QAHRAMON] va [USLUB] matnlari, bosib nusxa olinadi
- `/new` — kontekstni tozalash (yangi mavzu)

## 4.1. Kotib funksiyalari

Oddiy gapiring, Claude o'zi mos asbobni chaqiradi:

- `ertaga soat 9:00 da dars haqida eslat` — eslatma (vaqti kelganda bot o'zi yozadi)
- `vazifa qo'sh: reels montaj qilish, juma kuniga` — vazifa
- `montaj vazifasini bajarildi qil` — vazifani yopish
- `qayd: yangi reels g'oyasi — ...` — qayd; `qaydlardan "g'oya" ni top` — qidirish
- `/tasks`, `/reminders`, `/notes` — ro'yxatlar, `/brief` — bugungi xulosa

Har kuni soat 08:00 da (Toshkent) bot bugungi eslatmalar va ochiq vazifalar xulosasini o'zi yuboradi.
Soatni `.env` dagi `BRIEF_HOUR=8` bilan o'zgartiring, `-1` bo'lsa o'chadi.
Ma'lumotlar `secretary.db` faylida saqlanadi (serverga ko'chirganda shu faylni ham olib boring). Bot o'chiq paytda kelgan eslatmalar ishga tushganda "kechikib" belgisi bilan yuboriladi.

## 4.2. Kasbga mo'ljallangan buyruqlar

Telegram'da `/help` yozing: 47 ta buyruq ro'yxati chiqadi. Ular `commands.py` faylida, yangisini qo'shish uchun bitta qator yozish kifoya.

- **AI video va kontent:** `/goya`, `/hook`, `/ssenariy`, `/hafta`, `/sovga`, `/veoprompt`, `/kling`, `/higgsfield`, `/yaxshila`, `/kadrlar`, `/storyboard`, `/ovoz`, `/caption`, `/hashtag`, `/cta`, `/muqova`, `/musiqa`, `/tahlil`, `/qayta`, `/tutorial`, `/sketch`
- **Dasturlash:** `/kod`, `/xato`, `/tushuntir`, `/review`, `/refaktor`, `/optimal`, `/test`, `/hujjat`, `/xavfsizlik`, `/konvert`, `/regex`, `/sql`, `/git`, `/terminal`, `/fastapi`, `/react`, `/tgbot`, `/docker`, `/aws`, `/reja`, `/arxitektura`, `/readme`, `/commit`, `/intervyu`, `/yolxarita`, `/aiprompt`
- **Kotib:** `/tasks`, `/reminders`, `/notes`, `/brief` va oddiy gap bilan eslatma, vazifa, qayd

Buyruqdan keyin matn yozing (`/xato TypeError: ...`) yoki kod turgan xabarga **javob (reply)** qilib faqat `/xato` deb yuboring. Kod Telegram'da `<pre>` blok ko'rinishida chiqadi.

## 5. Muammolar

| Belgi | Sabab va yechim |
| --- | --- |
| Bot umuman javob bermaydi | Dastur ishlamayapti. Terminal/serverda `bot.py` ishga tushganini tekshiring |
| "Bu shaxsiy bot" deydi | ID `ALLOWED_USER_IDS` da yo'q yoki botni qayta ishga tushirmagansiz |
| `Conflict: terminated by other getUpdates` | Bot ikki joyda ishlayapti. Bittasini to'xtating |
| "Claude API balansi tugagan" | console.anthropic.com -> Billing |
| "Model topilmadi" | `.env` dagi `CLAUDE_MODEL` ni tekshiring |
| 21:00 dagi avtomatik xabar kelmay qoldi | Agar o'sha vazifa xabarlarni `getUpdates` orqali o'qisa, shu bot bilan to'qnashadi. Faqat `sendMessage` ishlatsa, muammo yo'q |
