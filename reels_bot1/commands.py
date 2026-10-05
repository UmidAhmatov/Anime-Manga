"""Kasbga mo'ljallangan buyruqlar: AI videomaker va dasturchi uchun.

Har bir buyruq tayyor ko'rsatma (prompt) bo'lib, Claude'ga yuboriladi. Buyruqdan keyin yozilgan matn {args} o'rniga qo'yiladi.
Kod yoki xato matnini buyruq bilan birga yozing yoki o'sha xabarga javob (reply) qilib buyruqni yuboring.
Yangi buyruq qo'shish: pastdagi ro'yxatga bitta qator qo'shing va botni qayta ishga tushiring.
"""

from dataclasses import dataclass

VIDEO = "🎬 AI video va kontent"
DEV = "💻 Dasturlash"


@dataclass(frozen=True)
class Cmd:
    name: str          # /name (faqat lotin harf, raqam, _ )
    category: str
    desc: str          # menyuda ko'rinadigan qisqa tavsif
    arg: str           # kerakli ma'lumot nomi; bo'sh bo'lsa, matn shart emas
    prompt: str        # {args} o'rniga foydalanuvchi matni qo'yiladi


_CODE_NOTE = (
    " Kod ingliz tilida, izoh va tushuntirishlar o'zbek tilida bo'lsin. Kodni uchta teskari tirnoqli blokda ber. "
    "Qisqa va aniq yoz, ortiqcha kirish gap kerak emas."
)

COMMANDS: list[Cmd] = [
    # ---------- AI video va kontent ----------
    Cmd("goya", VIDEO, "3 ta reels g'oyasi (mavzu bo'lmasa, bugungi rubrika)", "",
        "Reels g'oyasi kerak. Mavzu: {args}. Mavzu bo'sh bo'lsa, bugungi hafta kunining rubrikasidan ol."),
    Cmd("hook", VIDEO, "5 ta kuchli hook", "mavzu",
        "Shu mavzu uchun 5 ta kuchli hook yoz, har birining yonida psixologik ilgagini ayt: {args}"),
    Cmd("ssenariy", VIDEO, "To'liq Veo ssenariysi (4 klip)", "mavzu",
        "Shu mavzu bo'yicha to'liq ssenariyni belgilangan formatda yoz (4 klip, Veo promptlari, caption, hashtag, CTA): {args}"),
    Cmd("hafta", VIDEO, "7 kunlik kontent reja", "",
        "Bugundan boshlab 7 kunlik reels rejasi tuz. Har kun uchun bir qatordan: kun, rubrika, mavzu, eng kuchli hook. "
        "To'liq ssenariy yozma, oxirida qaysi kunga ssenariy kerakligini so'ra. Qo'shimcha istak: {args}"),
    Cmd("sovga", VIDEO, "PROMPT sovg'asi: 5 ta yangi Veo/Kling prompt", "",
        "PROMPT sovg'asini yangila: formula bo'yicha 5 ta yangi Veo/Kling prompti ber. Yo'nalish: {args}"),
    Cmd("veoprompt", VIDEO, "Veo uchun tayyor prompt", "g'oya",
        "Shu g'oya uchun Veo'ga tayyor, ingliz tilidagi kadr promptini yoz (kadr turi, qahramon, harakat, joy, yorug'lik, "
        "kamera harakati, ovoz, uslub). [QAHRAMON] va [USLUB] placeholderlarini ishlat. G'oya: {args}"),
    Cmd("kling", VIDEO, "Kling uchun prompt", "g'oya",
        "Shu g'oya uchun Kling AI'ga mos ingliz tilidagi prompt yoz va kamera harakati hamda boshlang'ich/oxirgi kadr maslahatini ber: {args}"),
    Cmd("higgsfield", VIDEO, "Higgsfield uchun prompt va kamera harakati", "g'oya",
        "Shu g'oya uchun Higgsfield'ga mos ingliz tilidagi prompt yoz va qaysi kamera harakati yoki effekt mos kelishini ayt: {args}"),
    Cmd("yaxshila", VIDEO, "Mening promptimni kuchaytirish", "prompt",
        "Quyidagi video promptni tahlil qil: nima yetishmayapti, qayerda Veo xato qilishi mumkin. Keyin kuchaytirilgan versiyasini ber: {args}"),
    Cmd("kadrlar", VIDEO, "Sahna uchun kadrlar ro'yxati", "sahna",
        "Shu sahnani kadrlarga bo'l: har kadr uchun kadr turi, kamera, yorug'lik, harakat va davomiylik. Sahna: {args}"),
    Cmd("storyboard", VIDEO, "Hikoyaning storyboard'i", "hikoya",
        "Shu hikoya uchun 8-12 kadrli storyboard tuz: har kadrda nima ko'rinadi, kim nima deydi, qancha soniya. Hikoya: {args}"),
    Cmd("ovoz", VIDEO, "Dikt matni (Veo talaffuzi uchun)", "matn",
        "Quyidagi matnni Veo'da o'zbekcha aytilishi uchun tayyorla: har klipda 14 so'zdan oshmasin, inglizcha atamalar o'qilishicha yozilsin "
        "(React -> Riakt va hokazo), tempni belgila. Matn: {args}"),
    Cmd("caption", VIDEO, "Caption + hashtag", "reels mavzusi",
        "Shu reels uchun Instagram caption yoz (hook qatori, qisqa mazmun, komment savoli, saqlash/yuborish CTA) va 5 tagacha hashtag ber: {args}"),
    Cmd("hashtag", VIDEO, "5 ta hashtag", "mavzu",
        "Shu mavzu uchun 5 tagacha hashtag tanla: 2-3 keng, 2-3 tor: {args}"),
    Cmd("cta", VIDEO, "CTA va ManyChat kalit so'zlari", "reels mavzusi",
        "Shu reels uchun 5 xil CTA varianti ber (komment, saqlash, DM'ga yuborish) va ManyChat uchun mos kalit so'zni taklif qil "
        "(bepul tarifda 4 tagacha avtomatlashtirish bor): {args}"),
    Cmd("muqova", VIDEO, "Reels muqovasi g'oyalari", "mavzu",
        "Shu reels uchun 5 ta muqova (cover) g'oyasi ber: muqovadagi qisqa yozuv va kadr tavsifi bilan: {args}"),
    Cmd("musiqa", VIDEO, "Musiqa va ovoz uslubi", "kayfiyat/mavzu",
        "Shu reels uchun musiqa va ovoz dizayni uslubini tavsiflab ber (tempi, kayfiyati, qayerda ovoz o'zgaradi): {args}"),
    Cmd("tahlil", VIDEO, "Reels natijasini tahlil qilish", "raqamlar",
        "Shu reels natijalarini tahlil qil va aniq sababni ayt. Agar 3 soniyadan keyin qolganlar, o'rtacha ko'rish vaqti va yuborishlar soni yetishmasa, "
        "avval shularni so'ra. Raqamlar: {args}"),
    Cmd("qayta", VIDEO, "Ssenariyni kuchliroq qilib qayta yozish", "ssenariy",
        "Quyidagi ssenariyni kuchliroq qilib qayta yoz: hookni, sur'atni va CTA'ni yaxshila. Nimani nega o'zgartirganingni qisqa ayt: {args}"),
    Cmd("tutorial", VIDEO, "Kod + AI tutorial reels (3 qadam)", "mavzu",
        "Shu mavzu bo'yicha Payshanba rubrikasi uchun 3 qadamli tutorial reels ssenariysini yoz: {args}"),
    Cmd("sketch", VIDEO, "POV / sketch ssenariysi", "g'oya",
        "Shu g'oya bo'yicha dasturchi hayotidan POV yoki ko'p qahramonli sketch ssenariysi yoz: {args}"),

    # ---------- Dasturlash ----------
    Cmd("kod", DEV, "Vazifa bo'yicha kod yozish", "vazifa",
        "Quyidagi vazifa uchun ishlaydigan kod yoz va qanday ishlatishni ko'rsat." + _CODE_NOTE + " Vazifa: {args}"),
    Cmd("xato", DEV, "Xatoni topib tuzatish", "xato matni yoki kod",
        "Quyidagi xatoni tahlil qil: sababi nimada, qanday tuzatiladi. Avval sababni 1-2 gapda ayt, keyin tuzatilgan kodni ber." + _CODE_NOTE + " Xato: {args}"),
    Cmd("tushuntir", DEV, "Kod yoki mavzuni sodda tushuntirish", "kod yoki mavzu",
        "Quyidagini boshlovchiga tushunadigan qilib, misollar bilan tushuntir: {args}"),
    Cmd("review", DEV, "Kod review", "kod",
        "Quyidagi kodni review qil: xatolar, xavfsizlik, o'qilishi va samaradorlik bo'yicha. Muhimlik tartibida sana va tuzatishni ko'rsat." + _CODE_NOTE + " Kod: {args}"),
    Cmd("refaktor", DEV, "Kodni tozalash va soddalashtirish", "kod",
        "Quyidagi kodni xatti-harakatini o'zgartirmasdan refaktor qil. Nimani nega o'zgartirganingni qisqa ayt." + _CODE_NOTE + " Kod: {args}"),
    Cmd("optimal", DEV, "Kodni tezlashtirish", "kod",
        "Quyidagi kodning sekin joylarini top va optimallashtir. Taxminiy foydani tushuntir." + _CODE_NOTE + " Kod: {args}"),
    Cmd("test", DEV, "Unit testlar yozish", "kod",
        "Quyidagi kod uchun unit testlar yoz (chekka holatlar ham bo'lsin). Python bo'lsa pytest ishlat." + _CODE_NOTE + " Kod: {args}"),
    Cmd("hujjat", DEV, "Docstring va hujjat yozish", "kod",
        "Quyidagi kodga docstring va qisqa hujjat (README bo'limi) yoz." + _CODE_NOTE + " Kod: {args}"),
    Cmd("xavfsizlik", DEV, "Xavfsizlik tekshiruvi", "kod",
        "Quyidagi kodni xavfsizlik nuqtai nazaridan tekshir (maxfiy ma'lumot, injection, autentifikatsiya va hokazo). Topilmalarni xavf darajasi bilan ber." + _CODE_NOTE + " Kod: {args}"),
    Cmd("konvert", DEV, "Kodni boshqa tilga o'tkazish", "til: kod",
        "Quyidagi kodni ko'rsatilgan tilga o'tkaz (masalan 'TypeScript: kod'). Tilga xos odatlarni saqla." + _CODE_NOTE + " Kirish: {args}"),
    Cmd("regex", DEV, "Regex yozish", "tavsif",
        "Shu tavsif bo'yicha regex yoz, qismlarini tushuntir va 3 ta misolda sinab ko'rsat: {args}"),
    Cmd("sql", DEV, "SQL so'rov yozish", "tavsif",
        "Shu tavsif bo'yicha SQL so'rov yoz va ishlashini tushuntir. Jadval tuzilmasi aniq bo'lmasa, farazingni ayt." + _CODE_NOTE + " Tavsif: {args}"),
    Cmd("git", DEV, "Git muammosini hal qilish", "muammo",
        "Shu Git muammosini hal qilish uchun aniq buyruqlarni ketma-ket ber va har birining nima qilishini 1 gapda ayt. Xavfli buyruq bo'lsa ogohlantir: {args}"),
    Cmd("terminal", DEV, "Terminal buyrug'i (PowerShell / Linux)", "nima qilmoqchisiz",
        "Shu ishni qilish uchun Windows PowerShell va Linux bash buyruqlarini alohida ber. Xavfli buyruq bo'lsa ogohlantir: {args}"),
    Cmd("fastapi", DEV, "FastAPI endpoint / struktura", "tavsif",
        "Shu tavsif bo'yicha FastAPI kodini yoz (pydantic modellar, xatolarni qayta ishlash bilan)." + _CODE_NOTE + " Tavsif: {args}"),
    Cmd("react", DEV, "React komponent", "tavsif",
        "Shu tavsif bo'yicha React komponentini yoz (funksional komponent, hooks, TypeScript bo'lsa yaxshi)." + _CODE_NOTE + " Tavsif: {args}"),
    Cmd("tgbot", DEV, "Telegram bot (aiogram) kodi", "tavsif",
        "Shu tavsif bo'yicha aiogram 3 da Telegram bot kodi yoz (handlerlar, holat, xatolarni qayta ishlash)." + _CODE_NOTE + " Tavsif: {args}"),
    Cmd("docker", DEV, "Docker savollari va fayllar", "savol",
        "Shu Docker savoliga javob ber yoki kerakli Dockerfile / docker-compose yoz." + _CODE_NOTE + " Savol: {args}"),
    Cmd("aws", DEV, "AWS (EC2, S3...) bo'yicha yordam", "savol",
        "Shu AWS savoliga qadamma-qadam javob ber (konsol va CLI yo'li). Xarajat yoki xavfsizlik jihati bo'lsa, ogohlantir: {args}"),
    Cmd("reja", DEV, "Loyiha uchun ish rejasi", "loyiha g'oyasi",
        "Shu loyiha uchun amaliy ish rejasi tuz: bosqichlar, har bosqichda vazifalar va taxminiy vaqt, birinchi MVP nimadan iborat: {args}"),
    Cmd("arxitektura", DEV, "Loyiha arxitekturasi", "loyiha",
        "Shu loyiha uchun arxitektura taklif qil: komponentlar, ma'lumotlar bazasi, API, joylashtirish. Nega bunday tanlaganingni qisqa tushuntir: {args}"),
    Cmd("readme", DEV, "README yozish", "loyiha tavsifi",
        "Shu loyiha uchun professional README.md yoz (tavsif, o'rnatish, ishlatish, struktura): {args}"),
    Cmd("commit", DEV, "Commit xabari", "o'zgarishlar",
        "Shu o'zgarishlar uchun Conventional Commits formatida 3 ta commit xabari varianti yoz: {args}"),
    Cmd("intervyu", DEV, "Intervyu savollari va javoblari", "texnologiya",
        "Shu texnologiya bo'yicha dasturchi intervyusida beriladigan 8 ta savolni qiyinlik tartibida ber va qisqa namunaviy javoblarini yoz: {args}"),
    Cmd("yolxarita", DEV, "O'rganish yo'l xaritasi", "yo'nalish",
        "Shu yo'nalishni o'rganish uchun amaliy yo'l xaritasi tuz: bosqichlar, har bosqichda nima o'rganish va qanday mini-loyiha qilish: {args}"),
    Cmd("aiprompt", DEV, "Claude Code / Cursor uchun kuchli prompt", "vazifa",
        "Shu vazifa uchun AI kod yordamchisiga (Claude Code, Cursor) beriladigan aniq, to'liq prompt yoz: kontekst, maqsad, cheklovlar, "
        "tekshirish usuli. Vazifa: {args}"),
]

BY_NAME: dict[str, Cmd] = {c.name: c for c in COMMANDS}
NAMES: list[str] = [c.name for c in COMMANDS]


def build_prompt(cmd: Cmd, args: str) -> str:
    return cmd.prompt.replace("{args}", args.strip())


def usage(cmd: Cmd) -> str:
    return f"/{cmd.name} {cmd.arg}" if cmd.arg else f"/{cmd.name}"


def help_pages() -> list[str]:
    """Buyruqlar ro'yxati: Telegram chegarasiga sig'adigan bir nechta xabar."""
    pages = []
    for category in (VIDEO, DEV):
        lines = [category, ""]
        for c in COMMANDS:
            if c.category == category:
                lines.append(f"{usage(c)} — {c.desc}")
        pages.append("\n".join(lines))
    pages.append(
        "🗂 Kotib\n\n"
        "Oddiy gapiring: \"ertaga 9:00 da dars haqida eslat\", \"vazifa qo'sh: montaj\", \"qayd: yangi g'oya\"\n"
        "/tasks — vazifalar\n/reminders — eslatmalar\n/notes — qaydlar\n/brief — bugungi xulosa\n\n"
        "⚙️ Boshqa\n\n"
        "/new — yangi suhbat (kontekstni tozalash)\n/veo — [QAHRAMON] va [USLUB] matnlari\n/help — shu ro'yxat\n\n"
        "💡 Kod yoki xatoni yozishga qiyin bo'lsa, uni alohida xabar qilib yuboring, keyin shu xabarga javob (reply) "
        "qilib /xato, /review yoki /tushuntir deb yozing."
    )
    return pages
