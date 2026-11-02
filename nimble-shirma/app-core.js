/* ================= Core: state, storage, utilities, dice, shell ================= */
const DATA = window.NIMBLE_DATA;
const STORAGE_KEY = "nimble.shirma.v1";
const $ = (sel, root = document) => (root || document).querySelector(sel);
const $$ = (sel, root = document) => Array.from((root || document).querySelectorAll(sel));
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const plural = (n, one, few, many) => { const m = Math.abs(n) % 100, d = m % 10; if (m > 10 && m < 20) return many; if (d === 1) return one; if (d > 1 && d < 5) return few; return many; };
const fmtDate = (ts) => new Date(ts).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
const fmtDateTime = (ts) => new Date(ts).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const fmtTimeShort = (ts) => new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const timeAgo = (ts) => {
  const d = Date.now() - ts;
  if (d < 60000) return "только что";
  if (d < 3600000) return Math.floor(d / 60000) + " мин назад";
  if (d < 86400000) return Math.floor(d / 3600000) + " ч назад";
  return fmtDate(ts);
};

const STAT_IDS = ["STR", "DEX", "INT", "WIL"];
const STAT_NAME = { STR: "Сила", DEX: "Ловкость", INT: "Интеллект", WIL: "Воля" };
const STAT_SHORT = { STR: "СИЛ", DEX: "ЛВК", INT: "ИНТ", WIL: "ВОЛ" };

const defaultState = () => ({
  chars: [],
  combat: { active: false, round: 1, turn: 0, combatants: [], started: null },
  reminders: [],
  notes: [],
  rolls: [],
  custom: [],
  ui: { tab: "screen", refType: "all", refQuery: "", refSel: null, noteId: null, charId: null, diceFaces: 20, diceCount: 1, diceMod: 0, diceMode: "normal", diceFormula: "" }
});

let state = loadState();

function loadState() {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const p = JSON.parse(raw);
    return {
      ...base,
      ...p,
      combat: { ...base.combat, ...(p.combat || {}), combatants: Array.isArray(p.combat?.combatants) ? p.combat.combatants : [] },
      ui: { ...base.ui, ...(p.ui || {}) },
      chars: Array.isArray(p.chars) ? p.chars : [],
      reminders: Array.isArray(p.reminders) ? p.reminders : [],
      notes: Array.isArray(p.notes) ? p.notes : [],
      rolls: Array.isArray(p.rolls) ? p.rolls : [],
      custom: Array.isArray(p.custom) ? p.custom : []
    };
  } catch (e) {
    console.warn("Не удалось прочитать сохранение", e);
    return base;
  }
}

let saveTimer = null;
function save(immediate = false) {
  clearTimeout(saveTimer);
  const write = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      const el = $("#saveState");
      if (el) el.textContent = "Сохранено в " + fmtTimeShort(Date.now());
    } catch (e) {
      const el = $("#saveState");
      if (el) el.textContent = "Не удалось сохранить в браузере";
    }
  };
  if (immediate) write();
  else saveTimer = setTimeout(write, 250);
}

/* ---------------- Dice engine ---------------- */
function substituteFormula(formula, stats) {
  if (!stats) return formula;
  const map = {
    STR: stats.STR, DEX: stats.DEX, INT: stats.INT, WIL: stats.WIL,
    "СИЛ": stats.STR, "ЛВК": stats.DEX, "ИНТ": stats.INT, "ВОЛ": stats.WIL,
    KEY: stats.KEY != null ? stats.KEY : Math.max(stats.STR || 0, stats.DEX || 0, stats.INT || 0, stats.WIL || 0),
    LVL: stats.LVL != null ? stats.LVL : 1, "УР": stats.LVL != null ? stats.LVL : 1
  };
  return String(formula).replace(/\b(STR|DEX|INT|WIL|KEY|LVL|СИЛ|ЛВК|ИНТ|ВОЛ|УР)\b/g, (m) => (map[m] == null ? 0 : map[m]));
}

function rollDie(faces) { return 1 + Math.floor(Math.random() * faces); }

function rollFormula(formula, opts = {}) {
  const raw = substituteFormula(formula || "1d20", opts.stats);
  const mode = opts.mode || "normal";
  const extra = Math.max(0, Number(opts.extra != null ? opts.extra : (mode === "normal" ? 0 : 1)) || 0);
  const cleaned = raw.replace(/\s+/g, "").replace(/—/g, "-");
  if (!/^[+\-]?(\d*d\d+|\d+)([+\-](\d*d\d+|\d+))*$/i.test(cleaned)) {
    return { error: "Не понял формулу. Пример: 2d6+3 или d20+5." };
  }
  const terms = cleaned.match(/[+\-]?[^+\-]+/g) || [];
  const parts = [];
  let total = 0;
  let signed = 1;
  let primary = null;
  let primaryFaces = null;
  let flatMod = 0;
  terms.forEach((term) => {
    let t = term;
    let sign = 1;
    if (t[0] === "+") t = t.slice(1);
    else if (t[0] === "-") { sign = -1; t = t.slice(1); }
    const dm = t.match(/^(\d*)d(\d+)$/i);
    if (dm) {
      let count = dm[1] ? parseInt(dm[1], 10) : 1;
      const faces = parseInt(dm[2], 10);
      if (!count || count > 100) count = 1;
      if (faces < 2 || faces > 1000) return;
      let vals;
      let kept;
      if (faces === 44 || faces === 66 || faces === 88) {
        const sides = faces / 11;
        const a = rollDie(sides), b = rollDie(sides);
        vals = [a, b];
        kept = [a, b];
        const v = a * 10 + b;
        total += sign * v;
        parts.push({ kind: "digit", faces, vals, kept, value: v, sign });
      } else {
        vals = Array.from({ length: count }, () => rollDie(faces));
        kept = vals.slice();
        if (faces === 20 && extra > 0) {
          const rolled = Array.from({ length: count + extra }, () => rollDie(faces));
          vals = rolled;
          const sorted = rolled.slice().sort((x, y) => (mode === "adv" ? y - x : x - y));
          kept = sorted.slice(0, count);
        }
        const sum = kept.reduce((s, v) => s + v, 0);
        total += sign * sum;
        parts.push({ kind: "dice", faces, vals, kept, value: sum, sign });
        if (primary === null) { primary = kept[0]; primaryFaces = faces; }
      }
      return;
    }
    const flat = parseInt(t, 10);
    if (!isNaN(flat)) {
      flatMod += sign * flat;
      total += sign * flat;
      parts.push({ kind: "mod", value: sign * flat });
    }
  });

  let crit = false, miss = false;
  if (opts.attack && primaryFaces && primary != null) {
    crit = primary === primaryFaces;
    miss = primary === 1;
    if (crit) {
      const bonus = rollDie(primaryFaces);
      parts.push({ kind: "crit", faces: primaryFaces, vals: [bonus], kept: [bonus], value: bonus, sign: 1 });
      total += bonus;
    }
  }

  const detail = describeRoll(parts, raw);
  return { total, parts, detail, crit, miss, formula: raw, primary, primaryFaces };
}

function describeRoll(parts, formula) {
  const chunks = [];
  parts.forEach((p, i) => {
    if (p.kind === "mod") {
      chunks.push((p.value >= 0 ? "+" : "−") + Math.abs(p.value));
    } else if (p.kind === "dice" || p.kind === "digit") {
      const sign = i === 0 || p.sign > 0 ? "" : "−";
      if (p.kind === "digit") {
        chunks.push(sign + "[" + p.vals[0] + "|" + p.vals[1] + "]→" + p.value);
      } else {
        const dropped = p.vals.filter((v, idx) => {
          const used = p.kept.slice();
          const j = used.indexOf(v);
          if (j >= 0) { used.splice(j, 1); return false; }
          return true;
        });
        let inner = p.kept.join(" + ");
        if (dropped.length) inner = p.kept.map((v) => "[" + v + "]").join(" + ") + " (отброшено " + dropped.join(", ") + ")";
        chunks.push(sign + inner);
      }
    } else if (p.kind === "crit") {
      chunks.push("крит +[" + p.value + "]");
    }
  });
  return formula + " = " + (chunks.join(" ") || "0");
}

function pushRoll(label, res, meta = {}) {
  if (res.error) { toast(res.error, "warn"); return; }
  state.rolls.unshift({ id: uid(), label, total: res.total, detail: res.detail, crit: res.crit, miss: res.miss, ts: Date.now(), ...meta });
  state.rolls = state.rolls.slice(0, 60);
  save();
}

/* ---------------- UI primitives ---------------- */
function toast(text, kind = "info") {
  const host = $("#toasts");
  if (!host) return;
  const node = document.createElement("div");
  node.className = "toast";
  const icon = kind === "warn" ? "i-bolt" : "i-check";
  node.innerHTML = `<svg class="ico" aria-hidden="true"><use href="#${icon}"/></svg><div>${text}</div>`;
  host.appendChild(node);
  setTimeout(() => { node.style.opacity = "0"; node.style.transition = "opacity .25s"; }, 3600);
  setTimeout(() => node.remove(), 4000);
}

function openModal({ title, body, footer, wide = false, onMount }) {
  const root = $("#modalRoot");
  root.hidden = false;
  root.innerHTML = `<div class="modal-scrim" data-close-modal></div>
    <section class="modal${wide ? " wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" type="button" aria-label="Закрыть" data-close-modal><svg class="ico"><use href="#i-close"/></svg></button></header>
      <div class="modal-body">${body || ""}</div>
      ${footer ? `<footer class="modal-foot">${footer}</footer>` : ""}
    </section>`;
  document.body.style.overflow = "hidden";
  ensureLabels(root);
  if (onMount) onMount(root);
  const first = root.querySelector("input, select, textarea, button.btn");
  if (first) setTimeout(() => first.focus(), 40);
}

function closeModal() {
  const root = $("#modalRoot");
  if (!root) return;
  root.hidden = true;
  root.innerHTML = "";
  document.body.style.overflow = "";
}

function openDrawer(html, title = "") {
  const d = $("#drawer");
  $("#drawerBody").innerHTML = (title ? `<h2 id="drawerTitle" class="serif" style="font-size:24px;margin:0 0 14px">${esc(title)}</h2>` : "") + html;
  d.hidden = false;
  document.body.style.overflow = "hidden";
  ensureLabels(d);
  const panel = d.querySelector(".drawer-panel");
  if (panel) panel.scrollTop = 0;
}

function closeDrawer() {
  const d = $("#drawer");
  if (!d) return;
  d.hidden = true;
  $("#drawerBody").innerHTML = "";
  if ($("#modalRoot").hidden) document.body.style.overflow = "";
}

const ACTIONS = (window.ACTIONS = window.ACTIONS || {});
function reg(name, fn) { ACTIONS[name] = fn; }

/* ---------------- Shell & routing ---------------- */
const VIEWS = {};
function registerView(name, fn) { VIEWS[name] = fn; }
const BINDERS = {};
function onBind(tab, fn) { BINDERS[tab] = fn; }
function bindView(tab) { if (BINDERS[tab]) BINDERS[tab](); }

function go(tab) {
  state.ui.tab = tab;
  save();
  $$("#tabs .tab").forEach((b) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-current", on ? "page" : "false");
  });
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}


function ensureLabels(root) {
  const scope = root || document;
  scope.querySelectorAll("input, select, textarea").forEach((el) => {
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return;
    if (el.id && scope.querySelector(`label[for="${el.id}"]`)) return;
    if (el.closest("label") || el.title) return;
    const hint = el.getAttribute("placeholder") || el.dataset.ui || el.type || "Поле ввода";
    el.setAttribute("aria-label", String(hint));
  });
}

function syncTabs() {
  $$("#tabs .tab").forEach((b) => {
    const on = b.dataset.tab === (state.ui.tab || "screen");
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-current", on ? "page" : "false");
  });
}

function render() {
  const view = $("#view");
  if (!view) return;
  const tab = state.ui.tab || "screen";
  syncTabs();
  const fn = VIEWS[tab] || VIEWS.screen;
  view.innerHTML = fn ? fn() : "";
  if (typeof bindView === "function") bindView(tab);
  ensureLabels();
  updateBadges();
}

function updateBadges() {
  const rem = state.reminders.filter((r) => !r.done && isReminderDue(r)).length;
  const remBadge = $("#remBadge");
  if (remBadge) { remBadge.hidden = !rem; remBadge.textContent = rem; }
  const badge = $("#combatBadge");
  if (badge) {
    const n = state.combat.active ? state.combat.combatants.filter((c) => c.hp > 0).length : 0;
    badge.hidden = !n;
    badge.textContent = n;
  }
}

/* ---------------- Derived character helpers ---------------- */
function charById(id) { return state.chars.find((c) => c.id === id); }
function classByName(name) { return DATA.classes.find((c) => c.name === name); }

function armorOf(ch) {
  const f = (ch.armorFormula || "").trim();
  if (!f) return Number(ch.armorValue) || 0;
  const dex = Number(ch.dex) || 0;
  const m = f.match(/^(\d+)\s*(?:\+\s*(?:ЛВК|DEX)(?:\s*\(макс\.?\s*(\d+)\))?)?/i);
  if (!m) return Number(ch.armorValue) || 0;
  let base = parseInt(m[1], 10) || 0;
  if (m[2]) base += Math.min(dex, parseInt(m[2], 10));
  else if (/ЛВК|DEX/i.test(f)) base += dex;
  return base;
}

function hitDieMax(ch) {
  const cls = classByName(ch.class);
  const die = parseInt(String(cls?.hitDie || "d8").replace("d", ""), 10) || 8;
  return die;
}

function suggestedHp(clsName, level) {
  const cls = classByName(clsName);
  if (!cls) return 10;
  const die = parseInt(String(cls.hitDie || "d8").replace("d", ""), 10) || 8;
  return cls.hp + (Math.max(1, level) - 1) * (Math.floor(die / 2) + 1);
}

function charSummary(ch) {
  const cls = classByName(ch.class);
  return [ch.ancestry, ch.class, ch.level ? "ур. " + ch.level : "", cls?.hitDie].filter(Boolean).join(" · ");
}

function skillTotal(ch, skill) {
  const pts = Number(ch.skills?.[skill.name] || 0);
  return (Number(ch[skill.stat.toLowerCase()]) || 0) + pts;
}

function charStats(ch) {
  return {
    STR: Number(ch.str) || 0, DEX: Number(ch.dex) || 0, INT: Number(ch.int) || 0, WIL: Number(ch.wil) || 0,
    LVL: Number(ch.level) || 1, KEY: Math.max(Number(ch.str) || 0, Number(ch.dex) || 0, Number(ch.int) || 0, Number(ch.wil) || 0)
  };
}

/* ---------------- Combat helpers ---------------- */
function sortCombatants() {
  state.combat.combatants.sort((a, b) => (b.init || 0) - (a.init || 0) || a.name.localeCompare(b.name, "ru"));
}
function currentCombatant() {
  if (!state.combat.active) return null;
  return state.combat.combatants[state.combat.turn] || null;
}
function combatAlive() { return state.combat.combatants.filter((c) => c.hp > 0); }

/* ---------------- Reminder helpers ---------------- */
function isReminderDue(r) {
  if (r.mode === "time" && r.due) return Number(r.due) <= Date.now();
  if (r.mode === "round" && state.combat.active && r.every) return state.combat.round % Number(r.every) === 0;
  return false;
}
function reminderLabel(r) {
  if (r.mode === "time" && r.due) {
    const diff = Number(r.due) - Date.now();
    if (r.done) return "выполнено";
    if (diff <= 0) return "просрочено";
    const m = Math.floor(diff / 60000);
    if (m < 60) return "через " + m + " мин";
    const h = Math.floor(m / 60);
    if (h < 24) return "через " + h + " ч " + (m % 60) + " мин";
    return "через " + Math.floor(h / 24) + " дн";
  }
  if (r.mode === "round") return "каждые " + r.every + " " + plural(r.every, "раунд", "раунда", "раундов");
  return "вручную";
}

/* ---------------- Reference index ---------------- */
let REF_INDEX = null;
const TYPE_LABEL = {
  rule: "Правило", condition: "Состояние", weapon: "Оружие", armor: "Броня", gear: "Снаряжение",
  magic: "Магия", monster: "Существо", spell: "Заклинание", class: "Класс", ancestry: "Предок", background: "Предыстория", custom: "Своё"
};
function refIndex() {
  if (REF_INDEX) return REF_INDEX;
  const idx = [];
  DATA.rules.forEach((r) => idx.push({ type: "rule", name: r.name, sub: r.cat, text: r.text, raw: r }));
  DATA.conditions.forEach((c) => idx.push({ type: "condition", name: c.name, sub: "", text: c.desc, raw: c }));
  DATA.weapons.forEach((w) => idx.push({ type: "weapon", name: w.name, sub: w.cat + " · " + w.dice + "+" + w.stat + " " + w.type, text: (w.props || []).join(", "), raw: w }));
  DATA.armor.forEach((a) => idx.push({ type: "armor", name: a.name, sub: a.cat, text: a.armor, raw: a }));
  DATA.gear.forEach((g) => idx.push({ type: "gear", name: g.name, sub: g.cost, text: g.desc, raw: g }));
  DATA.magic.forEach((m) => idx.push({ type: "magic", name: m.name, sub: m.rarity, text: m.desc, raw: m }));
  DATA.monsters.forEach((m) => idx.push({ type: "monster", name: m.name, sub: "ур. " + m.lvl + (m.hp ? " · " + m.hp + " хитов" : " · миньон"), text: (m.actions || []).map((a) => a.n).join(", "), raw: m }));
  DATA.spells.forEach((s) => idx.push({ type: "spell", name: s.name, sub: s.school + " · тир " + s.tier, text: s.text, raw: s }));
  DATA.classes.forEach((c) => idx.push({ type: "class", name: c.name, sub: "Хиты " + c.hp + " · " + c.hitDie, text: c.role, raw: c }));
  DATA.ancestries.forEach((a) => idx.push({ type: "ancestry", name: a.name, sub: a.size, text: a.trait, raw: a }));
  (DATA.backgrounds || []).forEach((b) => idx.push({ type: "background", name: b.name, sub: "Предыстория", text: b.text, raw: b }));
  state.custom.forEach((c) => idx.push({ type: "custom", id: c.id, name: c.name, sub: c.sub || "своя запись", text: c.text || "", raw: c }));
  REF_INDEX = idx;
  return idx;
}
function rebuildRefIndex() { REF_INDEX = null; }

function searchRefs(q, type = "all") {
  const query = (q || "").trim().toLowerCase();
  let list = refIndex();
  if (type !== "all") list = list.filter((e) => e.type === type);
  if (!query) return list.slice().sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const words = query.split(/\s+/).filter(Boolean);
  const scored = [];
  list.forEach((e) => {
    const hay = norm(e.name + " " + (e.sub || "") + " " + (e.text || ""));
    let score = 0;
    if (norm(e.name).startsWith(query)) score += 120;
    else if (norm(e.name).includes(query)) score += 80;
    words.forEach((w) => { if (hay.includes(w)) score += 18; });
    if (score) scored.push([score, e]);
  });
  return scored.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name, "ru")).map((x) => x[1]);
}
function norm(s) { return String(s || "").toLowerCase().replace(/ё/g, "е"); }
