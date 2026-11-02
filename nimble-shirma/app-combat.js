/* ================= Трекер боя ================= */

function parseCustomMonster(rec) {
  const actions = (rec.text || "").split(/\n+/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(.+?):(.*)$/);
    return m ? { n: m[1].trim().rstrip("."), d: m[2].trim() } : { n: "Действие", d: l };
  });
  return {
    id: rec.id, name: rec.name, lvl: rec.lvl || "1", hp: rec.hp || 1,
    armor: rec.armor || "none", speed: rec.speed || 6, mode: "ходьба",
    size: rec.size || "Средний", minion: false, kind: rec.group || "Свои существа",
    actions, special: []
  };
}
function findMonsterAny(name) {
  const lib = DATA.monsters.find((m) => m.name === name);
  if (lib) return lib;
  const custom = (state.custom || []).find((c) => c.kind === "monster" && c.name === name);
  return custom ? parseCustomMonster(custom) : null;
}

function addCharToCombat(ch, init) {
  if (state.combat.combatants.some((c) => c.charId === ch.id)) {
    toast("Этот герой уже в бою", "warn");
    return state.combat.combatants.find((c) => c.charId === ch.id);
  }
  const roll = init != null ? init : rollFormula("1d20+" + (Number(ch.dex) || 0)).total;
  const c = {
    id: uid(), name: ch.name, init: roll, hp: Number(ch.hp) || 0, maxHp: Number(ch.maxHp) || 0,
    armorValue: armorOf(ch), armorText: "Броня " + armorOf(ch),
    isHero: true, charId: ch.id, conditions: (ch.conditions || []).slice(),
    actions: 3, maxActions: 3, reaction: false,
    wounds: Number(ch.wounds) || 0, maxWounds: Number(ch.maxWounds) || 6
  };
  state.combat.combatants.push(c);
  state.combat.active = true;
  if (!state.combat.started) state.combat.started = Date.now();
  sortCombatants();
  save();
  render();
  return c;
}

function addMonsterToCombat(m, count = 1, init) {
  const armorText = m.armor === "medium" ? "Средняя броня" : m.armor === "heavy" ? "Тяжёлая броня" : "Без брони";
  for (let i = 0; i < count; i++) {
    const hp = m.hp || 1;
    const c = {
      id: uid(), name: count > 1 ? `${m.name} ${i + 1}` : m.name,
      init: init != null ? init : rollFormula("1d20").total,
      hp, maxHp: hp, armorValue: 0, armorText,
      isHero: false, monster: m.name, level: m.lvl,
      conditions: [], actions: 3, maxActions: 3, reaction: false, wounds: 0, maxWounds: 0
    };
    state.combat.combatants.push(c);
  }
  state.combat.active = true;
  if (!state.combat.started) state.combat.started = Date.now();
  sortCombatants();
  save();
  render();
}

function combatRow(c, idx) {
  const cur = state.combat.active && state.combat.turn === idx;
  const max = Number(c.maxHp) || 1;
  const pct = Math.max(0, Math.round(((Number(c.hp) || 0) / max) * 100));
  const dead = Number(c.hp) <= 0;
  return `<div class="combatant ${cur ? "is-current" : ""} ${dead ? "is-down" : ""}" data-id="${c.id}">
    <div class="init">${c.init ?? "—"}</div>
    <div>
      <div class="cname"><b>${esc(c.name)}</b>
        ${c.isHero ? `<span class="tag amber">герой</span>` : `<span class="tag">${esc(c.level ? "ур. " + c.level : "монстр")}</span>`}
        ${dead ? `<span class="tag red">повержен</span>` : ""}
        ${cur ? `<span class="tag green">ходит</span>` : ""}
      </div>
      <div class="cstats">
        <span>${c.hp} / ${c.maxHp} хит</span>
        <span class="armor">${esc(c.armorText || "")}</span>
        ${c.isHero ? `<span>${c.wounds}/${c.maxWounds} ран</span>` : ""}
      </div>
      <div class="cbar"><div class="hp-bar"><div class="hp-fill ${hpClass(c.hp, c.maxHp)}" style="width:${pct}%"></div></div></div>
      <div class="conds">
        ${(c.conditions || []).map((x) => `<button class="cond-chip" type="button" data-act="combat-cond-remove" data-id="${c.id}" data-name="${esc(x)}" title="Снять состояние">${esc(x)}</button>`).join("")}
        <select class="cond-add" data-act="combat-cond-add" data-id="${c.id}" aria-label="Добавить состояние">
          <option value="">＋ состояние</option>
          ${DATA.conditions.map((x) => `<option>${esc(x.name)}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="cside">
      <div class="row" style="gap:4px;justify-content:flex-end;flex-wrap:wrap">
        <div class="actions-pips" title="Действия в этом ходу">
          <span class="small dim nowrap acts-label">Действия:</span>
          ${Array.from({ length: c.maxActions || 3 }, (_, i) => `<button class="apip ${i < (c.actions ?? 3) ? "on" : ""}" type="button" data-act="combat-action" data-id="${c.id}" data-i="${i}" aria-label="Действие ${i + 1}"></button>`).join("")}
        </div>
        <button class="btn btn-sm ${c.reaction ? "btn-danger" : ""}" type="button" data-act="combat-reaction" data-id="${c.id}" title="Реакция — одно действие, но не чаще 1 раза за раунд">${c.reaction ? "✓ Реакция (1/раунд)" : "Реакция (1/раунд)"}</button>
      </div>
      <div class="hp-quick">
        <span class="small dim nowrap">Урон / лечение:</span>
        <input type="number" id="dmg-${c.id}" placeholder="число" min="0" aria-label="Урон или лечение">
        <div class="hp-btns">
          <button class="btn btn-sm btn-danger" type="button" data-act="combat-damage" data-id="${c.id}" title="Вычесть введённое число из хитов">− Урон</button>
          ${c.armorValue ? `<label class="check small" title="Реакция «Защита»: вычесть броню из урона этой атаки"><input type="checkbox" id="def-${c.id}">Защита (−${c.armorValue})</label>` : ""}
          <button class="btn btn-sm btn-green" type="button" data-act="combat-heal" data-id="${c.id}" title="Прибавить введённое число к хитам">+ Лечение</button>
        </div>
      </div>
      <div class="row" style="gap:2px;justify-content:flex-end;margin-top:2px">
        ${c.isHero ? `<button class="btn btn-sm" type="button" data-act="combat-wound" data-id="${c.id}">＋рана</button>` : ""}
        <button class="icon-btn sm danger" type="button" data-act="combat-remove" data-id="${c.id}" title="Убрать из боя"><svg class="ico"><use href="#i-trash"/></svg></button>
      </div>
    </div>
  </div>`;
}

function combatSetup() {
  return `<section class="card">
    <div class="card-head"><h2>Собрать бой</h2><span class="count">инициатива = d20 + ЛВК</span></div>
    <div class="card-body">
      <p class="muted small" style="margin-top:0">Добавьте героев и монстров, затем бросьте инициативу. Порядок меняется вручную — просто поправьте число.</p>
      <div class="combat-setup">
        <div>
          <div class="subhead">Партия</div>
          ${state.chars.length ? `<div class="stack" style="gap:6px">${state.chars.map((ch) => `<div class="row" style="justify-content:space-between;padding:8px 10px;border:1px solid var(--line);border-radius:9px">
            <div><div>${esc(ch.name)}</div><div class="small dim">${esc(charSummary(ch))}</div></div>
            <button class="btn btn-sm" type="button" data-act="combat-add-char" data-id="${ch.id}">＋</button>
          </div>`).join("")}</div>` : `<p class="small dim">Героев нет. <button class="btn btn-sm" type="button" data-act="new-char">Создать</button></p>`}
        </div>
        <div>
          <div class="subhead">Бестиарий</div>
          <div class="searchbar"><svg class="ico"><use href="#i-search"/></svg><input type="search" id="combatMonsterSearch" aria-label="Поиск существа в бестиарии" placeholder="Гоблин, тролль, нежить…"></div>
          <div id="combatMonsterList" class="stack" style="gap:5px;margin-top:8px;max-height:280px;overflow:auto"></div>
        </div>
      </div>
      <div class="row" style="margin-top:14px">
        <button class="btn btn-primary" type="button" data-act="combat-roll-all">Бросить инициативу и начать</button>
        <button class="btn" type="button" data-act="combat-add">Участник вручную</button>
      </div>
    </div>
  </section>`;
}

function combatView() {
  const c = state.combat;
  const cur = currentCombatant();
  return `<div class="page-head">
    <div><p class="eyebrow">Инициатива</p><h1 class="page-title">Бой</h1>
      <p class="page-sub">3 действия и 1 реакция на героя. Урон вводится цифрой; «Защита» снижает его на броню.</p></div>
    <div class="head-actions">
      ${c.active ? `<button class="btn" type="button" data-act="combat-add"><svg class="ico"><use href="#i-plus"/></svg>Участник</button>
      <button class="btn btn-primary" type="button" data-act="combat-next">Следующий ход<svg class="ico"><use href="#i-chevron"/></svg></button>` : ""}
    </div>
  </div>
  ${!c.combatants.length ? combatSetup() : `
  <section class="card">
    <div class="combat-toolbar">
      <div class="round"><b>${c.round}</b><span>раунд</span></div>
      <div class="row" style="gap:6px">
        <button class="btn btn-sm" type="button" data-act="combat-prev">←</button>
        <button class="btn btn-sm btn-primary" type="button" data-act="combat-next">Следующий →</button>
      </div>
      ${cur ? `<div class="grow small dim" style="margin-left:6px">Ходит: <b style="color:var(--amber-soft)">${esc(cur.name)}</b></div>` : `<div class="grow"></div>`}
      <button class="btn btn-sm" type="button" data-act="combat-add">＋</button>
      <button class="btn btn-sm btn-danger" type="button" data-act="combat-stop">Завершить</button>
    </div>
    <div class="combat-list">
      ${c.combatants.length ? c.combatants.map(combatRow).join("") : `<div class="empty" style="padding:26px"><p>В бою пока никого.</p><button class="btn btn-sm" type="button" data-act="combat-add">Добавить участника</button></div>`}
    </div>
    <div class="card-body" style="border-top:1px solid var(--line)">
      <p class="hint mb-0">Урон: впишите число в поле рядом с участником и нажмите «− Урон» (или Enter). «+ Лечение» — восстановить хиты. Если атака критическая, броню не вычитают, поэтому «Защита» не отмечается. Клик по числу инициативы меняет порядок хода.</p>
    </div>
  </section>`}`;
}
registerView("combat", combatView);

onBind("combat", () => {
  const inp = $("#combatMonsterSearch");
  if (inp) {
    const draw = () => {
      const q = inp.value;
      const list = searchRefs(q, "monster").slice(0, 40);
      $("#combatMonsterList").innerHTML = list.map((e) => `<div class="row" style="justify-content:space-between;padding:6px 9px;border:1px solid var(--line);border-radius:8px">
        <button class="grow" type="button" style="background:none;border:0;color:inherit;text-align:left;padding:0" data-act="combat-add-monster" data-name="${esc(e.name)}">
          <div class="small">${esc(e.name)}</div><div class="small dim">ур. ${esc(e.raw.lvl)} · ${e.raw.hp ? e.raw.hp + " хит" : "миньон"}</div>
        </button>
        <button class="btn btn-sm" type="button" data-act="combat-add-monster" data-name="${esc(e.name)}">＋</button>
      </div>`).join("") || `<p class="small dim">Не найдено.</p>`;
    };
    draw();
    inp.addEventListener("input", draw);
  }
  $$("[data-act='combat-cond-add']").forEach((sel) => sel.addEventListener("change", () => {
    if (!sel.value) return;
    const c = state.combat.combatants.find((x) => x.id === sel.dataset.id);
    if (!c) return;
    c.conditions = c.conditions || [];
    if (!c.conditions.includes(sel.value)) c.conditions.push(sel.value);
    save(); render();
  }));
  $$(".hp-quick input").forEach((inp) => inp.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && inp.value !== "") {
      ev.preventDefault();
      const id = inp.id.replace("dmg-", "");
      const c = state.combat.combatants.find((x) => x.id === id);
      if (c) ACTIONS["combat-damage"] && ACTIONS["combat-damage"]($("[data-act='combat-damage'][data-id='" + id + "']") || { dataset: { id } });
    }
  }));
});

/* ---------------- Combat actions ---------------- */
reg("combat-new", () => {
  if (state.combat.combatants.length && !confirm("Начать новый бой? Текущий список участников будет очищен.")) return;
  state.combat = { active: true, round: 1, turn: 0, combatants: [], started: Date.now() };
  save();
  go("combat");
});
reg("combat-add-char", (btn) => { const ch = charById(btn.dataset.id); if (ch) addCharToCombat(ch); });
reg("combat-add-monster", (btn) => {
  const m = DATA.monsters.find((x) => x.name === btn.dataset.name);
  if (!m) return;
  addMonsterToCombat(m, 1);
  toast("В бою: " + esc(m.name));
});
reg("combat-add", () => combatAddModal());
function combatAddModal() {
  const available = state.chars.filter((ch) => !state.combat.combatants.some((c) => c.charId === ch.id));
  openModal({
    title: "Добавить участника",
    body: `<div class="stack">
      <div class="field"><label for="caName">Имя</label><input id="caName" type="text" placeholder="Стражник, тень, босс…"></div>
      <div class="field-row">
        <div class="field"><label for="caInit">Инициатива</label><input id="caInit" type="number" placeholder="авто" ></div>
        <div class="field"><label for="caHp">Хиты</label><input id="caHp" type="number" value="10"></div>
        <div class="field"><label for="caArmor">Броня</label><input id="caArmor" type="number" value="0"></div>
      </div>
      ${available.length ? `<div><div class="subhead">Из партии</div><div class="chips">${available.map((ch) => `<button class="chip" type="button" data-act="combat-add-char" data-id="${ch.id}">${esc(ch.name)}</button>`).join("")}</div></div>` : ""}
      <p class="hint">Броня — число для реакции «Защита». Монстра с особенностями лучше добавить из справочника.</p>
    </div>`,
    footer: `<button class="btn" type="button" data-close-modal>Отмена</button><span class="spacer"></span><button class="btn btn-primary" type="button" data-act="combat-add-custom">Добавить</button>`
  });
}
reg("combat-add-custom", () => {
  const name = $("#caName").value.trim() || "Безымянный";
  const hp = Math.max(0, Number($("#caHp").value) || 0);
  const armor = Math.max(0, Number($("#caArmor").value) || 0);
  const initRaw = $("#caInit").value;
  const init = initRaw === "" ? rollFormula("1d20").total : Number(initRaw) || 0;
  state.combat.combatants.push({
    id: uid(), name, init, hp, maxHp: hp, armorValue: armor, armorText: armor ? "Броня " + armor : "Без брони",
    isHero: false, conditions: [], actions: 3, maxActions: 3, reaction: false, wounds: 0, maxWounds: 0
  });
  state.combat.active = true;
  sortCombatants(); save(); closeModal(); render();
});
reg("combat-roll-all", () => {
  state.combat.combatants.forEach((c) => { c.init = rollFormula("1d20" + (c.isHero ? "+" + (charById(c.charId)?.dex || 0) : "")).total; });
  state.combat.active = true;
  state.combat.round = 1; state.combat.turn = 0;
  sortCombatants(); save(); render();
  toast("Инициатива брошена");
});
reg("combat-next", () => {
  const list = state.combat.combatants;
  if (!list.length) return;
  let guard = 0;
  do {
    state.combat.turn++;
    if (state.combat.turn >= list.length) {
      state.combat.turn = 0;
      state.combat.round = (state.combat.round || 1) + 1;
      list.forEach((c) => { c.actions = c.maxActions || 3; c.reaction = false; });
    }
    guard++;
  } while (list[state.combat.turn] && list[state.combat.turn].hp <= 0 && guard < list.length + 1);
  const cur = list[state.combat.turn];
  if (cur) cur.actions = cur.maxActions || 3;
  state.combat.active = true;
  save(); render();
  checkRoundReminders();
});
reg("combat-prev", () => {
  const list = state.combat.combatants;
  if (!list.length) return;
  state.combat.turn--;
  if (state.combat.turn < 0) {
    state.combat.turn = Math.max(0, list.length - 1);
    state.combat.round = Math.max(1, (state.combat.round || 1) - 1);
  }
  save(); render();
});
reg("combat-stop", () => {
  if (!confirm("Завершить бой и очистить список участников?")) return;
  state.combat = { active: false, round: 1, turn: 0, combatants: [], started: null };
  save(); render();
  toast("Бой завершён");
});
reg("combat-remove", (btn) => {
  state.combat.combatants = state.combat.combatants.filter((c) => c.id !== btn.dataset.id);
  if (state.combat.turn >= state.combat.combatants.length) state.combat.turn = Math.max(0, state.combat.combatants.length - 1);
  save(); render();
});
reg("combat-action", (btn) => {
  const c = state.combat.combatants.find((x) => x.id === btn.dataset.id);
  if (!c) return;
  const i = Number(btn.dataset.i);
  c.actions = i < (c.actions ?? 3) ? i : i + 1;
  save(); render();
});
reg("combat-reaction", (btn) => {
  const c = state.combat.combatants.find((x) => x.id === btn.dataset.id);
  if (!c) return;
  c.reaction = !c.reaction;
  if (c.reaction) {
    c.actions = Math.max(0, (c.actions ?? c.maxActions ?? 3) - 1);
    toast(`${esc(c.name)}: реакция использована (−1 действие до конца раунда)`);
  } else {
    c.actions = Math.min(c.maxActions ?? 3, (c.actions ?? 0) + 1);
  }
  save(); render();
});
reg("combat-damage", (btn) => {
  const c = state.combat.combatants.find((x) => x.id === btn.dataset.id);
  if (!c) return;
  const input = $("#dmg-" + c.id);
  let amount = Math.max(0, Number(input?.value) || 0);
  if (!amount) { toast("Введите урон", "warn"); return; }
  const defend = !!$("#def-" + c.id)?.checked;
  if (defend && c.armorValue) amount = Math.max(0, amount - c.armorValue);
  const wasDown = c.hp <= 0;
  c.hp = Math.max(0, c.hp - amount);
  if (c.hp === 0) {
    if (!c.conditions.includes("При смерти")) c.conditions.push("При смерти");
    if (c.isHero) {
      const ch = charById(c.charId);
      if (wasDown) { c.wounds = Math.min(c.maxWounds, c.wounds + 2); if (ch) ch.wounds = c.wounds; }
    }
  }
  if (c.isHero) {
    const ch = charById(c.charId);
    if (ch) { ch.hp = c.hp; ch.wounds = c.wounds; ch.conditions = c.conditions.slice(); }
  }
  save(); render();
  toast(`${esc(c.name)}: −${amount}${defend && c.armorValue ? " (броня " + c.armorValue + ")" : ""} → ${c.hp} хит`);
});
reg("combat-heal", (btn) => {
  const c = state.combat.combatants.find((x) => x.id === btn.dataset.id);
  if (!c) return;
  const amount = Math.max(0, Number($("#dmg-" + c.id)?.value) || 0);
  if (!amount) { toast("Введите число лечения", "warn"); return; }
  c.hp = Math.min(c.maxHp || c.hp + amount, c.hp + amount);
  if (c.hp > 0) c.conditions = c.conditions.filter((x) => x !== "При смерти");
  if (c.isHero) {
    const ch = charById(c.charId);
    if (ch) { ch.hp = c.hp; ch.conditions = c.conditions.slice(); }
  }
  save(); render();
  toast(`${esc(c.name)}: +${amount} → ${c.hp} хит`);
});
reg("combat-wound", (btn) => {
  const c = state.combat.combatants.find((x) => x.id === btn.dataset.id);
  if (!c) return;
  c.wounds = Math.min(c.maxWounds, c.wounds + 1);
  const ch = charById(c.charId);
  if (ch) ch.wounds = c.wounds;
  save(); render();
  if (c.wounds >= c.maxWounds) toast(`${esc(c.name)} получает смертельную рану!`, "warn");
});
reg("combat-cond-remove", (btn) => {
  const c = state.combat.combatants.find((x) => x.id === btn.dataset.id);
  if (!c) return;
  c.conditions = c.conditions.filter((x) => x !== btn.dataset.name);
  const ch = charById(c.charId); if (ch) ch.conditions = c.conditions.slice();
  save(); render();
});
reg("ref-monster", (btn) => {
  const m = findMonsterAny(btn.dataset.name);
  if (!m) return;
  addMonsterToCombat(m, 1);
  toast("В бою: " + esc(m.name));
});
reg("ref-monster-group", (btn) => {
  const m = findMonsterAny(btn.dataset.name);
  if (!m) return;
  addMonsterToCombat(m, Number(btn.dataset.n) || 3);
  toast(`В бою: ${esc(m.name)} ×${btn.dataset.n}`);
});
