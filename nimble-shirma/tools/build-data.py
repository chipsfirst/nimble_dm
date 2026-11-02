#!/usr/bin/env python3
"""Собирает data-ru.js для ширмы из markdown-локализации Nimble (Nimble Vault RU)."""
import json
import os
import re

VAULT = os.path.expanduser("~/Downloads/nimble-localization-main/Nimble Vault RU")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data-ru.js")

SCHOOLS = {
    "огня": "Огонь", "льда": "Лёд", "молнии": "Молния", "ветра": "Ветер",
    "некромантии": "Некромантия", "сияния": "Сияние", "знахаря": "Знахарь",
    "прикладные": "Прикладные",
}
SAVE_KEYS = {"СИЛ": "STR", "ЛВК": "DEX", "ИНТ": "INT", "ВОЛ": "WIL"}
STAT_KEYS = ["STR", "DEX", "INT", "WIL"]
ROLES = {
    "Берсерк": "Неудержимая сила ярости и разрушения.",
    "Буревестник": "Мастер погоды, зверя и природы.",
    "Вихрь": "Дисциплинированный боец с быстрыми руками и ногами.",
    "Знахарь": "Порча, напасти и ведьмовские зелья.",
    "Клятвенник": "Верный страж, защитник и мститель за слабых.",
    "Командир": "Тактик, лидер и мастер оружия.",
    "Маг": "Владеет и формирует огонь, лёд и молнию.",
    "Менестрель": "Вдохновляющее присутствие, острый ум и острый язык.",
    "Мошенник": "Скрытный, подлый и грязно дерущийся плут.",
    "Охотник": "Выживальщик, мастер лука и следопыт.",
    "Пастырь": "Владыка жизни и смерти, ведёт верного спутника.",
    "Тенемант": "Призывает орды расходуемых миньонов.",
}
RULE_CATS = {
    "Действия героев": "Бой", "Реакции героев": "Бой", "Структура боя": "Бой",
    "Скорость": "Бой", "Укрытие и скрытность": "Бой", "Захват": "Бой",
    "Падение и принудительное перемещение": "Бой", "Дистанция и досягаемость": "Бой",
    "Измерение пространства": "Бой", "Руководство по столкновениям": "Бой",
    "Уникальные столкновения": "Бой", "Тонкая настройка сложности": "Бой",
    "Хиты, смерть и ранения": "Бой",
    "Отдых": "Отдых", "Кости хитов": "Отдых", "Блага ночлега": "Отдых", "Затишье": "Отдых",
    "Колдовство": "Магия", "Концентрация": "Магия", "Свитки заклинаний и цена": "Магия",
    "Волшебные палочки и цена": "Магия", "Магические предметы и цена": "Магия",
    "Создание героя": "Герои", "Повышение уровня": "Герои", "Навыки": "Герои",
    "Характеристики": "Герои", "Проверки навыков и спасброски": "Герои",
    "Преимущество и помеха": "Герои", "Степени успеха": "Герои", "Размер": "Герои",
    "Миньоны": "Монстры", "Управление монстрами": "Монстры",
    "Управление легендарными монстрами": "Монстры", "Конструктор монстров": "Монстры",
    "Конструктор легендарных монстров": "Монстры", "Особые способности монстров": "Монстры",
    "Пешки": "Монстры",
    "Правила снаряжения": "Снаряжение", "Богатство": "Снаряжение",
}


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def fix_dice(s):
    return re.sub(r"(\d*)к(\d+)", lambda m: (m.group(1) or "") + "d" + m.group(2), s)


def strip_md(s):
    s = s.replace("\r\n", "\n")
    s = re.sub(r"^---\n.*?\n---\n", "", s, flags=re.S)
    s = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"\2", s)
    s = re.sub(r"\[\[([^\]]+)\]\]", r"\1", s)
    s = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", s)
    s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", s)
    s = fix_dice(s)
    s = re.sub(r"^>\s*\[![^\]]+\]-?\s*", "", s, flags=re.M)
    s = re.sub(r"^>\s*", "", s, flags=re.M)
    s = re.sub(r"^#{1,6}\s*", "", s, flags=re.M)
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s, flags=re.S)
    s = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"\1", s, flags=re.S)
    s = re.sub(r"`([^`]+)`", r"\1", s)
    s = re.sub(r"^\s*[-*]\s+", "• ", s, flags=re.M)
    s = re.sub(r"\*{2,}", "", s)
    s = re.sub(r"[ \t]+\n", "\n", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


def kv_line(line):
    """**Ключ:** значение | **Ключ2:** значение"""
    out = {}
    for m in re.finditer(r"\*\*(.+?):\*\*\s*([^|]+)", line):
        out[m.group(1).strip().lower()] = m.group(2).strip()
    return out


def bullets(lines):
    """Список • **Название.** текст с продолжениями."""
    items = []
    cur = None
    for line in lines:
        m = re.match(r"^\s*[-*]\s+\*\*(.+?)[.\*]*\*\*\s*(.*)$", line)
        if m:
            if cur:
                items.append(cur)
            name = strip_md(m.group(1).strip().rstrip("."))
            cur = [name, m.group(2).strip()]
        elif cur is not None:
            st = line.strip()
            if not st or st.startswith((">", "---", "#", "**", "|")):
                continue
            cur[1] = fix_dice((cur[1] + " " + st).strip())
    if cur:
        items.append(cur)
    cleaned = []
    for n, d in items:
        d = strip_md(d)
        d = re.sub(r"\s*ИЛИ:?\s*$", "", d).strip()
        cleaned.append({"n": n, "d": d})
    return cleaned


def blockquote_specials(text):
    lines = text.split("\n")
    out = []
    buf = []
    for line in lines:
        if line.startswith(">"):
            buf.append(re.sub(r"^>\s?", "", line))
        else:
            if buf:
                out.append(" ".join(buf))
                buf = []
    if buf:
        out.append(" ".join(buf))
    specs = []
    for b in out:
        if "[!" in b:
            continue
        b = strip_md(b)
        m = re.match(r"^(.+?)[.!]\s+(.*)$", b)
        if m:
            specs.append({"n": m.group(1).strip().rstrip("."), "d": m.group(2).strip()})
        elif b.strip():
            specs.append({"n": "Особенность", "d": b.strip()})
    return specs


# ---------------- rules / conditions ----------------
def parse_conditions():
    path = os.path.join(VAULT, "Правила", "Состояния.md")
    text = read(path)
    conds = []
    for line in text.split("\n"):
        m = re.match(r"^\s*[-*]\s+\*\*(.+?)[.\*]*\*\*\s*(.*)$", line)
        if m:
            conds.append({"name": m.group(1).strip().rstrip("."), "desc": strip_md(m.group(2))})
    return conds


def parse_glossary():
    path = os.path.join(VAULT, "Правила", "Глоссарий.md")
    text = read(path)
    items = []
    for line in text.split("\n"):
        m = re.match(r"^\s*[-*]\s+\*\*(.+?)[.\*]*\*\*\s*(.*)$", line)
        if m:
            items.append({"name": m.group(1).strip().rstrip("."), "cat": "Термины", "text": strip_md(m.group(2))})
    return items


def parse_rules():
    folder = os.path.join(VAULT, "Правила")
    out = []
    for f in sorted(os.listdir(folder)):
        if not f.endswith(".md"):
            continue
        name = f[:-3]
        if name in ("Глоссарий", "Состояния"):
            continue
        body = strip_md(read(os.path.join(folder, f)))
        if len(body) > 6000:
            body = body[:6000].rsplit(" ", 1)[0] + "…"
        out.append({"name": name, "cat": RULE_CATS.get(name, "Правила"), "text": body})
    return out


# ---------------- spells ----------------
def parse_spells():
    out = []
    for school_folder, school in SCHOOLS.items():
        if school_folder == "прикладные":
            folder = os.path.join(VAULT, "Магия", "Школы магии", "Прикладные заклинания")
        else:
            folder = os.path.join(VAULT, "Магия", "Школы магии", "Заклинания " + school_folder)
        if not os.path.isdir(folder):
            continue
        for f in sorted(os.listdir(folder)):
            if not f.endswith(".md"):
                continue
            text = read(os.path.join(folder, f))
            if "Круг" not in text and "Заговор" not in text and "Прикладной" not in text:
                continue
            name = f[:-3]
            tier = 0
            m = re.search(r"Круг\s+(\d+)", text)
            if m:
                tier = int(m.group(1))
            header = next((l.strip() for l in text.split("\n") if l.strip()), "")
            cast, target = "", ""
            lines = text.split("\n")
            cast_idx = 0
            for i, line in enumerate(lines):
                s = line.strip()
                if not s or s.startswith("*") or s.startswith("#"):
                    continue
                if "|" in s or re.match(r"^\d+\s+(Действие|Действия)", s) or s.lower().startswith(("реакция", "1 минута", "10 минут", "1 час")):
                    parts = [p.strip() for p in s.split("|")]
                    cast = parts[0]
                    target = " · ".join(parts[1:]) if len(parts) > 1 else ""
                    cast_idx = i
                    break
            body = strip_md("\n".join(lines[cast_idx + 1:])) if cast_idx else strip_md(text)
            # remove the italic header line from body if it slipped in
            body = re.sub(r"^(Круг \d+.*|Заговор.*|Прикладной.*)\n+", "", body)
            out.append({
                "name": name, "school": school, "tier": tier,
                "cast": cast or "1 действие", "target": target,
                "text": body.strip(),
            })
    # secret spells
    folder = os.path.join(VAULT, "Магия", "Тайные заклинания")
    if os.path.isdir(folder):
        for f in sorted(os.listdir(folder)):
            if not f.endswith(".md"):
                continue
            text = read(os.path.join(folder, f))
            tier = 0
            m = re.search(r"Круг\s+(\d+)", text)
            if m:
                tier = int(m.group(1))
            out.append({
                "name": f[:-3], "school": "Тайные", "tier": tier,
                "cast": "—", "target": "", "text": strip_md(text),
            })
    return out


# ---------------- monsters ----------------
def armor_kind(v):
    v = (v or "").lower()
    if "тяж" in v:
        return "heavy"
    if "сред" in v:
        return "medium"
    return "none"


def speed_parts(v):
    v = v or ""
    mode = "ходьба"
    for word, m in (("полёт", "полёт"), ("полет", "полёт"), ("копа", "копание"), ("плава", "плавание"), ("лаза", "лазание")):
        if word in v.lower():
            mode = m
    num = re.search(r"\d+", v)
    return (int(num.group()) if num else 6), mode


def parse_monsters():
    folder = os.path.join(VAULT, "Противники")
    out = []
    for dp, _, files in os.walk(folder):
        for f in sorted(files):
            if not f.endswith(".md"):
                continue
            text = read(os.path.join(dp, f))
            name = f[:-3]
            if "**Уровень:**" in text:
                lines = text.split("\n")
                meta = kv_line(lines[0]) if lines else {}
                stats = kv_line(lines[1]) if len(lines) > 1 else {}
                hp_raw = (stats.get("хиты") or "").strip()
                minion = "миньон" in hp_raw.lower()
                hp = None if minion else (int(re.search(r"\d+", hp_raw).group()) if re.search(r"\d+", hp_raw) else None)
                speed, mode = speed_parts(stats.get("скорость"))
                before = text.split("**Действия**")[0] if "**Действия**" in text else text
                after = text.split("**Действия**", 1)[1] if "**Действия**" in text else ""
                actions = bullets(after.split("\n"))
                if not actions and after.strip():
                    actions = [{"n": "Действие", "d": strip_md(after)}]
                out.append({
                    "name": name, "lvl": (meta.get("уровень") or "1").strip(),
                    "hp": hp, "armor": armor_kind(stats.get("броня")),
                    "speed": speed, "mode": mode,
                    "size": (meta.get("размер") or "").strip(),
                    "minion": minion, "kind": (meta.get("группа") or "").strip(),
                    "actions": actions, "special": blockquote_specials(before),
                })
            elif "**ДЕЙСТВИЯ:**" in text:
                level = ""
                m = re.search(r"Легендарный монстр\s+(\d+)-го", text)
                if m:
                    level = m.group(1)
                hp = re.search(r"\*\*Хиты:\*\*\s*(\d+)", text)
                armor = re.search(r"\*\*Броня:\*\*\s*([^|\n]+)", text)
                sub = text.split("\n")[0]
                size = ""
                for w, s in (("огромн", "Огромный"), ("больш", "Большой"), ("средн", "Средний"), ("маленьк", "Маленький")):
                    if w in sub.lower():
                        size = s
                        break
                after = text.split("**ДЕЙСТВИЯ:**", 1)[1] if "**ДЕЙСТВИЯ:**" in text else ""
                actions = bullets(after.split("\n"))
                if not actions:
                    for para in re.split(r"\n\s*\n", after):
                        mm = re.match(r"^\*\*(.+?)\.?\*\*\s*(.+)$", para.strip(), re.S)
                        if mm and "Хиты" not in mm.group(1) and "Броня" not in mm.group(1):
                            actions.append({"n": mm.group(1).strip().rstrip("."), "d": strip_md(mm.group(2))})
                specials = blockquote_specials(text.split("**ДЕЙСТВИЯ:**")[0])
                for key, label in (("ОКРОВАВЛЕНА", "Окровавлена"), ("ПОСЛЕДНИЙ РУБЕЖ", "Последний рубеж")):
                    mm = re.search(r"\*\*" + key + r":?\*\*\s*(.+)", text, re.S)
                    if mm:
                        specials.append({"n": label, "d": strip_md(mm.group(1).split("\n\n")[0])})
                out.append({
                    "name": name, "lvl": level or "—",
                    "hp": int(hp.group(1)) if hp else None,
                    "armor": armor_kind(armor.group(1) if armor else "нет"),
                    "speed": 6, "mode": "ходьба", "size": size or "Большой",
                    "minion": False, "kind": "Легендарные",
                    "actions": actions, "special": specials,
                })
    out.sort(key=lambda x: (x["kind"], x["name"]))
    return out


# ---------------- classes ----------------
def parse_classes():
    base = os.path.join(VAULT, "Герои", "Классы")
    out = []
    for cls_name in sorted(os.listdir(base)):
        f = os.path.join(base, cls_name, cls_name + ".md")
        if not os.path.isfile(f):
            continue
        text = read(f)
        key = re.search(r"\*\*Ключевые характеристики:\*\*\s*(.+)", text)
        die = re.search(r"\*\*Кость Хитов:\*\*\s*(\S+)", text)
        hp = re.search(r"\*\*Хиты:\*\*\s*(\d+)", text)
        saves = re.search(r"\*\*Спасброски:\*\*\s*(.+)", text)
        armor = re.search(r"\*\*Броня:\*\*\s*(.+)", text)
        weapons = re.search(r"\*\*Оружие:\*\*\s*(.+)", text)
        gear = re.search(r"\*\*Снаряжение:\*\*\s*(.+)", text)
        keys = []
        if key:
            for token in re.split(r"[,/ ]+", key.group(1).strip()):
                t = token.strip().upper()
                if t in SAVE_KEYS:
                    keys.append(SAVE_KEYS[t])
        save_map = {"STR": 0, "DEX": 0, "INT": 0, "WIL": 0}
        if saves:
            for m in re.finditer(r"(СИЛ|ЛВК|ИНТ|ВОЛ)\s*([+\-−]?)", saves.group(1)):
                stat = SAVE_KEYS[m.group(1)]
                sign = m.group(2)
                save_map[stat] = 1 if sign == "+" else (-1 if sign in "-−" else 0)
        lvl1 = []
        lm = re.search(r"#### Уровень 1\s*(.*?)(?=\n#### |\Z)", text, re.S)
        if lm:
            chunk = lm.group(1).strip()
            parts = re.split(r"\n(?=\*\*)", chunk)
            for part in parts:
                part = part.strip()
                if not part:
                    continue
                m = re.match(r"^\*\*(.+?)[.\*]*\*\*\s*(.*)$", part, re.S)
                if m:
                    lvl1.append({"n": m.group(1).strip().rstrip("."), "d": strip_md(m.group(2)).replace("\n", " ")})
        out.append({
            "name": cls_name,
            "role": ROLES.get(cls_name, ""),
            "hp": int(hp.group(1)) if hp else 10,
            "hitDie": re.sub(r"^1(d\d+)$", r"\1", fix_dice(die.group(1))) if die else "d8",
            "key": keys or ["STR", "DEX"],
            "saves": save_map,
            "armor": [a.strip().capitalize() for a in (armor.group(1) if armor else "").split(",") if a.strip()],
            "weapons": (weapons.group(1) if weapons else "").strip(),
            "gear": [g.strip() for g in (gear.group(1) if gear else "").split(",") if g.strip()],
            "lvl1": lvl1,
        })
    return out


# ---------------- ancestries / backgrounds ----------------
def parse_ancestries():
    out = []
    for section in ("Обычные происхождения", "Экзотические происхождения"):
        folder = os.path.join(VAULT, "Герои", "Происхождения", section)
        if not os.path.isdir(folder):
            continue
        for f in sorted(os.listdir(folder)):
            if not f.endswith(".md"):
                continue
            text = read(os.path.join(folder, f))
            lines = [l for l in text.split("\n") if l.strip()]
            size = ""
            if lines and re.match(r"^\(.+\)$", lines[0].strip()):
                size = lines[0].strip()[1:-1]
            body = strip_md("\n".join(lines[1:]))
            trait = ""
            tm = re.search(r"\*\*(.+?)\*\*\s*\n(.*)", "\n".join(lines[1:]), re.S)
            if tm:
                trait = tm.group(1).strip().rstrip(".") + ". " + strip_md(tm.group(2))
            out.append({"name": f[:-3], "size": size or "Средний", "trait": trait or body})
    return out


def parse_backgrounds():
    out = []
    folder = os.path.join(VAULT, "Герои", "Предыстории", "Базовые предыстории")
    if not os.path.isdir(folder):
        return out
    for f in sorted(os.listdir(folder)):
        if not f.endswith(".md"):
            continue
        out.append({"name": f[:-3], "text": strip_md(read(os.path.join(folder, f)))})
    return out


# ---------------- equipment ----------------
def table_rows(text, start_marker=None):
    rows = []
    started = start_marker is None
    for line in text.split("\n"):
        if start_marker and start_marker in line:
            started = True
            continue
        if not started:
            continue
        s = line.strip()
        if not s.startswith("|"):
            continue
        cells = [c.strip() for c in s.strip("|").split("|")]
        if not cells or all(set(c) <= set("-: ") for c in cells):
            continue
        if cells[0].upper() in ("ТИП", "ПРЕДМЕТ"):
            continue
        rows.append(cells)
    return rows


def parse_armor():
    text = read(os.path.join(VAULT, "Снаряжение", "Броня.md"))
    out = []
    cat = ""
    for line in text.split("\n"):
        s = line.strip()
        m = re.match(r"^\*\*(.+?)\*\*$", s)
        if m and not s.startswith("|"):
            cat = m.group(1).strip()
            continue
        if not s.startswith("|"):
            continue
        cells = [c.strip() for c in s.strip("|").split("|")]
        if len(cells) < 3 or all(set(c) <= set("-: ") for c in cells) or cells[0].upper() == "ТИП":
            continue
        name = cells[0]
        note = ""
        nm = re.search(r"\((.+?)\)", name)
        if nm:
            note = nm.group(1).strip()
            name = re.sub(r"\s*\(.+?\)", "", name).strip()
        out.append({"name": name, "cat": cat, "armor": cells[1].replace(" ", ""), "cost": cells[2], "note": note})
    return out


def parse_weapons():
    text = read(os.path.join(VAULT, "Снаряжение", "Оружие.md"))
    out = []
    cat = ""
    for line in text.split("\n"):
        s = line.strip()
        m = re.match(r"^\*\*(.+?)\*\*$", s)
        if m and not s.startswith("|"):
            cat = "Дальний бой" if "дальн" in m.group(1).lower() else "Ближний бой"
            continue
        if not s.startswith("|"):
            continue
        cells = [c.strip() for c in s.strip("|").split("|")]
        if len(cells) < 4 or all(set(c) <= set("-: ") for c in cells) or cells[0].upper() == "ТИП":
            continue
        name, dmg, props, cost = cells[0], cells[1], cells[2], cells[3]
        dm = re.match(r"^(\d+к\d+)(?:\s*\+\s*([А-Яа-яA-Za-z]+))?\s*(.*)$", dmg)
        dice = fix_dice(dm.group(1)) if dm else fix_dice(dmg)
        stat = (dm.group(2) or "").upper() if dm else ""
        stat = {"ЛВК": "DEX", "СИЛ": "STR"}.get(stat, stat)
        dtype = (dm.group(3) if dm else "").strip()
        out.append({
            "name": name, "cat": cat, "dice": dice, "stat": stat, "type": dtype,
            "cost": cost, "props": [p.strip() for p in props.split(",") if p.strip() and p.strip() != "-"],
        })
    return out


def parse_gear():
    text = read(os.path.join(VAULT, "Снаряжение", "Походное снаряжение.md"))
    out = []
    for cells in table_rows(text, "Разное походное снаряжение"):
        if len(cells) < 3:
            continue
        out.append({"name": cells[0], "desc": fix_dice(cells[1]), "cost": cells[2]})
    return out


def parse_magic():
    out = []
    base = os.path.join(VAULT, "Снаряжение", "Наборы предметов")
    for dp, _, files in os.walk(base):
        for f in sorted(files):
            if not f.endswith(".md"):
                continue
            text = read(os.path.join(dp, f))
            lines = [l.strip() for l in text.split("\n") if l.strip()]
            rarity, desc = "", ""
            if lines:
                first = lines[0]
                is_rarity = first.startswith("(") or (
                    len(first) < 40 and re.search(r"(палочка|редк|необычн|легендарн|эпическ|обычная|очень редкая)", first, re.I)
                )
                if is_rarity:
                    rarity = strip_md(first)
                    desc = strip_md("\n".join(lines[1:]))
                else:
                    desc = strip_md("\n".join(lines))
            out.append({"name": f[:-3], "rarity": rarity, "desc": desc})
    out.sort(key=lambda x: x["name"])
    return out


# ---------------- assemble ----------------
def main():
    data = {
        "meta": {
            "title": "Nimble", "subtitle": "Ширма мастера", "version": "2.0",
            "note": "Данные локализации Nimble Vault RU. Nimble RPG © Nimble Co. Неофициальный перевод для личного использования.",
        },
        "stats": [
            {"id": "STR", "name": "Сила", "short": "СИЛ", "roll": "Сила", "desc": "Физическая мощь, выносливость и сопротивление урону."},
            {"id": "DEX", "name": "Ловкость", "short": "ЛВК", "roll": "Ловкость", "desc": "Ловкость, рефлексы и точность."},
            {"id": "INT", "name": "Интеллект", "short": "ИНТ", "roll": "Интеллект", "desc": "Знания, логика и колдовство."},
            {"id": "WIL", "name": "Воля", "short": "ВОЛ", "roll": "Воля", "desc": "Сила личности, смелость и мудрость."},
        ],
        "skills": [
            {"name": "Магия", "stat": "INT", "desc": "Магические явления, эффекты и предметы."},
            {"name": "Анализ", "stat": "INT", "desc": "Осмотр, дедукция, улики и механизмы."},
            {"name": "Точность", "stat": "DEX", "desc": "Замки, ловушки, механизмы, карманные кражи."},
            {"name": "Влияние", "stat": "WIL", "desc": "Убеждение, обман, торг и выступления."},
            {"name": "Проницательность", "stat": "WIL", "desc": "Мотивы, ложь и скрытые эмоции."},
            {"name": "Мощь", "stat": "STR", "desc": "Тяжести, преграды, лазание, плавание."},
            {"name": "Знания", "stat": "INT", "desc": "История, религии и народы."},
            {"name": "Природоведение", "stat": "WIL", "desc": "Выживание, следы, животные и растения."},
            {"name": "Восприятие", "stat": "WIL", "desc": "Скрытое, тайники и слежка."},
            {"name": "Скрытность", "stat": "DEX", "desc": "Прятаться и двигаться бесшумно."},
        ],
        "sizes": [],
        "dc": [
            {"name": "Легко", "value": "Сл 8", "desc": "Заметить крупного огра за маленьким кустом."},
            {"name": "Средне", "value": "Сл 12", "desc": "Найти тайную дверь за книжным шкафом."},
            {"name": "Сложно", "value": "Сл 15", "desc": "Успокоить раненого совомедведя в ловушке."},
            {"name": "Очень сложно", "value": "Сл 18", "desc": "Раскусить намерения обученного шпиона."},
            {"name": "Крайне сложно", "value": "Сл 20+", "desc": "Обезвредить древнюю легендарную ловушку."},
        ],
        "weaponProps": [],
        "rules": parse_glossary() + parse_rules(),
        "conditions": parse_conditions(),
        "weapons": parse_weapons(),
        "armor": parse_armor(),
        "gear": parse_gear(),
        "magic": parse_magic(),
        "monsters": parse_monsters(),
        "spells": parse_spells(),
        "classes": parse_classes(),
        "ancestries": parse_ancestries(),
        "backgrounds": parse_backgrounds(),
    }
    # своды правил, которых нет в глоссарии
    data["rules"].append({"name": "Броски к44, к66, к88", "cat": "Термины",
                          "text": "Брось 2 одинаковые кости: левая — десятки, правая — единицы. Такие броски не промахиваются и не выдают крит."})
    data["rules"].append({"name": "Столкновение", "cat": "Бой",
                          "text": "Столкновение начинается с броска инициативы и заканчивается, когда бой прекращается."})
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("window.NIMBLE_DATA = Object.assign(window.NIMBLE_DATA || {}, ")
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write(");\n")
    print("wrote", os.path.abspath(OUT))
    for k in ("rules", "conditions", "weapons", "armor", "gear", "magic", "monsters", "spells", "classes", "ancestries", "backgrounds"):
        print(f"{k}: {len(data[k])}")


if __name__ == "__main__":
    main()
