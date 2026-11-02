/* ================= Ширма и кубики ================= */
function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/);
  return (parts[0][0] || "?").toUpperCase() + (parts[1] ? parts[1][0].toUpperCase() : "");
}
function hpClass(hp, max) {
  const r = max ? hp / max : 0;
  if (r <= 0.25) return "crit";
  if (r <= 0.5) return "warn";
  return "";
}
function reminderSort(a, b) {
  const rank = (r) => (r.done ? 2 : isReminderDue(r) ? 0 : 1);
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (a.mode === "time" && b.mode === "time") return (a.due || 0) - (b.due || 0);
  return (a.created || 0) - (b.created || 0);
}
function charHpLine(ch) {
  const max = Number(ch.maxHp) || 0;
  const hp = clamp(Number(ch.hp) || 0, 0, max || 999);
  const pct = max ? Math.round((hp / max) * 100) : 0;
  return `<div class="hp-bar"><div class="hp-fill ${hpClass(hp, max)}" style="width:${pct}%"></div></div>`;
}

function heroCard() {
  const h = new Date().getHours();
  const greet = h < 5 ? "Тёмная ночь, мастер" : h < 12 ? "Доброе утро, мастер" : h < 18 ? "Добрый день, мастер" : "Добрый вечер, мастер";
  return `<section class="hero">
    <div>
      <h1>${greet}</h1>
      <p>Партия, броски и правила — под рукой. Всё сохраняется в этом браузере.</p>
    </div>
    <div class="hero-actions">
      <button class="btn" type="button" data-act="open-palette"><svg class="ico"><use href="#i-search"/></svg>Поиск</button>
      <button class="btn" type="button" data-act="new-char"><svg class="ico"><use href="#i-user"/></svg>Новый герой</button>
      <button class="btn btn-primary" type="button" data-act="combat-new"><svg class="ico"><use href="#i-swords"/></svg>Начать бой</button>
    </div>
  </section>`;
}

function dashParty() {
  const chars = state.chars;
  const activeId = state.ui.charId;
  return `<section class="card">
    <div class="card-head"><h2>Партия</h2><span class="count">${chars.length || "—"}</span>
      <button class="card-link" type="button" data-act="go" data-tab="chars">все<svg class="ico"><use href="#i-chevron"/></svg></button>
    </div>
    ${chars.length ? `<div>${chars.slice(0, 4).map((ch) => {
      const max = Number(ch.maxHp) || 0, hp = Number(ch.hp) || 0;
      return `<div class="party-row" role="button" tabindex="0" data-act="open-char" data-id="${ch.id}">
        <div class="avatar">${esc(initials(ch.name))}</div>
        <div class="party-main">
          <div class="party-name"><b>${esc(ch.name)}</b><span>${esc(charSummary(ch))}</span></div>
          <div class="party-stats"><span>${hp}/${max} хит</span><span>${ch.wounds || 0}/${ch.maxWounds || 6} ран</span>${Number(ch.maxMana) ? `<span>мана ${ch.mana || 0}/${ch.maxMana}</span>` : ""}</div>
          ${charHpLine(ch)}
        </div>
        <button class="icon-btn sm" type="button" data-act="roll-init-char" data-id="${ch.id}" title="Бросить инициативу"><svg class="ico"><use href="#i-d20"/></svg></button>
      </div>`;
    }).join("")}</div>` : `<div class="empty"><svg class="ico"><use href="#i-user"/></svg><p>Героев пока нет. Создайте первого — или сразу начните бой с бестиарием.</p><button class="btn btn-primary btn-sm" type="button" data-act="new-char">Создать персонажа</button></div>`}
  </section>`;
}

function dashQuickRoll() {
  const ch = charById(state.ui.charId) || state.chars[0];
  const stats = ch ? charStats(ch) : { STR: 0, DEX: 0, INT: 0, WIL: 0 };
  const sign = (n) => (n >= 0 ? "+" + n : "−" + Math.abs(n));
  const dc = state.ui.dc || 12;
  return `<section class="card">
    <div class="card-head"><h2>Быстрая проверка</h2><span class="count">${ch ? esc(ch.name) : "без героя"}</span></div>
    <div class="card-body">
      <div class="quick-rolls">
        ${STAT_IDS.map((id) => `<button class="qroll" type="button" data-act="quick-check" data-stat="${id}">
          <b>${STAT_SHORT[id]}</b><span>${sign(stats[id])}</span></button>`).join("")}
      </div>
      <div class="dice-row" style="margin-top:12px">
        <div class="field grow"><label for="dashDc">Сложность</label>
          <select id="dashDc" data-ui="dc">
            <option value="8"${dc === 8 ? " selected" : ""}>DC 8 — легко</option>
            <option value="12"${dc === 12 ? " selected" : ""}>DC 12 — средне</option>
            <option value="15"${dc === 15 ? " selected" : ""}>DC 15 — сложно</option>
            <option value="18"${dc === 18 ? " selected" : ""}>DC 18 — очень сложно</option>
            <option value="20"${dc === 20 ? " selected" : ""}>DC 20 — крайне сложно</option>
          </select></div>
        <button class="btn" type="button" data-act="quick-d20">d20</button>
      </div>
      <div id="dashRoll" class="roll-result" hidden></div>
    </div>
  </section>`;
}

function dashReminders() {
  const list = state.reminders.slice().sort(reminderSort).slice(0, 4);
  return `<section class="card">
    <div class="card-head"><h2>Напоминания</h2><span class="count">${state.reminders.filter((r) => !r.done).length || "—"}</span>
      <button class="card-link" type="button" data-act="go" data-tab="reminders">все<svg class="ico"><use href="#i-chevron"/></svg></button>
    </div>
    ${list.length ? `<div class="dash-list">${list.map((r) => `<div class="dash-item">
      <span class="dot" style="${r.done ? "background:var(--dim)" : isReminderDue(r) ? "background:var(--red)" : ""}"></span>
      <div class="grow"><div style="${r.done ? "text-decoration:line-through;opacity:.5" : ""}">${esc(r.text)}</div>
      <div class="small dim">${esc(reminderLabel(r))}</div></div>
      ${r.done ? "" : `<button class="icon-btn sm" type="button" data-act="rem-done" data-id="${r.id}" title="Выполнено"><svg class="ico"><use href="#i-check"/></svg></button>`}
    </div>`).join("")}</div>` : `<div class="empty"><svg class="ico"><use href="#i-bell"/></svg><p>Напоминаний нет. Добавьте «концентрация», «яд» или таймер на сцену.</p><button class="btn btn-sm" type="button" data-act="go" data-tab="reminders">Добавить</button></div>`}
  </section>`;
}

function dashCombat() {
  const c = state.combat;
  if (!c.active) {
    return `<section class="card">
      <div class="card-head"><h2>Бой</h2><span class="count">не начат</span></div>
      <div class="combat-empty">
        <p>Соберите инициативу из партии и бестиария. Раунды, хиты, состояния и реакции — на одном экране.</p>
        <div class="row" style="justify-content:center">
          <button class="btn btn-primary" type="button" data-act="combat-new">Начать бой</button>
          <button class="btn" type="button" data-act="go" data-tab="ref">Бестиарий</button>
        </div>
      </div>
    </section>`;
  }
  const list = c.combatants.slice(0, 4);
  const cur = currentCombatant();
  return `<section class="card">
    <div class="card-head"><h2>Бой · раунд ${c.round}</h2><span class="count">${c.combatants.length} участн.</span>
      <button class="card-link" type="button" data-act="go" data-tab="combat">трекер<svg class="ico"><use href="#i-chevron"/></svg></button>
    </div>
    <div class="combat-list">${list.map((x) => {
      const current = cur && cur.id === x.id;
      return `<div class="combatant ${current ? "is-current" : ""} ${x.hp <= 0 ? "is-down" : ""}" style="padding:9px 15px;grid-template-columns:38px 1fr auto">
        <div class="init" style="width:34px;height:34px;font-size:14px">${x.init ?? "—"}</div>
        <div>
          <div class="cname"><b>${esc(x.name)}</b>${current ? `<span class="tag amber">ходит</span>` : ""}</div>
          <div class="cstats"><span>${x.hp}/${x.maxHp} хит</span>${x.armorText ? `<span class="armor">${esc(x.armorText)}</span>` : ""}</div>
          <div class="cbar">${`<div class="hp-bar"><div class="hp-fill ${hpClass(x.hp, x.maxHp)}" style="width:${x.maxHp ? Math.max(0, Math.round((x.hp / x.maxHp) * 100)) : 0}%"></div></div>`}</div>
        </div>
        <div class="cside" style="align-self:center">
          <button class="icon-btn sm" type="button" data-act="combat-next" title="Следующий ход"><svg class="ico"><use href="#i-chevron"/></svg></button>
        </div>
      </div>`;
    }).join("")}</div>
    <div class="card-body" style="border-top:1px solid var(--line);display:flex;gap:8px;align-items:center">
      <button class="btn btn-sm btn-primary" type="button" data-act="combat-next">Следующий ход</button>
      <button class="btn btn-sm" type="button" data-act="combat-add">＋ Участник</button>
      <button class="btn btn-sm btn-danger" type="button" data-act="combat-stop" style="margin-left:auto">Завершить</button>
    </div>
  </section>`;
}

function dashNotes() {
  const notes = state.notes.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0)).slice(0, 3);
  return `<section class="card">
    <div class="card-head"><h2>Заметки</h2><span class="count">${state.notes.length || "—"}</span>
      <button class="card-link" type="button" data-act="new-note">＋ новая</button>
    </div>
    ${notes.length ? `<div class="dash-list">${notes.map((n) => `<button class="dash-item" type="button" style="width:100%;background:none;border:0;border-bottom:1px solid var(--line);text-align:left;color:inherit" data-act="open-note" data-id="${n.id}">
      <span class="dot" style="background:var(--blue)"></span>
      <div class="grow"><div><b style="font-weight:600">${esc(n.title || "Без названия")}</b></div>
      <div class="small dim" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc((n.plain || "").slice(0, 90))}</div></div>
      <time>${fmtDate(n.updated || n.created || Date.now())}</time>
    </button>`).join("")}</div>` : `<div class="empty"><svg class="ico"><use href="#i-note"/></svg><p>Здесь живут сюжет, NPC, тайны и обещания игрокам.</p><button class="btn btn-sm" type="button" data-act="new-note">Создать заметку</button></div>`}
  </section>`;
}

function dashConditions() {
  return `<section class="card">
    <div class="card-head"><h2>Состояния под рукой</h2><span class="count">${DATA.conditions.length}</span></div>
    <div class="card-body"><div class="chips">${DATA.conditions.map((c) => `<button class="chip" type="button" data-act="ref-entry" data-type="condition" data-name="${esc(c.name)}" title="${esc(c.desc)}">${esc(c.name)}</button>`).join("")}</div></div>
  </section>`;
}

registerView("screen", () => `<div class="grid grid-12">
  <div class="col-12">${heroCard()}</div>
  <div class="col-4">${dashParty()}</div>
  <div class="col-4">${dashQuickRoll()}</div>
  <div class="col-4">${dashReminders()}</div>
  <div class="col-7">${dashCombat()}</div>
  <div class="col-5">${dashNotes()}</div>
  <div class="col-12">${dashConditions()}</div>
</div>`);

onBind("screen", () => {
  const dc = $("#dashDc");
  if (dc) dc.addEventListener("change", () => { state.ui.dc = Number(dc.value); });
});

/* ---------------- Quick rolls ---------------- */
function showDashRoll(res, label, dc) {
  const host = $("#dashRoll");
  if (!host) return;
  host.hidden = false;
  const ok = dc ? res.total >= dc : null;
  host.innerHTML = `<div class="total ${res.crit ? "crit" : res.miss ? "miss" : ""}">${res.total}</div>
    <div class="detail">${esc(label)} · ${esc(res.detail)}</div>
    ${ok != null ? `<div class="verdict">${ok ? `<b>Успех</b> против DC ${dc}` : `<b style="color:var(--red)">Провал</b> против DC ${dc}`}${res.crit ? " · критический бросок" : ""}</div>` : ""}`;
}
function doQuickCheck(stat) {
  const ch = charById(state.ui.charId) || state.chars[0];
  const mod = ch ? Number(ch[stat.toLowerCase()]) || 0 : 0;
  const res = rollFormula("1d20" + (mod >= 0 ? "+" + mod : mod));
  const dc = Number(state.ui.dc) || 12;
  pushRoll((ch ? ch.name + " · " : "") + STAT_NAME[stat], res);
  showDashRoll(res, STAT_NAME[stat] + (mod >= 0 ? " +" + mod : " " + mod), dc);
  save();
}
reg("quick-check", (btn) => doQuickCheck(btn.dataset.stat));
reg("quick-d20", () => {
  const ch = charById(state.ui.charId) || state.chars[0];
  const res = rollFormula("1d20");
  pushRoll(ch ? ch.name + " · d20" : "d20", res);
  showDashRoll(res, "d20", Number(state.ui.dc) || null);
});
reg("open-palette", () => openPalette());
reg("go", (btn) => go(btn.dataset.tab));

/* ---------------- Dice view ---------------- */
const DICE = [4, 6, 8, 10, 12, 20, 44, 66, 88, 100];
function diceView() {
  const ui = state.ui;
  const faces = ui.diceFaces || 20;
  const mode = ui.diceMode || "normal";
  return `<div class="page-head">
    <div><p class="eyebrow">Броски</p><h1 class="page-title">Кубики</h1>
      <p class="page-sub">d20 для проверок, кости урона, преимущество и помеха. Красная 1 — промах, максимум на основной кости — крит.</p></div>
  </div>
  <div class="dice-layout">
    <section class="card">
      <div class="card-head"><h2>Стол</h2><span class="count">${faces === 44 || faces === 66 || faces === 88 ? "цифровая кость" : "d" + faces}</span></div>
      <div class="card-body">
        <div class="dice-tray">
          ${DICE.map((d) => `<button class="die-btn ${faces === d ? "is-chosen" : ""}" type="button" data-act="die-pick" data-faces="${d}">
            <b>d${d}</b><span>${d === 44 || d === 66 || d === 88 ? "цифры" : d === 100 ? "процент" : ""}</span></button>`).join("")}
        </div>
        <div class="dice-row">
          <div class="field"><label for="diceCount">Костей</label><input id="diceCount" type="number" min="1" max="20" value="${ui.diceCount || 1}" data-ui="diceCount"></div>
          <div class="field"><label for="diceMod">Модификатор</label><input id="diceMod" type="number" step="1" value="${ui.diceMod || 0}" data-ui="diceMod"></div>
          <div class="field grow"><label for="diceFormula">Формула</label><input id="diceFormula" type="text" placeholder="2d6+3, 1d20+5, d66" value="${esc(ui.diceFormula || "")}" data-ui="diceFormula"></div>
        </div>
        <div class="dice-row">
          <div class="adv-toggle" role="group" aria-label="Режим броска">
            <button type="button" data-act="dice-mode" data-mode="dis" class="${mode === "dis" ? "on" : ""}">Помеха</button>
            <button type="button" data-act="dice-mode" data-mode="normal" class="${mode === "normal" ? "on" : ""}">Обычный</button>
            <button type="button" data-act="dice-mode" data-mode="adv" class="${mode === "adv" ? "on" : ""}">Преимущество</button>
          </div>
          <label class="check" style="margin-left:4px"><input type="checkbox" id="diceAttack" ${ui.diceAttack ? "checked" : ""}> считать атакой</label>
          <button class="btn btn-primary" type="button" data-act="dice-roll" style="margin-left:auto"><svg class="ico"><use href="#i-d20"/></svg>Бросить</button>
        </div>
        <div id="diceResult" class="roll-result" hidden></div>
      </div>
    </section>

    <div class="stack">
      <section class="card">
        <div class="card-head"><h2>Быстрые кости</h2><span class="count">1 бросок</span></div>
        <div class="card-body">
          <div class="quick-rolls">
            ${[4, 6, 8, 10, 12].map((d) => `<button class="qroll" type="button" data-act="quick-die" data-faces="${d}"><b>d${d}</b><span>кость</span></button>`).join("")}
          </div>
          <div class="quick-rolls" style="margin-top:7px">
            <button class="qroll" type="button" data-act="quick-die" data-faces="20"><b>d20</b><span>проверка</span></button>
            <button class="qroll" type="button" data-act="quick-die" data-faces="100"><b>d100</b><span>процент</span></button>
            <button class="qroll" type="button" data-act="quick-die" data-faces="66"><b>d66</b><span>цифры</span></button>
            <button class="qroll" type="button" data-act="quick-die" data-faces="88"><b>d88</b><span>цифры</span></button>
          </div>
          <p class="hint">Цифровые кости d44/d66/d88: две кости, первая — десятки, вторая — единицы. Они не промахиваются и не критуют.</p>
        </div>
      </section>

      <section class="card card-flush">
        <div class="card-head"><h2>История</h2><span class="count">${state.rolls.length}</span>
          <button class="card-link" type="button" data-act="rolls-clear">очистить</button>
        </div>
        ${state.rolls.length ? `<div class="rolls" style="max-height:330px;overflow:auto">${state.rolls.slice(0, 20).map((r) => `<div class="roll-item">
          <span class="t">${fmtTimeShort(r.ts)}</span>
          <span class="lbl" title="${esc(r.detail)}">${esc(r.label)}</span>
          <span class="val ${r.crit ? "crit" : ""}">${r.total}</span>
        </div>`).join("")}</div>` : `<div class="empty" style="padding:18px"><p>Пока пусто.</p></div>`}
      </section>
    </div>
  </div>`;
}
registerView("dice", diceView);

onBind("dice", () => {
  $$("[data-ui]").forEach((inp) => {
    inp.addEventListener("input", () => {
      const key = inp.dataset.ui;
      state.ui[key] = inp.type === "number" ? Number(inp.value) : inp.value;
      if (key === "diceFaces" || key === "diceCount") return;
      save();
    });
  });
  const atk = $("#diceAttack");
  if (atk) atk.addEventListener("change", () => { state.ui.diceAttack = atk.checked; save(); });
});

reg("die-pick", (btn) => { state.ui.diceFaces = Number(btn.dataset.faces); state.ui.diceCount = 1; state.ui.diceFormula = ""; save(); render(); });
reg("dice-mode", (btn) => { state.ui.diceMode = btn.dataset.mode; save(); render(); });
reg("quick-die", (btn) => {
  const faces = Number(btn.dataset.faces);
  const res = rollFormula("1d" + faces);
  pushRoll("d" + faces, res);
  renderDiceResult(res, "d" + faces, false);
});
reg("dice-roll", () => {
  const ui = state.ui;
  const formula = (ui.diceFormula || "").trim();
  const atk = !!ui.diceAttack;
  const f = formula || (Number(ui.diceCount || 1) + "d" + (ui.diceFaces || 20) + (Number(ui.diceMod) ? (Number(ui.diceMod) > 0 ? "+" + ui.diceMod : ui.diceMod) : ""));
  const res = rollFormula(f, { mode: ui.diceMode || "normal", attack: atk });
  if (res.error) { toast(res.error, "warn"); return; }
  pushRoll((atk ? "Атака · " : "") + f, res);
  renderDiceResult(res, f, atk);
  save();
  if (state.ui.tab === "dice") render();
});
reg("rolls-clear", () => { state.rolls = []; save(); render(); toast("История бросков очищена"); });

function renderDiceResult(res, label, attack) {
  const host = $("#diceResult");
  if (!host) return;
  host.hidden = false;
  let verdict = "";
  if (attack) {
    verdict = res.miss ? `<b style="color:var(--red)">Промах</b> — на основной кости 1.`
      : res.crit ? `<b style="color:var(--amber)">Критический удар!</b> Бросьте основную кость ещё раз и добавьте; крит игнорирует броню.`
      : `<b>Попадание.</b> Обычный урон.`;
  }
  host.innerHTML = `<div class="total ${res.crit ? "crit" : res.miss ? "miss" : ""}">${res.total}</div>
    <div class="detail">${esc(label)} · ${esc(res.detail)}</div>
    ${verdict ? `<div class="verdict">${verdict}</div>` : ""}`;
}
