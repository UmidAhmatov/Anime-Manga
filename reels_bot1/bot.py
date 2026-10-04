"""@umid_codevision reels boti.

Telegram xabarini oladi -> Claude API'dan reels g'oyasi yoki ssenariy so'raydi -> javobni qaytaradi.
Ishga tushirish: python bot.py   (sozlamalar .env faylida, .env.example'ga qarang)

Muhim: bitta token bilan faqat BITTA nusxa ishlashi mumkin. Serverda ishga tushirsangiz,
kompyuterdagisini to'xtating, aks holda Telegram "Conflict" xatosini beradi.
"""

import asyncio
import html
import logging
import os
import sys
import time
from collections import defaultdict, deque
from datetime import datetime
from zoneinfo import ZoneInfo

import anthropic
from aiogram import Bot, Dispatcher, F, Router
from aiogram.exceptions import TelegramUnauthorizedError
from aiogram.filters import Command, CommandStart
from aiogram.types import Message
from aiogram.utils.chat_action import ChatActionSender
from dotenv import load_dotenv

import secretary
from prompts import QAHRAMON, SYSTEM_PROMPT, USLUB

load_dotenv(override=True)  # .env ustun: kompyuterda eski ANTHROPIC_API_KEY o'rnatilgan bo'lsa ham

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("reels_bot")


# ---------- Sozlamalar ----------

def _require(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        sys.exit(f"Xato: .env faylida {name} yo'q. .env.example'ga qarang.")
    return value


def _parse_ids(raw: str) -> set[int]:
    try:
        return {int(x) for x in raw.replace(" ", "").split(",") if x}
    except ValueError:
        sys.exit("Xato: ALLOWED_USER_IDS faqat raqamlardan iborat bo'lsin, masalan: 123456789,987654321")


BOT_TOKEN = _require("BOT_TOKEN")
# Claude'ga kirish: oddiy API kaliti (sk-ant-api03-...) YOKI bearer token (ANTHROPIC_AUTH_TOKEN, masalan sk-ant-usr-...)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
ANTHROPIC_AUTH_TOKEN = os.getenv("ANTHROPIC_AUTH_TOKEN", "").strip()
if not ANTHROPIC_API_KEY and not ANTHROPIC_AUTH_TOKEN:
    sys.exit("Xato: .env faylida ANTHROPIC_API_KEY (yoki ANTHROPIC_AUTH_TOKEN) yo'q. .env.example'ga qarang.")
USE_TOKEN = not ANTHROPIC_API_KEY  # API kalit bo'sh bo'lsa, bearer token ishlatiladi
CREDENTIAL = ANTHROPIC_AUTH_TOKEN if USE_TOKEN else ANTHROPIC_API_KEY
CREDENTIAL_NAME = "ANTHROPIC_AUTH_TOKEN" if USE_TOKEN else "ANTHROPIC_API_KEY"
MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-5-5").strip()
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "4000"))
ALLOWED_USER_IDS = _parse_ids(os.getenv("ALLOWED_USER_IDS", ""))

TZ = ZoneInfo("Asia/Tashkent")
WEEKDAYS_UZ = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"]
TG_LIMIT = 4000          # Telegram chegarasi 4096 belgi, ozgina zaxira qoldiramiz
MAX_TOOL_ROUNDS = 6      # bitta xabarga javobda Claude ko'pi bilan nechta asbob chaqiruvi
HISTORY_TURNS = 3        # oxirgi 3 ta savol-javob eslab qolinadi ("2-sini yoz" ishlashi uchun)


# ---------- Holat (xotirada; bot qayta ishga tushsa tozalanadi) ----------

# Har doim juft saqlanadi: user, assistant, user, assistant...
history: dict[int, deque] = defaultdict(lambda: deque(maxlen=HISTORY_TURNS * 2))
busy: set[int] = set()   # javob kutilayotgan foydalanuvchilar (parallel so'rovlar pul yemasin)

if USE_TOKEN:
    client = anthropic.AsyncAnthropic(
        api_key=None, auth_token=ANTHROPIC_AUTH_TOKEN, max_retries=3, timeout=180.0,
        default_headers={"anthropic-beta": "oauth-2025-04-20"},  # OAuth/bearer tokenlar uchun kerak
    )
else:
    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY, max_retries=3, timeout=180.0)
dp = Dispatcher()
chat = Router()  # umumiy matn handlerlari: buyruqlardan keyin tekshirilishi uchun oxirida ulanadi


# ---------- Yordamchi funksiyalar ----------

def is_allowed(message: Message) -> bool:
    return message.from_user is not None and message.from_user.id in ALLOWED_USER_IDS


def split_message(text: str, limit: int = TG_LIMIT) -> list[str]:
    """Uzun javobni Telegram chegarasiga sig'adigan bo'laklarga, iloji boricha qator chegarasidan bo'ladi."""
    parts = []
    while len(text) > limit:
        cut = text.rfind("\n", 0, limit)
        if cut < limit // 2:
            cut = limit
        parts.append(text[:cut].rstrip())
        text = text[cut:].lstrip("\n")
    if text.strip():
        parts.append(text)
    return parts


def friendly_error(err: Exception) -> str:
    if isinstance(err, anthropic.AuthenticationError):
        return "❌ Claude API kaliti noto'g'ri yoki o'chirilgan. .env faylidagi Claude kalitini tekshiring."
    if isinstance(err, anthropic.RateLimitError):
        return "⏳ Claude hozir limitga yetdi. 1-2 daqiqadan keyin qayta yozing."
    if isinstance(err, anthropic.BadRequestError) and "credit" in str(err).lower():
        return "💳 Claude API balansi tugagan. console.anthropic.com -> Billing bo'limida to'ldiring."
    if isinstance(err, anthropic.NotFoundError):
        return f"❌ Model topilmadi: {MODEL}. .env faylidagi CLAUDE_MODEL ni tekshiring."
    if isinstance(err, anthropic.APIConnectionError):  # timeout ham shu yerga kiradi
        return "📡 Claude serveriga ulanib bo'lmadi. Birozdan keyin qayta urinib ko'ring."
    if isinstance(err, anthropic.APIStatusError):
        return f"⚠️ Claude xatosi ({err.status_code}). Birozdan keyin qayta urinib ko'ring."
    return "⚠️ Kutilmagan xato yuz berdi. Server loglarini tekshiring."


async def ask_claude(user_id: int, text: str) -> str:
    now = datetime.now(TZ)
    today = f"Hozir: {WEEKDAYS_UZ[now.weekday()]}, {now:%d.%m.%Y %H:%M} (Toshkent vaqti)."
    messages = [*history[user_id], {"role": "user", "content": text}]

    started = time.monotonic()
    for _ in range(MAX_TOOL_ROUNDS + 1):
        response = await client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=[
                # Katta, o'zgarmas qism keshlanadi: ketma-ket savollarda arzonroq tushadi
                {"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}},
                {"type": "text", "text": today},
            ],
            tools=secretary.TOOLS,
            messages=messages,
        )
        usage = response.usage
        log.info(
            "claude_ok user_id=%s model=%s in_tok=%s out_tok=%s cache_read=%s stop=%s duration_ms=%d",
            user_id, MODEL, usage.input_tokens, usage.output_tokens,
            getattr(usage, "cache_read_input_tokens", None), response.stop_reason,
            (time.monotonic() - started) * 1000,
        )
        if response.stop_reason != "tool_use":
            break
        # Kotib asboblari (eslatma, vazifa, qayd): natijani Claude'ga qaytaramiz
        messages.append({"role": "assistant", "content": response.content})
        results = []
        for block in response.content:
            if block.type == "tool_use":
                out = secretary.run_tool(user_id, block.name, block.input)
                log.info("tool user_id=%s name=%s", user_id, block.name)
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": out})
        messages.append({"role": "user", "content": results})

    reply = "".join(block.text for block in response.content if block.type == "text").strip()
    if not reply:
        return "🤔 Claude bo'sh javob qaytardi. Savolni boshqacharoq yozib ko'ring."
    if response.stop_reason == "max_tokens":
        reply += '\n\n✂️ Javob uzunlik chegarasida kesildi. Davomi uchun "davom et" deb yozing.'

    # Faqat muvaffaqiyatli javobdan keyin, juft qilib saqlaymiz
    history[user_id].append({"role": "user", "content": text})
    history[user_id].append({"role": "assistant", "content": reply})
    return reply


# ---------- Handlerlar (tartib muhim: yuqoridagisi birinchi tekshiriladi) ----------

@dp.message(lambda m: not is_allowed(m))
async def not_allowed(message: Message) -> None:
    user_id = message.from_user.id if message.from_user else "?"
    log.warning("ruxsatsiz_foydalanuvchi user_id=%s", user_id)
    await message.answer(
        "Bu shaxsiy bot.\n\n"
        f"Sizning Telegram ID'ingiz: {user_id}\n"
        "Agar bu sizning botingiz bo'lsa, shu raqamni .env faylidagi ALLOWED_USER_IDS ga yozing "
        "va botni qayta ishga tushiring."
    )


@dp.message(CommandStart())
async def cmd_start(message: Message) -> None:
    name = message.from_user.first_name if message.from_user else ""
    await message.answer(
        f"Salom, {name}! 👋\n\n"
        "Menga oddiy qilib yozing, masalan:\n"
        "• reels g'oyasi kerak\n"
        "• AI video laboratoriya uchun ssenariy yoz\n"
        "• faqat hook kerak: React o'rganish haqida\n\n"
        "Buyruqlar:\n"
        "/new — yangi suhbat (oldingi kontekstni unutish)\n"
        "/veo — [QAHRAMON] va [USLUB] matnlari (bosib nusxa olish uchun)\n\n"
        "Kotib: oddiy gapiring, masalan \"ertaga 9:00 da dars haqida eslat\", "
        "\"vazifa qo'sh: reels montaj qilish\", \"qayd: yangi g'oya ...\".\n"
        "/tasks — vazifalar, /reminders — eslatmalar, /notes — qaydlar, /brief — bugungi xulosa"
    )


@dp.message(Command("new"))
async def cmd_new(message: Message) -> None:
    history.pop(message.from_user.id, None)
    await message.answer("🧹 Kontekst tozalandi. Yangi mavzu bilan boshlayverasiz.")


@dp.message(Command("veo"))
async def cmd_veo(message: Message) -> None:
    await message.answer(f"[QAHRAMON] =\n<code>{html.escape(QAHRAMON)}</code>", parse_mode="HTML")
    await message.answer(f"[USLUB] =\n<code>{html.escape(USLUB)}</code>", parse_mode="HTML")


@dp.message(Command("tasks"))
async def cmd_tasks(message: Message) -> None:
    await message.answer("📋 Vazifalar:\n" + secretary.list_tasks(message.from_user.id))


@dp.message(Command("reminders"))
async def cmd_reminders(message: Message) -> None:
    await message.answer(secretary.list_reminders(message.from_user.id))


@dp.message(Command("notes"))
async def cmd_notes(message: Message) -> None:
    await message.answer("🗒 Qaydlar:\n" + secretary.list_notes(message.from_user.id))


@dp.message(Command("brief"))
async def cmd_brief(message: Message) -> None:
    await message.answer(secretary.brief(message.from_user.id))


@chat.message(F.text)
async def handle_text(message: Message) -> None:
    user_id = message.from_user.id
    if user_id in busy:
        await message.answer("⏳ Oldingi so'rov hali tayyorlanmoqda, biroz kuting.")
        return

    busy.add(user_id)
    try:
        async with ChatActionSender.typing(bot=message.bot, chat_id=message.chat.id):
            reply = await ask_claude(user_id, message.text)
    except anthropic.APIError as err:
        log.error("claude_error user_id=%s type=%s detail=%s", user_id, type(err).__name__, err)
        await message.answer(friendly_error(err))
        return
    except Exception:
        log.exception("kutilmagan_xato user_id=%s", user_id)
        await message.answer(friendly_error(Exception()))
        return
    finally:
        busy.discard(user_id)

    # Oddiy matn sifatida yuboramiz (parse_mode yo'q), shunda belgi xatolari botni yiqitmaydi
    for part in split_message(reply):
        await message.answer(part)


@chat.message()
async def handle_other(message: Message) -> None:
    await message.answer(
        "Hozircha faqat matnli xabarlarni tushunaman. "
        "Insights skrinshotlarini Claude ilovasiga yuboring yoki raqamlarni matn qilib yozing."
    )


# ---------- Ishga tushirish ----------

async def main() -> None:
    bot = Bot(BOT_TOKEN)
    try:
        me = await bot.get_me()
    except TelegramUnauthorizedError:
        await bot.session.close()
        sys.exit("Xato: BOT_TOKEN noto'g'ri. BotFather'dan tokenni qayta oling.")

    # Claude kalitini va modelni darhol tekshiramiz (bepul so'rov): xato bo'lsa, foydalanuvchi emas, terminal ko'rsatadi
    if not CREDENTIAL.startswith("sk-ant-"):
        log.warning("%s 'sk-ant-' bilan boshlanmayapti: ehtimol noto'g'ri nusxalangan.", CREDENTIAL_NAME)
    log.info("claude_auth=%s", CREDENTIAL_NAME)
    try:
        await client.models.retrieve(MODEL)
    except anthropic.AuthenticationError:
        await bot.session.close()
        sys.exit(
            f"Xato: Claude bu kalitni qabul qilmadi (401). Ishlatilayotgan: {CREDENTIAL_NAME}="
            f"{CREDENTIAL[:10]}...{CREDENTIAL[-4:]} (uzunligi {len(CREDENTIAL)}).\n"
            "console.anthropic.com -> API Keys'dan yangi kalit (sk-ant-api03-...) oling va .env dagi ANTHROPIC_API_KEY ga qo'ying."
        )
    except anthropic.NotFoundError:
        await bot.session.close()
        sys.exit(f"Xato: model topilmadi: {MODEL}. .env dagi CLAUDE_MODEL ni tekshiring.")
    except anthropic.APIError as err:
        log.warning("Claude tekshiruvi o'tkazib yuborildi (%s): %s", type(err).__name__, err)

    if not ALLOWED_USER_IDS:
        log.warning("ALLOWED_USER_IDS bo'sh: bot hech kimga javob bermaydi, faqat ID'ni ko'rsatadi.")
    log.info("bot_started username=@%s model=%s allowed=%s", me.username, MODEL, sorted(ALLOWED_USER_IDS))

    # Bot o'chiq paytda yozilgan eski xabarlarga javob bermaymiz (pul ham tejaladi)
    await bot.delete_webhook(drop_pending_updates=True)
    scheduler_task = asyncio.create_task(secretary.scheduler(bot, ALLOWED_USER_IDS))
    dp.include_router(chat)
    try:
        await dp.start_polling(bot)
    finally:
        scheduler_task.cancel()


if __name__ == "__main__":
    asyncio.run(main())
