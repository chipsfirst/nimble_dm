/* ================= Персонажи ================= */
function charCard(ch) {
  const max = Number(ch.maxHp) || 0, hp = Number(ch.hp) || 0;
  const cls = classByName(ch.class);
  return `<article class="card char-card">
    <div class="top">
      <div class="avatar">${esc(initials(ch.name))}</div>
      <div class="grow">
        <h3>${esc(ch.name)}</h3>
        <div class="meta">${esc(charSummary(ch))}</div>
      </div>
      <button class="icon-btn sm" type="button" data-act="open-char" data-id="${ch.id}" title="Открыть лист"><svg class="ico"><use href="#i-chevron"/></svg></button>
    </div>
    <div class="res">
      <span><b>${hp}</b> / ${max} хит</span>
      <span><b>${ch.wounds || 0}</b> / ${ch.maxWounds || 6} ран</span>
      <span><b>${armorOf(ch)}</b> броня</span>
      ${Number(ch.maxMana) ? `<span><b>${ch.mana || 0}</b> / ${ch.maxMana} мана</span>` : ""}
    </div>
    <div class="hp-bar" style="margin-top:8px"><div class="hp-fill ${hpClass(hp, max)}" style="width:${max ? Math.max(0, Math.round((hp / max) * 100)) : 0}%"></div></div>
    <div class="chips" style="margin-top:9px">
      ${(ch.conditions || []).slice(0, 4).map((c) => `<span class="tag red">${esc(c)}</span>`).join("") || `<span class="tag">без состояний</span>`}
    </div>
    ${ch.notes ? `<p class="char-note">${esc(ch.notes)}</p>` : ""}
    <div class="char-actions">
      <button class="btn btn-sm" type="button" data-act="open-char" data-id="${ch.id}"><svg class="ico"><use href="#i-user"/></svg>Лист</button>
      <button class="btn btn-sm" type="button" data-act="roll-init-char" data-id="${ch.id}"><svg class="ico"><use href="#i-d20"/></svg>Инициатива</button>
      <button class="btn btn-sm" type="button" data-act="char-to-combat" data-id="${ch.id}">В бой</button>
    </div>
  </article>`;
}

registerView("chars", () => `<div class="page-head">
  <div><p class="eyebrow">Герои</p><h1 class="page-title">Персонажи</h1>
    <p class="page-sub">Лист считает броски, броню, раны и ману. Всё можно поправить вручную — книга важнее калькулятора.</p></div>
  <div class="head-actions"><button class="btn btn-primary" type="button" data-act="new-char"><svg class="ico"><use href="#i-plus"/></svg>Создать персонажа</button></div>
</div>
${state.chars.length ? `<div class="char-grid">${state.chars.map(charCard).join("")}</div>` : `<div class="card"><div class="empty" style="padding:48px 20px">
  <svg class="ico" style="width:34px;height:34px"><use href="#i-user"/></svg>
  <p>Пока никого. Соберите героя за три шага: предок и класс, атрибуты и навыки, снаряжение.</p>
  <button class="btn btn-primary" type="button" data-act="new-char">Создать первого</button>
</div></div>`}`);

/* ---------------- Wizard ---------------- */
const ARRAYS = {
  standard: { name: "Стандартный", values: [2, 2, 0, -1] },
  balanced: { name: "Сбалансированный", values: [2, 1, 1, 0] },
  own: { name: "Свои значения", values: [0, 0, 0, 0] }
};
let wiz = null;

function newWizard() {
  return {
    step: 1, name: "", ancestry: "Человек", background: "", cls: "Охотник", level: 1,
    attrs: { STR: 2, DEX: 1, INT: 0, WIL: -2 },
    array: "balanced", skills: {}, armorKey: "", weapons: [], mana: 0, notes: ""
  };
}

function wizardOpen() {
  wiz = newWizard();
  openModal({ title: "Новый персонаж", wide: true, body: `<div id="wizRoot"></div>`, onMount: drawWizard });
}
reg("new-char", () => wizardOpen());

function wizPointsLeft() {
  const total = 4 + Math.max(0, (Number(wiz.level) || 1) - 1);
  const used = Object.values(wiz.skills).reduce((s, v) => s + Number(v || 0), 0);
  return total - used;
}

function drawWizard() {
  const root = $("#wizRoot");
  if (!root) return;
  const step = wiz.step;
  const cls = classByName(wiz.cls);
  const steps = `<div class="steps">
    <div class="step ${step === 1 ? "on" : "done"}">1. Кто вы</div>
    <div class="step ${step === 2 ? "on" : step > 2 ? "done" : ""}">2. Атрибуты</div>
    <div class="step ${step === 3 ? "on" : ""}">3. Снаряжение</div>
  </div>`;
  let body = "";
  if (step === 1) {
    body = `<div class="stack">
      <div class="field-row">
        <div class="field" style="flex:2 1 240px"><label for="wizName">Имя героя</label><input id="wizName" type="text" placeholder="Например, Ирия Совиный Клык" value="${esc(wiz.name)}"></div>
        <div class="field"><label for="wizLevel">Уровень</label><input id="wizLevel" type="number" min="1" max="20" value="${wiz.level}"></div>
      </div>
      <div class="field"><label for="wizAncestry">Предок</label>
        <select id="wizAncestry">${DATA.ancestries.map((a) => `<option value="${esc(a.name)}"${a.name === wiz.ancestry ? " selected" : ""}>${esc(a.name)} · ${esc(a.size)}</option>`).join("")}</select>
        <p class="hint">${esc((DATA.ancestries.find((a) => a.name === wiz.ancestry) || {}).trait || "")}</p>
      </div>
      <div class="field"><label for="wizBackground">Предыстория</label>
        <select id="wizBackground"><option value="">Без предыстории</option>${(DATA.backgrounds || []).map((b) => `<option value="${esc(b.name)}"${b.name === wiz.background ? " selected" : ""}>${esc(b.name)}</option>`).join("")}</select>
        <p class="hint">${esc(wiz.background ? ((DATA.backgrounds || []).find((b) => b.name === wiz.background) || {}).text || "" : "Что герой оставил позади — и почему он в пути.")}</p>
      </div>
      <div class="field"><span class="field-label">Класс</span>
        <div class="pick-grid">${DATA.classes.map((c) => `<button type="button" class="pick ${c.name === wiz.cls ? "is-active" : ""}" data-act="wiz-class" data-name="${esc(c.name)}">
          <b>${esc(c.name)}</b><span>${esc(c.role)}</span></button>`).join("")}</div>
        <p class="hint">${esc(cls.role)} · ${cls.hp} хитов на 1 уровне · кость хитов ${cls.hitDie}</p>
      </div>
    </div>`;
  } else if (step === 2) {
    body = `<div class="stack">
      <div class="field"><span class="field-label">Массив характеристик</span>
        <div class="chips">${Object.entries(ARRAYS).map(([k, a]) => `<button class="chip ${wiz.array === k ? "is-active" : ""}" type="button" data-act="wiz-array" data-key="${k}">${a.name} <span class="n">${a.values.map((v) => (v >= 0 ? "+" + v : v)).join(" ")}</span></button>`).join("")}</div>
        <p class="hint">KEY класса: ${cls.key.map((k) => STAT_SHORT[k]).join(" и ")}. Спасброски: ${savesLine(cls)}.</p>
      </div>
      <div class="attr-assign">
        ${STAT_IDS.map((id) => `<div class="attr-box"><div class="k">${STAT_SHORT[id]}</div>
          <select data-wiz-attr="${id}">${[-2, -1, 0, 1, 2, 3, 4].map((v) => `<option value="${v}"${Number(wiz.attrs[id]) === v ? " selected" : ""}>${v >= 0 ? "+" + v : v}</option>`).join("")}</select>
          <div class="small dim" style="margin-top:4px">${esc(STAT_NAME[id])}</div></div>`).join("")}
      </div>
      <div>
        <div class="sheet-h">Навыки <span class="line"></span><span class="small dim">осталось ${wizPointsLeft()}</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px">
          ${DATA.skills.map((s) => `<div class="skill-line">
            <span class="nm">${esc(s.name)}</span><span class="st">${STAT_SHORT[s.stat]}</span>
            <span class="pts">${wiz.skills[s.name] ? "+" + wiz.skills[s.name] : "—"}</span>
            <button type="button" data-act="wiz-skill" data-name="${esc(s.name)}" data-delta="-1" aria-label="Убрать пункт">−</button>
            <button type="button" data-act="wiz-skill" data-name="${esc(s.name)}" data-delta="1" aria-label="Добавить пункт">+</button>
          </div>`).join("")}
        </div>
        <p class="hint">На 1 уровне — 4 пункта навыков, по +1 за уровень. Каждый пункт даёт +1 к проверкам навыка.</p>
      </div>
      <div class="roll-result" style="margin-top:0">
        <div class="row" style="justify-content:space-between"><span class="muted small">Хиты на этом уровне</span><b class="mono" style="font-size:20px">${suggestedHp(wiz.cls, wiz.level)}</b></div>
        <p class="hint mb-0">Расчёт: ${cls.hp} на 1 уровне + среднее кости роста. Можно изменить на следующем шаге.</p>
      </div>
    </div>`;
  } else {
    const hp = wiz.hp != null ? wiz.hp : suggestedHp(wiz.cls, wiz.level);
    wiz.hp = hp;
    const armorOptions = armorOptionsFor(cls);
    body = `<div class="stack">
      <div class="field-row">
        <div class="field"><label for="wizHp">Максимум хитов</label><input id="wizHp" type="number" min="1" value="${hp}"></div>
        <div class="field"><label for="wizMana">Максимум маны</label><input id="wizMana" type="number" min="0" value="${Number(wiz.mana) || 0}"><p class="hint">Колдовские классы — по книге.</p></div>
        <div class="field"><label for="wizArmor">Броня</label>
          <select id="wizArmor">${armorOptions.map((o) => `<option value="${esc(o.key)}"${o.key === wiz.armorKey ? " selected" : ""}>${esc(o.label)}</option>`).join("")}</select>
        </div>
      </div>
      <div class="field"><span class="field-label">Оружие</span>
        <div class="pick-grid">
          ${defaultWeaponChoices(cls).map((w) => `<button type="button" class="pick ${wiz.weapons.includes(w.name) ? "is-active" : ""}" data-act="wiz-weapon" data-name="${esc(w.name)}">
            <b>${esc(w.name)}</b><span>${esc(w.dice)}+${w.stat} ${esc(w.type)}</span></button>`).join("")}
        </div>
        <p class="hint">Стартовый набор класса: ${esc((cls.gear || []).join(", "))}</p>
      </div>
      <div class="field"><label for="wizNotes">Заметки</label><textarea id="wizNotes" rows="3" placeholder="Клятва, долг, странность, тайна…">${esc(wiz.notes)}</textarea></div>
      <div class="roll-result" style="margin-top:0">
        <div class="kv" style="display:grid;grid-template-columns:120px 1fr;gap:4px 12px;font-size:13px">
          <span class="dim">Имя</span><span>${esc(wiz.name || "—")}</span>
          <span class="dim">Кто</span><span>${esc(wiz.ancestry)} · ${esc(wiz.cls)} · ур. ${wiz.level}${wiz.background ? " · " + esc(wiz.background) : ""}</span>
          <span class="dim">Атрибуты</span><span class="mono">${STAT_IDS.map((k) => STAT_SHORT[k] + " " + (wiz.attrs[k] >= 0 ? "+" : "") + wiz.attrs[k]).join(" · ")}</span>
          <span class="dim">Хиты / броня</span><span>${hp} хитов · ${armorLabelByKey(wiz.armorKey) || "без брони"}</span>
          <span class="dim">Навыки</span><span>${Object.entries(wiz.skills).filter(([, v]) => v).map(([k, v]) => k + " +" + v).join(", ") || "—"}</span>
        </div>
      </div>
    </div>`;
  }

  const foot = `<button class="btn btn-ghost" type="button" data-act="wiz-cancel">Отмена</button><span class="spacer"></span>
    ${step > 1 ? `<button class="btn" type="button" data-act="wiz-back">Назад</button>` : ""}
    ${step < 3 ? `<button class="btn btn-primary" type="button" data-act="wiz-next">Дальше</button>` : `<button class="btn btn-primary" type="button" data-act="wiz-finish">Создать героя</button>`}`;
  root.innerHTML = steps + body;
  const footHost = $(".modal-foot");
  if (footHost) footHost.innerHTML = foot;
  else {
    const modal = $(".modal");
    if (modal) modal.insertAdjacentHTML("beforeend", `<footer class="modal-foot">${foot}</footer>`);
  }
  $$("[data-wiz-attr]").forEach((sel) => sel.addEventListener("change", () => { wiz.attrs[sel.dataset.wizAttr] = Number(sel.value); }));
}

function savesLine(cls) {
  const label = { 1: "преим.", 0: "норма", "-1": "помеха" };
  return STAT_IDS.map((k) => STAT_SHORT[k] + " " + (label[cls.saves[k]] || "норма")).join(", ");
}
function armorOptionsFor(cls) {
  const allowed = (cls.armor || []).filter((a) => a !== "—");
  const opts = [{ key: "", label: "Без брони" }];
  DATA.armor.forEach((a) => {
    if (allowed.length && allowed.includes(a.cat)) opts.push({ key: a.name, label: `${a.name} · ${a.armor} · ${a.cost}` });
  });
  if (!allowed.length) {
    DATA.armor.filter((a) => a.cat === "Ткань" || a.cat === "Кожа").forEach((a) => opts.push({ key: a.name, label: `${a.name} · ${a.armor} · ${a.cost}` }));
  }
  opts.push({ key: "custom", label: "Вручную (задам число)" });
  return opts;
}
function armorLabelByKey(key) {
  if (!key) return "";
  if (key === "custom") return "вручную";
  const a = DATA.armor.find((x) => x.name === key);
  return a ? a.armor : "";
}
function defaultWeaponChoices(cls) {
  const types = cls.weapons || "";
  const names = [];
  const has = (n) => DATA.weapons.find((w) => w.name.toLowerCase().includes(n));
  if (/СИЛ/i.test(types)) { ["Боевой топор", "Длинный меч", "Копьё", "Дубина", "Дротики"].forEach((n) => { const w = DATA.weapons.find((x) => x.name.startsWith(n)); if (w) names.push(w); }); }
  if (/ЛВК/i.test(types)) { ["Кинжал", "Короткий меч", "Рапира", "Короткий лук", "Праща"].forEach((n) => { const w = DATA.weapons.find((x) => x.name.startsWith(n)); if (w) names.push(w); }); }
  if (/клинк|посох|жезл/i.test(types)) { ["Кинжал", "Посох", "Короткий меч"].forEach((n) => { const w = DATA.weapons.find((x) => x.name.startsWith(n)); if (w) names.push(w); }); }
  if (/ближн/i.test(types)) { ["Посох", "Кинжал"].forEach((n) => { const w = DATA.weapons.find((x) => x.name.startsWith(n)); if (w) names.push(w); }); }
  if (!names.length) DATA.weapons.slice(0, 6).forEach((w) => names.push(w));
  return names.filter((w, i, arr) => arr.findIndex((x) => x.name === w.name) === i).slice(0, 8);
}

reg("wiz-class", (btn) => { wiz.cls = btn.dataset.name; wiz.hp = null; drawWizard(); });
reg("wiz-array", (btn) => {
  wiz.array = btn.dataset.key;
  const vals = ARRAYS[wiz.array].values;
  STAT_IDS.forEach((id, i) => { wiz.attrs[id] = vals[i] != null ? vals[i] : 0; });
  drawWizard();
});
reg("wiz-skill", (btn) => {
  const name = btn.dataset.name, delta = Number(btn.dataset.delta);
  const cur = Number(wiz.skills[name] || 0);
  const next = cur + delta;
  if (next < 0) return;
  if (delta > 0 && wizPointsLeft() <= 0) { toast("Пункты навыков закончились", "warn"); return; }
  if (next > 3) return;
  wiz.skills[name] = next;
  if (!next) delete wiz.skills[name];
  drawWizard();
});
reg("wiz-weapon", (btn) => {
  const name = btn.dataset.name;
  const i = wiz.weapons.indexOf(name);
  if (i >= 0) wiz.weapons.splice(i, 1); else wiz.weapons.push(name);
  drawWizard();
});
reg("wiz-cancel", () => { closeModal(); wiz = null; });
reg("wiz-back", () => { collectWizard(); wiz.step = Math.max(1, wiz.step - 1); drawWizard(); });
reg("wiz-next", () => {
  collectWizard();
  if (wiz.step === 1 && !wiz.name.trim()) { wiz.name = "Безымянный герой"; }
  wiz.step = Math.min(3, wiz.step + 1);
  drawWizard();
});

function collectWizard() {
  if (!wiz) return;
  const name = $("#wizName"); if (name) wiz.name = name.value.trim();
  const lvl = $("#wizLevel"); if (lvl) wiz.level = clamp(Number(lvl.value) || 1, 1, 20);
  const anc = $("#wizAncestry"); if (anc) wiz.ancestry = anc.value;
  const bg = $("#wizBackground"); if (bg) wiz.background = bg.value;
  const hp = $("#wizHp"); if (hp) wiz.hp = Math.max(1, Number(hp.value) || 1);
  const mana = $("#wizMana"); if (mana) wiz.mana = Math.max(0, Number(mana.value) || 0);
  const armor = $("#wizArmor"); if (armor) wiz.armorKey = armor.value;
  const notes = $("#wizNotes"); if (notes) wiz.notes = notes.value;
}
reg("wiz-finish", () => {
  collectWizard();
  const cls = classByName(wiz.cls);
  const armor = wiz.armorKey && wiz.armorKey !== "custom" ? DATA.armor.find((a) => a.name === wiz.armorKey) : null;
  const ch = {
    id: uid(), name: wiz.name.trim() || "Безымянный герой",
    ancestry: wiz.ancestry, background: wiz.background || "", class: wiz.cls, level: clamp(Number(wiz.level) || 1, 1, 20),
    str: Number(wiz.attrs.STR) || 0, dex: Number(wiz.attrs.DEX) || 0, int: Number(wiz.attrs.INT) || 0, wil: Number(wiz.attrs.WIL) || 0,
    skills: { ...wiz.skills },
    hp: Number(wiz.hp) || suggestedHp(wiz.cls, wiz.level),
    maxHp: Number(wiz.hp) || suggestedHp(wiz.cls, wiz.level),
    wounds: 0, maxWounds: 6,
    mana: Number(wiz.mana) || 0, maxMana: Number(wiz.mana) || 0,
    armorFormula: armor ? armor.armor : "", armorLabel: armor ? armor.name : "Без брони",
    speed: 6,
    weapons: wiz.weapons.map((n) => { const w = DATA.weapons.find((x) => x.name === n); return w ? { name: w.name, dice: w.dice, stat: w.stat, type: w.type, props: w.props } : null; }).filter(Boolean),
    conditions: [], notes: wiz.notes || "",
    created: Date.now(), updated: Date.now()
  };
  state.chars.push(ch);
  state.ui.charId = ch.id;
  save();
  closeModal();
  wiz = null;
  render();
  toast("Герой создан: " + esc(ch.name));
  openCharSheet(ch.id);
});

/* ---------------- Character sheet ---------------- */
function drawSheet() {
  const ch = charById(state.ui.charId);
  const root = $("#sheetRoot");
  if (!ch || !root) { closeModal(); return; }
  const scroller = root.parentElement;
  const top = scroller ? scroller.scrollTop : 0;
  root.innerHTML = sheetHTML(ch);
  if (scroller) scroller.scrollTop = top;
}

function sheetHTML(ch) {
  const cls = classByName(ch.class);
  const max = Number(ch.maxHp) || 0, hp = clamp(Number(ch.hp) || 0, 0, max);
  const armor = armorOf(ch);
  const statBtn = (id) => `<button class="stat" type="button" data-act="sheet-check" data-stat="${id}">
      <div class="k">${STAT_SHORT[id]}</div><div class="v">${ch[id.toLowerCase()] >= 0 ? "+" : ""}${ch[id.toLowerCase()] || 0}</div><div class="roll">проверка</div></button>`;
  const saveAdv = (id) => (cls?.saves?.[id] === 1 ? "преим." : cls?.saves?.[id] === -1 ? "помеха" : "");
  const woundPips = Array.from({ length: Math.max(6, Number(ch.maxWounds) || 6) }, (_, i) => `<button class="pip wound ${i < (ch.wounds || 0) ? "on" : ""}" type="button" data-act="sheet-wound" data-n="${i + 1}" aria-label="Рана ${i + 1}"></button>`).join("");
  const manaPips = Number(ch.maxMana) ? `<div class="track" style="margin-top:6px"><span class="small dim" style="width:56px">Мана</span><div class="box">${Array.from({ length: Number(ch.maxMana) }, (_, i) => `<button class="pip mana ${i < (ch.mana || 0) ? "on" : ""}" type="button" data-act="sheet-mana" data-n="${i + 1}" aria-label="Мана ${i + 1}"></button>`).join("")}</div></div>` : "";
  return `<div class="stack">
    <div class="field-row" style="align-items:flex-end">
      <div class="field grow"><label for="sheetName">Имя</label><input id="sheetName" type="text" value="${esc(ch.name)}" data-char="name"></div>
      <div class="field" style="flex:0 1 90px"><label for="sheetLevel">Уровень</label><input id="sheetLevel" type="number" min="1" max="20" value="${ch.level || 1}" data-char="level"></div>
      <div class="field" style="flex:1 1 130px"><label for="sheetAncestry">Предок</label><select id="sheetAncestry" data-char="ancestry">${DATA.ancestries.map((a) => `<option${a.name === ch.ancestry ? " selected" : ""}>${esc(a.name)}</option>`).join("")}</select></div>
      <div class="field" style="flex:0 1 130px"><label for="sheetClass">Класс</label><select id="sheetClass" data-char="class">${DATA.classes.map((c) => `<option${c.name === ch.class ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
      <div class="field" style="flex:0 1 150px"><label for="sheetBackground">Предыстория</label>
        <select id="sheetBackground" data-char="background"><option value="">Без предыстории</option>${(DATA.backgrounds || []).map((b) => `<option${b.name === ch.background ? " selected" : ""}>${esc(b.name)}</option>`).join("")}</select>
      </div>
    </div>
    <div class="sheet-grid">
      <div>
        <div class="sheet-block">
          <div class="sheet-h">Атрибуты <span class="line"></span><span class="small dim">нажмите для броска</span></div>
          <div class="stat-grid">${STAT_IDS.map(statBtn).join("")}</div>
          <div class="row small dim" style="justify-content:space-between;margin-top:5px">
            ${STAT_IDS.map((id) => `<span>${STAT_SHORT[id]}: спас ${saveAdv(id) || "норма"}</span>`).join("")}
          </div>
        </div>

        <div class="sheet-block">
          <div class="sheet-h">Навыки <span class="line"></span><span class="small dim">пункты: ${Object.values(ch.skills || {}).reduce((s, v) => s + Number(v || 0), 0)}</span></div>
          ${DATA.skills.map((s) => `<div class="skill-line">
            <button class="nm" style="background:none;border:0;color:inherit;text-align:left;padding:0" type="button" data-act="sheet-skill" data-name="${esc(s.name)}">${esc(s.name)}</button>
            <span class="st">${STAT_SHORT[s.stat]}</span>
            <span class="pts">${skillTotal(ch, s) >= 0 ? "+" : ""}${skillTotal(ch, s)}</span>
            <button type="button" data-act="sheet-skillpt" data-name="${esc(s.name)}" data-delta="-1" aria-label="Минус пункт">−</button>
            <button type="button" data-act="sheet-skillpt" data-name="${esc(s.name)}" data-delta="1" aria-label="Плюс пункт">+</button>
          </div>`).join("")}
        </div>

        <div class="sheet-block">
          <div class="sheet-h">Оружие <span class="line"></span><button class="btn btn-sm" type="button" data-act="sheet-add-weapon">＋</button></div>
          ${(ch.weapons || []).length ? ch.weapons.map((w, i) => `<div class="weapon-line">
            <span class="nm">${esc(w.name)}</span>
            <span class="dmg">${esc(w.dice)}+${w.stat}</span>
            <button class="btn btn-sm" type="button" data-act="sheet-attack" data-i="${i}">Атака</button>
            <button class="icon-btn sm danger" type="button" data-act="sheet-del-weapon" data-i="${i}" aria-label="Удалить"><svg class="ico"><use href="#i-close"/></svg></button>
          </div>`).join("") : `<p class="hint">Добавьте оружие, чтобы бросать атаку одной кнопкой.</p>`}
        </div>

        ${cls ? `<div class="sheet-block">
          <div class="sheet-h">Способности класса <span class="line"></span><span class="small dim">${esc(cls.hitDie)} · ${cls.hp} хитов</span></div>
          ${(cls.lvl1 || []).map((a) => `<div class="action"><b>${esc(a.n)}.</b> <span class="d">${esc(a.d)}</span></div>`).join("")}
        </div>` : ""}
      </div>

      <div>
        <div class="sheet-block">
          <div class="sheet-h">Жизнь <span class="line"></span></div>
          <div class="row" style="justify-content:space-between;align-items:flex-end">
            <div><div class="hp-big">${hp}<small> / ${max}</small></div><div class="small dim">хиты</div></div>
            <div class="row">
              <button class="btn btn-sm" type="button" data-act="sheet-hp" data-delta="-5">−5</button>
              <button class="btn btn-sm" type="button" data-act="sheet-hp" data-delta="-1">−1</button>
              <button class="btn btn-sm" type="button" data-act="sheet-hp" data-delta="1">+1</button>
              <button class="btn btn-sm" type="button" data-act="sheet-hp" data-delta="5">+5</button>
            </div>
          </div>
          <div class="hp-bar" style="height:8px;margin-top:8px"><div class="hp-fill ${hpClass(hp, max)}" style="width:${max ? Math.round((hp / max) * 100) : 0}%"></div></div>
          <div class="field-row" style="margin-top:10px">
            <div class="field"><label for="sheetHp">Текущие хиты</label><input id="sheetHp" type="number" min="0" max="${max}" value="${hp}" data-char="hp"></div>
            <div class="field"><label for="sheetMaxHp">Максимум</label><input id="sheetMaxHp" type="number" min="1" value="${max}" data-char="maxHp"></div>
            <div class="field"><label for="sheetArmor">Броня</label><input id="sheetArmor" type="number" min="0" value="${armor}" data-char="armorValue"><p class="hint">${esc(ch.armorLabel || "")}${ch.armorFormula ? " · " + esc(ch.armorFormula) : ""}</p></div>
          </div>
        </div>

        <div class="sheet-block">
          <div class="sheet-h">Раны <span class="line"></span><span class="small dim">6 — смерть</span></div>
          <div class="track"><div class="box">${woundPips}</div><span class="mono small">${ch.wounds || 0}</span></div>
          ${manaPips}
          <div class="row" style="margin-top:10px">
            <button class="btn btn-sm" type="button" data-act="sheet-rest" title="Безопасный отдых: полное восстановление, −1 рана">Безопасный отдых</button>
            <span class="small dim">${esc(DATA.restNote)}</span>
          </div>
        </div>

        <div class="sheet-block">
          <div class="sheet-h">Состояния <span class="line"></span></div>
          <div class="chips">
            ${(ch.conditions || []).map((c) => `<button class="chip" type="button" data-act="sheet-cond-remove" data-name="${esc(c)}">${esc(c)} ×</button>`).join("") || `<span class="small dim">нет</span>`}
          </div>
          <select class="mt-8" data-act="sheet-cond-add"><option value="">Добавить состояние…</option>${DATA.conditions.map((c) => `<option>${esc(c.name)}</option>`).join("")}</select>
        </div>

        <div class="sheet-block">
          <div class="sheet-h">Заметки <span class="line"></span></div>
          <textarea id="sheetNotes" rows="4" data-char="notes" aria-label="Заметки о персонаже" placeholder="Мотивы, долги, секреты…">${esc(ch.notes || "")}</textarea>
        </div>

        <div id="sheetRollResult" class="roll-result" hidden></div>

        <div class="row" style="margin-top:12px">
          <button class="btn btn-sm" type="button" data-act="sheet-levelup">＋ Уровень</button>
          <button class="btn btn-sm" type="button" data-act="char-to-combat" data-id="${ch.id}">В бой</button>
          <button class="btn btn-sm btn-danger" type="button" data-act="char-delete" data-id="${ch.id}" style="margin-left:auto">Удалить</button>
        </div>
      </div>
    </div>
  </div>`;
}

function openCharSheet(id) {
  state.ui.charId = id;
  save();
  openModal({
    title: "Лист персонажа", wide: true,
    body: `<div id="sheetRoot"></div>`,
    onMount: () => {
      drawSheet();
      const root = $("#sheetRoot");
      root.addEventListener("input", (e) => {
        const t = e.target.closest("[data-char]");
        if (!t) return;
        const ch = charById(state.ui.charId);
        if (!ch) return;
        const key = t.dataset.char;
        let v = t.type === "number" ? Number(t.value) : t.value;
        if (key === "hp") v = clamp(Number(v) || 0, 0, Number(ch.maxHp) || 0);
        ch[key] = v;
        ch.updated = Date.now();
        save();
        if (key === "maxHp" || key === "level") {
          if (key === "level") ch.level = clamp(Number(ch.level) || 1, 1, 20);
          drawSheet();
        }
      });
      root.addEventListener("change", (e) => {
        const t = e.target.closest("[data-act='sheet-cond-add']");
        if (!t) return;
        const ch = charById(state.ui.charId);
        if (!ch || !t.value) return;
        ch.conditions = ch.conditions || [];
        if (!ch.conditions.includes(t.value)) ch.conditions.push(t.value);
        save(); drawSheet(); render();
      });
    }
  });
}
reg("open-char", (btn) => openCharSheet(btn.dataset.id));

reg("sheet-check", (btn) => {
  const ch = charById(state.ui.charId); if (!ch) return;
  const id = btn.dataset.stat;
  const mod = Number(ch[id.toLowerCase()]) || 0;
  const res = rollFormula("1d20" + (mod >= 0 ? "+" + mod : mod));
  pushRoll(ch.name + " · " + STAT_NAME[id], res);
  showSheetRoll(res, `${STAT_NAME[id]} ${mod >= 0 ? "+" + mod : mod}`);
});
reg("sheet-skill", (btn) => {
  const ch = charById(state.ui.charId); if (!ch) return;
  const s = DATA.skills.find((x) => x.name === btn.dataset.name);
  if (!s) return;
  const total = skillTotal(ch, s);
  const res = rollFormula("1d20" + (total >= 0 ? "+" + total : total));
  pushRoll(ch.name + " · " + s.name, res);
  showSheetRoll(res, `${s.name} ${total >= 0 ? "+" + total : total}`);
});
reg("sheet-skillpt", (btn) => {
  const ch = charById(state.ui.charId); if (!ch) return;
  const name = btn.dataset.name, d = Number(btn.dataset.delta);
  ch.skills = ch.skills || {};
  const cur = Number(ch.skills[name] || 0);
  const next = cur + d;
  if (next < 0 || next > 6) return;
  if (next) ch.skills[name] = next; else delete ch.skills[name];
  save(); drawSheet();
});
reg("sheet-hp", (btn) => {
  const ch = charById(state.ui.charId); if (!ch) return;
  ch.hp = clamp((Number(ch.hp) || 0) + Number(btn.dataset.delta), 0, Number(ch.maxHp) || 0);
  if (ch.hp === 0 && !(ch.conditions || []).includes("При смерти")) { ch.conditions = [...(ch.conditions || []), "При смерти"]; ch.wounds = Math.min((ch.wounds || 0) + 1, ch.maxWounds || 6); }
  save(); drawSheet(); render();
});
reg("sheet-wound", (btn) => {
  const ch = charById(state.ui.charId); if (!ch) return;
  const n = Number(btn.dataset.n);
  ch.wounds = ch.wounds === n ? n - 1 : n;
  save(); drawSheet();
});
reg("sheet-mana", (btn) => {
  const ch = charById(state.ui.charId); if (!ch) return;
  const n = Number(btn.dataset.n);
  ch.mana = ch.mana === n ? n - 1 : n;
  save(); drawSheet();
});
reg("sheet-cond-remove", (btn) => {
  const ch = charById(state.ui.charId); if (!ch) return;
  ch.conditions = (ch.conditions || []).filter((c) => c !== btn.dataset.name);
  save(); drawSheet(); render();
});
reg("sheet-rest", () => {
  const ch = charById(state.ui.charId); if (!ch) return;
  ch.hp = Number(ch.maxHp) || 0;
  ch.mana = Number(ch.maxMana) || 0;
  ch.wounds = Math.max(0, (Number(ch.wounds) || 0) - 1);
  ch.conditions = (ch.conditions || []).filter((c) => c !== "При смерти");
  save(); drawSheet(); render();
  toast("Безопасный отдых: хиты и мана восстановлены, −1 рана");
});
reg("sheet-levelup", () => {
  const ch = charById(state.ui.charId); if (!ch) return;
  const die = hitDieMax(ch);
  ch.level = clamp((Number(ch.level) || 1) + 1, 1, 20);
  ch.maxHp = (Number(ch.maxHp) || 0) + Math.floor(die / 2) + 1;
  ch.hp = Math.min(Number(ch.hp) + Math.floor(die / 2) + 1, ch.maxHp);
  save(); drawSheet(); render();
  toast("Уровень " + ch.level + ": +" + (Math.floor(die / 2) + 1) + " к максимуму хитов");
});
reg("sheet-add-weapon", () => {
  const ch = charById(state.ui.charId); if (!ch) return;
  openWeaponPicker((w) => {
    ch.weapons = ch.weapons || [];
    ch.weapons.push({ name: w.name, dice: w.dice, stat: w.stat, type: w.type, props: w.props });
    save(); drawSheet(); toast("Добавлено: " + w.name);
  });
});
function openWeaponPicker(cb) {
  openModal({ title: "Добавить оружие", body: `<div class="pick-grid">${DATA.weapons.map((w) => `<button class="pick" type="button" data-act="pick-weapon" data-name="${esc(w.name)}"><b>${esc(w.name)}</b><span>${esc(w.dice)}+${w.stat} ${esc(w.type)} · ${esc(w.cost)}</span></button>`).join("")}</div>`, onMount: () => { window.__weaponCb = cb; } });
}
reg("pick-weapon", (btn) => {
  const w = DATA.weapons.find((x) => x.name === btn.dataset.name);
  closeModal();
  if (w && window.__weaponCb) { window.__weaponCb(w); window.__weaponCb = null; }
});
reg("sheet-del-weapon", (btn) => {
  const ch = charById(state.ui.charId); if (!ch) return;
  ch.weapons.splice(Number(btn.dataset.i), 1);
  save(); drawSheet();
});
reg("sheet-attack", (btn) => {
  const ch = charById(state.ui.charId); if (!ch) return;
  const w = ch.weapons[Number(btn.dataset.i)]; if (!w) return;
  const mod = Number(ch[w.stat.toLowerCase()]) || 0;
  const res = rollFormula(w.dice + (mod >= 0 ? "+" + mod : mod), { attack: true });
  pushRoll(ch.name + " · " + w.name, res);
  showSheetRoll(res, w.name + " · " + w.dice + (mod >= 0 ? "+" + mod : mod), true);
});
function showSheetRoll(res, label, attack) {
  const host = $("#sheetRollResult");
  if (!host) return;
  host.hidden = false;
  let verdict = "";
  if (attack) verdict = res.miss ? `<b style="color:var(--red)">Промах</b>` : res.crit ? `<b style="color:var(--amber)">Крит!</b> Бросьте основную кость ещё раз; броня игнорируется.` : `<b>Попадание</b>`;
  host.innerHTML = `<div class="total ${res.crit ? "crit" : res.miss ? "miss" : ""}">${res.total}</div>
    <div class="detail">${esc(label)} · ${esc(res.detail)}</div>${verdict ? `<div class="verdict">${verdict}</div>` : ""}`;
}
reg("char-delete", (btn) => {
  const ch = charById(btn.dataset.id); if (!ch) return;
  if (!confirm(`Удалить персонажа «${ch.name}»? Это необратимо.`)) return;
  state.chars = state.chars.filter((c) => c.id !== ch.id);
  if (state.ui.charId === ch.id) state.ui.charId = state.chars[0]?.id || null;
  save(); closeModal(); render(); toast("Персонаж удалён");
});
reg("char-to-combat", (btn) => {
  const ch = charById(btn.dataset.id || state.ui.charId); if (!ch) return;
  addCharToCombat(ch);
  closeModal();
  go("combat");
});
reg("roll-init-char", (btn) => {
  const ch = charById(btn.dataset.id); if (!ch) return;
  const res = rollFormula("1d20+" + (Number(ch.dex) || 0));
  pushRoll(ch.name + " · инициатива", res);
  toast(`<b>${esc(ch.name)}</b>: инициатива ${res.total}`);
  const existing = state.combat.combatants.find((c) => c.charId === ch.id);
  if (existing) { existing.init = res.total; sortCombatants(); save(); render(); }
  else addCharToCombat(ch, res.total);
});
