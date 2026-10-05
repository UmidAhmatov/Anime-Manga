"""Kotib funksiyalari: eslatmalar, vazifalar, qaydlar va ertalabki xulosa.

Ma'lumotlar SQLite faylida (secretary.db) saqlanadi, bot qayta ishga tushsa ham yo'qolmaydi.
Claude bu funksiyalarni TOOLS orqali o'zi chaqiradi ("ertaga 9 da eslat" -> add_reminder),
/tasks, /notes, /reminders, /brief buyruqlari esa ro'yxatni to'g'ridan-to'g'ri ko'rsatadi.
"""

import asyncio
import logging
import os
import sqlite3
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

log = logging.getLogger("reels_bot.secretary")

TZ = ZoneInfo("Asia/Tashkent")
DB_PATH = os.getenv("DB_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "secretary.db"))
BRIEF_HOUR = int(os.getenv("BRIEF_HOUR", "8"))  # ertalabki xulosa soati (Toshkent); -1 = o'chirilgan

_db = sqlite3.connect(DB_PATH, check_same_thread=False)
_db.row_factory = sqlite3.Row
_db.executescript(
    """
    CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, text TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, text TEXT NOT NULL,
        due TEXT, done INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, text TEXT NOT NULL,
        due_ts INTEGER NOT NULL, sent INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    """
)
_db.commit()


# ---------- Yordamchi ----------

def _now() -> datetime:
    return datetime.now(TZ)


def _fmt_ts(ts: int) -> str:
    return datetime.fromtimestamp(ts, TZ).strftime("%d.%m.%Y %H:%M")


def _parse_date(value: str) -> str | None:
    try:
        return date.fromisoformat(value.strip()).isoformat()
    except (ValueError, AttributeError):
        return None


def _parse_datetime(value: str) -> datetime | None:
    try:
        return datetime.strptime(value.strip(), "%Y-%m-%d %H:%M").replace(tzinfo=TZ)
    except (ValueError, AttributeError):
        return None


# ---------- Amallar ----------

def add_note(user_id: int, text: str) -> str:
    cur = _db.execute("INSERT INTO notes (user_id, text, created) VALUES (?,?,?)", (user_id, text, int(_now().timestamp())))
    _db.commit()
    return f"Qayd saqlandi (id={cur.lastrowid})."


def list_notes(user_id: int, query: str = "") -> str:
    rows = _db.execute(
        "SELECT id, text, created FROM notes WHERE user_id=? AND text LIKE ? ORDER BY id DESC LIMIT 30",
        (user_id, f"%{query}%"),
    ).fetchall()
    if not rows:
        return "Qaydlar yo'q."
    return "\n".join(f"#{r['id']} ({_fmt_ts(r['created'])}) {r['text']}" for r in rows)


def delete_note(user_id: int, note_id: int) -> str:
    cur = _db.execute("DELETE FROM notes WHERE id=? AND user_id=?", (note_id, user_id))
    _db.commit()
    return "Qayd o'chirildi." if cur.rowcount else "Bunday qayd topilmadi."


def add_task(user_id: int, text: str, due_date: str = "") -> str:
    due = _parse_date(due_date) if due_date else None
    if due_date and due is None:
        return "Xato: due_date YYYY-MM-DD formatida bo'lsin."
    cur = _db.execute(
        "INSERT INTO tasks (user_id, text, due, created) VALUES (?,?,?,?)", (user_id, text, due, int(_now().timestamp()))
    )
    _db.commit()
    return f"Vazifa qo'shildi (id={cur.lastrowid})" + (f", muddat: {due}." if due else ".")


def list_tasks(user_id: int, include_done: bool = False) -> str:
    sql = "SELECT id, text, due, done FROM tasks WHERE user_id=?"
    if not include_done:
        sql += " AND done=0"
    rows = _db.execute(sql + " ORDER BY done, due IS NULL, due, id LIMIT 50", (user_id,)).fetchall()
    if not rows:
        return "Vazifalar yo'q."
    today = _now().date().isoformat()
    lines = []
    for r in rows:
        mark = "✅" if r["done"] else ("🔥" if r["due"] and r["due"] < today else "⬜")
        due = f" (muddat: {r['due']})" if r["due"] else ""
        lines.append(f"{mark} #{r['id']} {r['text']}{due}")
    return "\n".join(lines)


def complete_task(user_id: int, task_id: int) -> str:
    cur = _db.execute("UPDATE tasks SET done=1 WHERE id=? AND user_id=?", (task_id, user_id))
    _db.commit()
    return "Vazifa bajarildi deb belgilandi." if cur.rowcount else "Bunday vazifa topilmadi."


def delete_task(user_id: int, task_id: int) -> str:
    cur = _db.execute("DELETE FROM tasks WHERE id=? AND user_id=?", (task_id, user_id))
    _db.commit()
    return "Vazifa o'chirildi." if cur.rowcount else "Bunday vazifa topilmadi."


def add_reminder(user_id: int, text: str, remind_at: str) -> str:
    when = _parse_datetime(remind_at)
    if when is None:
        return "Xato: remind_at 'YYYY-MM-DD HH:MM' formatida bo'lsin (Toshkent vaqti)."
    if when <= _now():
        return "Xato: bu vaqt o'tib ketgan. Kelajakdagi vaqtni ko'rsating."
    cur = _db.execute("INSERT INTO reminders (user_id, text, due_ts) VALUES (?,?,?)", (user_id, text, int(when.timestamp())))
    _db.commit()
    return f"Eslatma qo'yildi (id={cur.lastrowid}): {when:%d.%m.%Y %H:%M}."


def list_reminders(user_id: int) -> str:
    rows = _db.execute(
        "SELECT id, text, due_ts FROM reminders WHERE user_id=? AND sent=0 ORDER BY due_ts LIMIT 50", (user_id,)
    ).fetchall()
    if not rows:
        return "Kutilayotgan eslatmalar yo'q."
    return "\n".join(f"⏰ #{r['id']} {_fmt_ts(r['due_ts'])} — {r['text']}" for r in rows)


def delete_reminder(user_id: int, reminder_id: int) -> str:
    cur = _db.execute("DELETE FROM reminders WHERE id=? AND user_id=? AND sent=0", (reminder_id, user_id))
    _db.commit()
    return "Eslatma o'chirildi." if cur.rowcount else "Bunday eslatma topilmadi."


def brief(user_id: int) -> str:
    now = _now()
    end_of_day = int(now.replace(hour=23, minute=59, second=59).timestamp())
    todays = _db.execute(
        "SELECT text, due_ts FROM reminders WHERE user_id=? AND sent=0 AND due_ts<=? ORDER BY due_ts", (user_id, end_of_day)
    ).fetchall()
    parts = [f"☀️ Xayrli tong! Bugun {now:%d.%m.%Y}."]
    parts.append("⏰ Bugungi eslatmalar:\n" + "\n".join(f"• {datetime.fromtimestamp(r['due_ts'], TZ):%H:%M} — {r['text']}" for r in todays)
                 if todays else "⏰ Bugun eslatmalar yo'q.")
    parts.append("📋 Ochiq vazifalar:\n" + list_tasks(user_id))
    return "\n\n".join(parts)


# ---------- Claude uchun asboblar ----------

def _tool(name: str, description: str, properties: dict, required: list[str]) -> dict:
    return {"name": name, "description": description,
            "input_schema": {"type": "object", "properties": properties, "required": required}}


_TEXT = {"type": "string"}
_ID = {"type": "integer"}

TOOLS = [
    _tool("add_reminder", "Belgilangan vaqtda Telegram'da eslatma yuborish. Vaqt Toshkent vaqti, kelajakda bo'lsin.",
          {"text": _TEXT, "remind_at": {"type": "string", "description": "YYYY-MM-DD HH:MM"}}, ["text", "remind_at"]),
    _tool("list_reminders", "Kutilayotgan eslatmalar ro'yxati.", {}, []),
    _tool("delete_reminder", "Eslatmani id bo'yicha o'chirish.", {"id": _ID}, ["id"]),
    _tool("add_task", "Vazifalar ro'yxatiga qo'shish (muddat ixtiyoriy).",
          {"text": _TEXT, "due_date": {"type": "string", "description": "YYYY-MM-DD, ixtiyoriy"}}, ["text"]),
    _tool("list_tasks", "Vazifalar ro'yxati.", {"include_done": {"type": "boolean"}}, []),
    _tool("complete_task", "Vazifani bajarilgan deb belgilash.", {"id": _ID}, ["id"]),
    _tool("delete_task", "Vazifani o'chirish.", {"id": _ID}, ["id"]),
    _tool("add_note", "Qayd, g'oya yoki eslab qolish kerak bo'lgan ma'lumotni saqlash.", {"text": _TEXT}, ["text"]),
    _tool("list_notes", "Qaydlarni ko'rish yoki matn bo'yicha qidirish.", {"query": _TEXT}, []),
    _tool("delete_note", "Qaydni o'chirish.", {"id": _ID}, ["id"]),
]


def run_tool(user_id: int, name: str, args: dict) -> str:
    try:
        match name:
            case "add_reminder": return add_reminder(user_id, args["text"], args["remind_at"])
            case "list_reminders": return list_reminders(user_id)
            case "delete_reminder": return delete_reminder(user_id, int(args["id"]))
            case "add_task": return add_task(user_id, args["text"], args.get("due_date", ""))
            case "list_tasks": return list_tasks(user_id, bool(args.get("include_done", False)))
            case "complete_task": return complete_task(user_id, int(args["id"]))
            case "delete_task": return delete_task(user_id, int(args["id"]))
            case "add_note": return add_note(user_id, args["text"])
            case "list_notes": return list_notes(user_id, args.get("query", ""))
            case "delete_note": return delete_note(user_id, int(args["id"]))
    except (KeyError, TypeError, ValueError) as err:
        return f"Xato: noto'g'ri parametrlar ({err})."
    return f"Xato: noma'lum asbob {name}."


# ---------- Fon vazifasi: eslatmalar va ertalabki xulosa ----------

def _meta_get(key: str) -> str | None:
    row = _db.execute("SELECT value FROM meta WHERE key=?", (key,)).fetchone()
    return row["value"] if row else None


def _meta_set(key: str, value: str) -> None:
    _db.execute("INSERT INTO meta (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (key, value))
    _db.commit()


async def scheduler(bot, user_ids: set[int]) -> None:
    """Har 20 soniyada vaqti kelgan eslatmalarni yuboradi; har kuni BRIEF_HOUR da xulosa yuboradi."""
    while True:
        try:
            now = _now()
            due = _db.execute(
                "SELECT id, user_id, text, due_ts FROM reminders WHERE sent=0 AND due_ts<=?", (int(now.timestamp()),)
            ).fetchall()
            for r in due:
                late = int(now.timestamp()) - r["due_ts"] > 300
                prefix = f"⏰ Eslatma (kechikib, {_fmt_ts(r['due_ts'])}):" if late else "⏰ Eslatma:"
                try:
                    await bot.send_message(r["user_id"], f"{prefix}\n{r['text']}")
                except Exception:
                    log.exception("eslatma_yuborilmadi id=%s", r["id"])
                    continue  # keyingi aylanishda qayta uriniladi
                _db.execute("UPDATE reminders SET sent=1 WHERE id=?", (r["id"],))
                _db.commit()

            if BRIEF_HOUR >= 0 and now.hour >= BRIEF_HOUR:
                for uid in user_ids:
                    key = f"brief:{uid}"
                    if _meta_get(key) == now.date().isoformat():
                        continue
                    _meta_set(key, now.date().isoformat())  # avval belgilaymiz: xato bo'lsa ham spam bo'lmaydi
                    try:
                        await bot.send_message(uid, brief(uid))
                    except Exception:
                        log.exception("brief_yuborilmadi user_id=%s", uid)
        except Exception:
            log.exception("scheduler_xato")
        await asyncio.sleep(20)
