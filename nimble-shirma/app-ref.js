/* ================= Справочник, записи и командная палитра ================= */
function refKey(e) { return e.type + ":" + e.name; }
function findRef(type, name) { return refIndex().find((e) => e.type === type && e.name === name); }
function refCounts() {
  const c = {};
  refIndex().forEach((e) => { c[e.type] = (c[e.type] || 0) + 1; });
  return c;
}

const REF_TYPES = [
  ["all", "Всё"], ["rule", "Правила"], ["condition", "Состояния"], ["weapon", "Оружие"],
  ["armor", "Броня"], ["gear", "Снаряжение"], ["magic", "Магия"], ["monster", "Существа"],
  ["spell", "Заклинания"], ["class", "Классы"], ["ancestry", "Предки"], ["background", "Предыстории"], ["custom", "Своё"]
];

function refView() {
  const type = state.ui.refType || "all";
  const q = state.ui.refQuery || "";
  const results = searchRefs(q, type);
  const counts = refCounts();
  if (!state.ui.refSel && results.length) state.ui.refSel = refKey(results[0]);
  let sel = results.find((e) => refKey(e) === state.ui.refSel) || results[0];
  if (sel) state.ui.refSel = refKey(sel);
  const entry = sel ? entryHTML(sel) : `<div class="card"><div class="empty"><p>Ничего не найдено. Попробуйте другое слово или добавьте свою запись.</p></div></div>`;
  return `<div class="page-head">
    <div><p class="eyebrow">Справочник</p><h1 class="page-title">Всё за столом</h1>
      <p class="page-sub">${refIndex().length} записей: правила, состояния, оружие, магия, бестиарий и заклинания. Поиск ищет и по тексту.</p></div>
    <div class="head-actions"><button class="btn" type="button" data-act="custom-new"><svg class="ico"><use href="#i-plus"/></svg>Своя запись</button></div>
  </div>
  <div class="searchbar" style="margin-bottom:12px">
    <svg class="ico"><use href="#i-search"/></svg>
    <input id="refSearch" type="search" aria-label="Поиск по справочнику" placeholder="Найти: «огонь», «схвачен», «тролль», «отдых»…" value="${esc(q)}" autocomplete="off">
    ${q ? `<button class="icon-btn sm clear" type="button" data-act="ref-clear" aria-label="Очистить">×</button>` : ""}
  </div>
  <div class="chips" style="margin-bottom:14px">
    ${REF_TYPES.map(([k, label]) => `<button class="chip ${type === k ? "is-active" : ""}" type="button" data-act="ref-type" data-type="${k}">${label}${k !== "all" && counts[k] ? ` <span class="n">${counts[k]}</span>` : ""}</button>`).join("")}
  </div>
  <div class="ref-layout">
    <div class="card ref-list">
      ${results.length ? results.map((e) => `<button class="ref-row ${sel && refKey(e) === refKey(sel) ? "is-active" : ""}" type="button" data-act="ref-select" data-key="${esc(refKey(e))}">
        <div><div class="nm">${esc(e.name)}</div>${e.sub ? `<div class="sub">${esc(e.sub)}</div>` : ""}</div>
        <span class="ty">${TYPE_LABEL[e.type] || ""}</span>
      </button>`).join("") : `<div class="empty" style="padding:20px"><p>Пусто.</p></div>`}
    </div>
    <div class="card"><div class="card-body entry">${entry}</div></div>
  </div>`;
}
registerView("ref", refView);

onBind("ref", () => {
  const inp = $("#refSearch");
  if (!inp) return;
  inp.addEventListener("input", () => {
    state.ui.refQuery = inp.value;
    state.ui.refSel = null;
    render();
    const again = $("#refSearch");
    if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
  });
});

reg("ref-type", (btn) => { state.ui.refType = btn.dataset.type; state.ui.refSel = null; save(); render(); });
reg("ref-select", (btn) => { state.ui.refSel = btn.dataset.key; save(); render(); });
reg("ref-clear", () => { state.ui.refQuery = ""; state.ui.refSel = null; render(); });
reg("ref-entry", (btn) => {
  const e = findRef(btn.dataset.type, btn.dataset.name);
  if (e) openDrawer(`<div class="entry">${entryHTML(e)}</div>`);
});


/* Рендер монстра и оружия (общие для библиотеки и своих записей) */
function monsterBodyHTML(r) {
  const tag = (t, c = "") => `<span class="tag ${c}">${esc(t)}</span>`;
  const armorTxt = r.armor === "medium" ? "Средняя" : r.armor === "heavy" ? "Тяжёлая" : "Нет";
  return `<div class="statline">${tag("Уровень " + (r.lvl || "—"), "amber")}${r.hp ? tag(r.hp + " хитов", "green") : tag("Миньон", "red")}${tag(r.size || "")}${tag("Броня: " + armorTxt, "blue")}${tag("Скорость " + (r.speed || 6) + (r.mode ? " (" + r.mode + ")" : ""))}${r.kind ? tag(r.kind) : ""}</div>
    <div class="row" style="margin-bottom:10px">
      <button class="btn btn-sm btn-primary" type="button" data-act="ref-monster" data-name="${esc(r.name)}">В бой</button>
      <button class="btn btn-sm" type="button" data-act="ref-card" data-type="monster" data-name="${esc(r.name)}">Карточка</button>
      <button class="btn btn-sm" type="button" data-act="ref-monster-group" data-name="${esc(r.name)}" data-n="3">×3</button>
      ${r.id ? `<button class="btn btn-sm" type="button" data-act="custom-edit" data-id="${esc(r.id)}">Изменить</button>` : ""}
      ${r.id ? `<button class="btn btn-sm btn-danger" type="button" data-act="custom-delete" data-id="${esc(r.id)}">Удалить</button>` : ""}
    </div>
    <h3>Действия</h3>
    ${(r.actions || []).length ? r.actions.map((a) => `<div class="action"><b>${esc(a.n)}.</b> <span class="d">${esc(a.d)}</span></div>`).join("") : `<p class="hint">Особых атак нет — действует по правилам миньонов.</p>`}
    ${(r.special || []).length ? `<h3>Особенности</h3>${r.special.map((a) => `<div class="action"><b>${esc(a.n)}.</b> <span class="d">${esc(a.d)}</span></div>`).join("")}` : ""}
    <p class="hint mt-12">${r.armor === "medium" ? "Средняя броня: игнорирует все модификаторы урона, считает только кости." : r.armor === "heavy" ? "Тяжёлая броня: берёт половину суммы костей урона (вверх)." : "Без брони: получает урон целиком."}</p>`;
}
function weaponBodyHTML(r) {
  const tag = (t, c = "") => `<span class="tag ${c}">${esc(t)}</span>`;
  const stat = r.stat ? "+" + esc(r.stat) : "";
  return `<div class="statline">${r.cat ? tag(r.cat) : ""}${r.cost ? tag(r.cost) : ""}${tag(r.dice + (r.stat ? "+" + r.stat : "") + " " + (r.type || ""), "amber")}</div>
    <dl class="kv"><dt>Урон</dt><dd>${esc(r.dice)}${stat} ${esc(r.type || "")}</dd>
    ${r.cost ? `<dt>Стоимость</dt><dd>${esc(r.cost)}</dd>` : ""}
    <dt>Свойства</dt><dd>${(r.props || []).map(esc).join(", ") || "—"}</dd></dl>
    <div class="row mt-12"><button class="btn btn-sm" type="button" data-act="ref-roll" data-formula="${esc(r.dice)}" data-label="${esc(r.name)}">Бросок урона</button>
    <button class="btn btn-sm" type="button" data-act="ref-attack" data-formula="${esc(r.dice + (r.stat ? "+" + r.stat : ""))}" data-label="${esc(r.name)}">Как атаку</button>${r.id ? `<button class="btn btn-sm" type="button" data-act="custom-edit" data-id="${esc(r.id)}">Изменить</button>` : ""}${r.id ? `<button class="btn btn-sm btn-danger" type="button" data-act="custom-delete" data-id="${esc(r.id)}">Удалить</button>` : ""}</div>
    ${(r.props || []).length ? `<h3>Свойства оружия</h3>${r.props.map((p) => { const prop = DATA.weaponProps.find((x) => p.toLowerCase().startsWith(x.name.toLowerCase().slice(0, 4))); return `<p><b>${esc(p)}.</b> ${prop ? esc(prop.desc) : ""}</p>`; }).join("")}` : ""}`;
}

function monsterCardHTML(r) {
  const armorTxt = r.armor === "medium" ? "Средняя" : r.armor === "heavy" ? "Тяжёлая" : "Нет";
  return `<div class="print-sheet" id="cardPrint">
    <div class="card-h">${esc(r.name)}</div>
    <div class="card-sub">Существо · уровень ${esc(r.lvl || "—")} · ${esc(r.size || "")}</div>
    <div class="card-stats">
      <div><span>Хиты</span><b>${r.hp ? r.hp : "миньон"}</b></div>
      <div><span>Броня</span><b>${armorTxt}</b></div>
      <div><span>Скорость</span><b>${esc(r.speed || "6")}</b></div>
      <div><span>Группа</span><b>${esc(r.kind || "—")}</b></div>
    </div>
    ${(r.actions || []).length ? `<div class="card-sec"><h4>Действия</h4>${r.actions.map((a) => `<p><b>${esc(a.n)}.</b> ${esc(a.d)}</p>`).join("")}</div>` : ""}
    ${(r.special || []).length ? `<div class="card-sec"><h4>Особенности</h4>${r.special.map((a) => `<p><b>${esc(a.n)}.</b> ${esc(a.d)}</p>`).join("")}</div>` : ""}
  </div>`;
}
function spellCardHTML(r) {
  return `<div class="print-sheet" id="cardPrint">
    <div class="card-h">${esc(r.name)}</div>
    <div class="card-sub">Заклинание · ${esc(r.school)} · ${r.tier ? "тир " + r.tier : "заговор"}</div>
    <div class="card-stats">
      <div><span>Применение</span><b>${esc(r.cast || "—")}</b></div>
      <div><span>Цель</span><b>${esc(r.target || "—")}</b></div>
    </div>
    <div class="card-sec"><p>${esc(r.text).replace(/\n/g, "<br>")}</p></div>
  </div>`;
}
reg("ref-card", (btn) => {
  const e = findRef(btn.dataset.type, btn.dataset.name);
  if (!e) return;
  const r = e.raw || {};
  const card = e.type === "spell" ? spellCardHTML(r) : monsterCardHTML(r);
  openModal({
    title: "Карточка",
    body: card + `<div class="row print-actions mt-16"><button class="btn btn-primary" type="button" data-act="card-print">Печатать</button>
      <span class="small dim">Закройте окно печати, чтобы вернуться</span></div>`
  });
});
reg("card-print", () => { try { window.print(); } catch (e) { toast("Печать недоступна", "warn"); } });
/* --- */

/* ---------------- Entry rendering ---------------- */
function entryHTML(e) {
  const r = e.raw || {};
  const tag = (t, cls = "") => `<span class="tag ${cls}">${esc(t)}</span>`;
  const head = `<h2>${esc(e.name)}</h2><div class="entry-meta">${tag(TYPE_LABEL[e.type] || "", "amber")}`;
  let body = "";

  if (e.type === "rule") {
    body = `<p class="lede">${esc(r.cat || "")}</p><p>${esc(r.text || e.text).replace(/\n/g, "<br>")}</p>`;
  } else if (e.type === "condition") {
    body = `<p>${esc(r.desc || e.text).replace(/\n/g, "<br>")}</p>`;
  } else if (e.type === "weapon") {
    body = weaponBodyHTML(r);
  } else if (e.type === "armor") {
    body = `<div class="statline">${tag(r.cat)}${tag("Броня " + r.armor, "blue")}${tag(r.cost)}</div>
      <dl class="kv"><dt>Броня</dt><dd>${esc(r.armor)}</dd><dt>Категория</dt><dd>${esc(r.cat)}</dd>
      <dt>Стоимость</dt><dd>${esc(r.cost)}</dd>${r.note ? `<dt>Требование</dt><dd>${esc(r.note)}</dd>` : ""}</dl>
      <p class="hint mt-12">Реакция «Защита» снижает урон одной атаки на значение брони. У монстров средняя броня игнорирует модификаторы урона, тяжёлая — половинит сумму костей.</p>`;
  } else if (e.type === "gear") {
    body = `<div class="statline">${tag(r.cost)}</div><p>${esc(r.desc)}</p>`;
  } else if (e.type === "magic") {
    body = `<div class="statline">${tag(r.rarity || "магия", "violet")}</div><p>${esc(r.desc).replace(/\n/g, "<br>")}</p>`;
  } else if (e.type === "monster") {
    body = monsterBodyHTML(r);
  } else if (e.type === "spell") {
    const dmg = (r.text.match(/(\d*d\d+|\d+)/i) || [])[0];
    body = `<div class="statline">${tag(r.school, "violet")}${tag(r.tier ? "Тир " + r.tier : "Кантрип", "amber")}${tag(r.cast)}${r.target ? tag(r.target) : ""}</div>
      <p>${esc(r.text).replace(/\n/g, "<br>")}</p>
      <div class="row mt-12">
        <button class="btn btn-sm" type="button" data-act="ref-roll" data-formula="d20" data-label="${esc(r.name)}">d20</button>
        ${/\d*d\d+/.test(r.text) ? `<button class="btn btn-sm" type="button" data-act="ref-roll" data-formula="${esc((r.text.match(/\d*d\d+(?:\+\d+)?/) || [""])[0] || "1d6")}" data-label="${esc(r.name)}">Бросок урона</button>` : ""}
        <button class="btn btn-sm" type="button" data-act="ref-copy" data-text="${esc(r.name + ". " + r.text)}">Копировать</button>
        <button class="btn btn-sm" type="button" data-act="ref-card" data-type="spell" data-name="${esc(r.name)}">Карточка</button>
      </div>`;
  } else if (e.type === "class") {
    body = `<div class="statline">${tag(r.hp + " хитов", "green")}${tag("Кость " + r.hitDie)}${tag("KEY: " + r.key.map((k) => STAT_SHORT[k]).join("/"), "amber")}${tag(r.armor.join(", ") || "без брони")}</div>
      <p class="lede">${esc(r.role)}</p>
      <dl class="kv"><dt>Спасброски</dt><dd>${savesLine(r)}</dd><dt>Оружие</dt><dd>${esc(r.weapons)}</dd><dt>Старт</dt><dd>${(r.gear || []).map(esc).join(", ")}</dd></dl>
      <h3>1 уровень</h3>
      ${(r.lvl1 || []).map((a) => `<div class="action"><b>${esc(a.n)}.</b> <span class="d">${esc(a.d)}</span></div>`).join("")}`;
  } else if (e.type === "ancestry") {
    body = `<div class="statline">${tag(r.size)}</div><p>${esc(r.trait).replace(/\n/g, "<br>")}</p>`;
  } else if (e.type === "background") {
    body = `<div class="statline">${tag("Предыстория", "violet")}</div><p>${esc(r.text).replace(/\n/g, "<br>")}</p>`;
  } else if (e.type === "custom") {
    if (r.kind === "monster") {
      body = monsterBodyHTML(r);
    } else if (r.kind === "weapon") {
      body = weaponBodyHTML(r);
    } else {
      body = `<div class="statline">${tag("Своя запись", "violet")}${r.sub ? tag(r.sub) : ""}</div>
      <p>${esc(r.text || "").replace(/\n/g, "<br>")}</p>
      <div class="row mt-12"><button class="btn btn-sm" type="button" data-act="custom-edit" data-id="${esc(r.id)}">Изменить</button>
      <button class="btn btn-sm btn-danger" type="button" data-act="custom-delete" data-id="${esc(r.id)}">Удалить</button></div>`;
    }
  }
  return head + "</div>" + body;
}

reg("ref-roll", (btn) => {
  const res = rollFormula(btn.dataset.formula);
  pushRoll(btn.dataset.label + " · урон", res);
  toast(`<b>${esc(btn.dataset.label)}</b>: ${res.total}<br><span class="dim mono small">${esc(res.detail)}</span>`);
  render();
});
reg("ref-attack", (btn) => {
  const res = rollFormula(btn.dataset.formula, { attack: true });
  pushRoll(btn.dataset.label + " · атака", res);
  toast(res.miss ? `<b>${esc(btn.dataset.label)}</b>: промах (1 на кости)` : res.crit ? `<b>${esc(btn.dataset.label)}</b>: крит, ${res.total}! Броня игнорируется.` : `<b>${esc(btn.dataset.label)}</b>: попадание, ${res.total}`);
  render();
});
reg("ref-copy", (btn) => {
  const text = btn.dataset.text || "";
  navigator.clipboard?.writeText(text).then(() => toast("Скопировано"), () => toast("Браузер не дал скопировать", "warn"));
});

/* ---------------- Custom entries ---------------- */
reg("custom-new", () => customEditor(null));
reg("custom-edit", (btn) => customEditor(btn.dataset.id));
function customEditor(id) {
  const item = id ? state.custom.find((c) => c.id === id) : null;
  const kind = item?.kind || "text";
  const act = (k) => `<button class="chip ${kind === k ? "is-active" : ""}" type="button" data-act="custom-kind" data-kind="${k}">${k === "text" ? "Текст" : k === "monster" ? "Существо" : "Оружие"}</button>`;
  openModal({
    title: item ? "Изменить запись" : "Своя запись",
    body: `<div class="stack">
      <div class="field"><label for="cuName">Название</label><input id="cuName" type="text" value="${esc(item?.name || "")}" placeholder="Например, «Долг крови», «Гоблин-вожак», «Кинжал возмездия»"></div>
      <div class="field"><span class="field-label">Тип записи</span><div class="chips">${act("text")}${act("monster")}${act("weapon")}</div></div>
      <div class="field" data-cufield="sub" style="${kind === "text" ? "" : "display:none"}"><label for="cuSub">Подзаголовок</label><input id="cuSub" type="text" value="${esc(item?.sub || "")}" placeholder="Правило, NPC, место, предмет…"></div>
      <div class="field" data-cufield="text" style="${kind === "text" || kind === "monster" ? "" : "display:none"}"><label for="cuText">${kind === "monster" ? "Описание и действия" : "Текст"}</label><textarea id="cuText" rows="6" placeholder="${kind === "monster" ? "Каждое действие с новой строки: Название: описание (урон по правилам Nimble, например 1к6+2)" : "Что нужно помнить за столом"}">${esc(item?.text || "")}</textarea></div>

      <div data-cufield="monster-fields" style="${kind === "monster" ? "" : "display:none"}">
        <div class="field-row">
          <div class="field"><label for="cuLvl">Уровень</label><input id="cuLvl" type="text" value="${esc(item?.lvl || "1")}" placeholder="1, 1/3, 4…"></div>
          <div class="field"><label for="cuHp">Хиты</label><input id="cuHp" type="number" min="1" value="${item?.hp || 10}"></div>
          <div class="field"><label for="cuSpeed">Скорость</label><input id="cuSpeed" type="number" min="0" value="${item?.speed || 6}"></div>
          <div class="field"><label for="cuSize">Размер</label><select id="cuSize">${["Крошечный","Маленький","Средний","Большой","Огромный","Исполинский"].map((x) => `<option${(item?.size || "Средний") === x ? " selected" : ""}>${x}</option>`).join("")}</select></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="cuArmor">Броня</label><select id="cuArmor"><option value="none"${(item?.armor || "none") === "none" ? " selected" : ""}>Нет</option><option value="medium"${item?.armor === "medium" ? " selected" : ""}>Средняя</option><option value="heavy"${item?.armor === "heavy" ? " selected" : ""}>Тяжёлая</option></select></div>
          <div class="field"><label for="cuKind">Группа</label><input id="cuKind" type="text" value="${esc(item?.kind || "")}" placeholder="Гоблины, Легендарные…"></div>
        </div>
      </div>

      <div data-cufield="weapon-fields" style="${kind === "weapon" ? "" : "display:none"}">
        <div class="field-row">
          <div class="field"><label for="cuDice">Кость урона</label><input id="cuDice" type="text" value="${esc(item?.dice || "1d6")}" placeholder="1d6, 2d8, 1d10…"></div>
          <div class="field"><label for="cuStat">Характеристика</label><select id="cuStat"><option value="">—</option><option value="STR"${item?.stat === "STR" ? " selected" : ""}>СИЛ</option><option value="DEX"${item?.stat === "DEX" ? " selected" : ""}>ЛВК</option></select></div>
          <div class="field"><label for="cuWtype">Тип урона</label><input id="cuWtype" type="text" value="${esc(item?.wtype || "Колющий")}" placeholder="Колющий, Рубящий…"></div>
          <div class="field"><label for="cuCost">Цена</label><input id="cuCost" type="text" value="${esc(item?.cost || "")}" placeholder="10 зм"></div>
        </div>
        <div class="field"><label for="cuProps">Свойства</label><input id="cuProps" type="text" value="${esc((item?.props || []).join(", "))}" placeholder="Лёгкое, Метательное 4"></div>
      </div>
    </div>`,
    footer: `<button class="btn" type="button" data-close-modal>Отмена</button><span class="spacer"></span><button class="btn btn-primary" type="button" data-act="custom-save" data-id="${item ? item.id : ""}" data-kind="${kind}">Сохранить</button>`
  });
}
let customKind = "text";
reg("custom-kind", (btn) => {
  customKind = btn.dataset.kind;
  $$("[data-act='custom-kind']").forEach((b) => b.classList.toggle("is-active", b.dataset.kind === customKind));
  $$("[data-cufield]").forEach((el) => {
    const show = customKind === "monster" ? el.dataset.cufield === "monster-fields" || el.dataset.cufield === "text"
      : customKind === "weapon" ? el.dataset.cufield === "weapon-fields"
      : el.dataset.cufield === "sub" || el.dataset.cufield === "text";
    el.style.display = show ? "" : "none";
  });
  const lbl = $("[data-cufield='text'] label");
  if (lbl) lbl.textContent = customKind === "monster" ? "Описание и действия" : "Текст";
  const text = $("#cuText");
  if (text) text.placeholder = customKind === "monster" ? "Каждое действие с новой строки: Название: описание (например, 1к6+2)" : "Что нужно помнить за столом";
  const saveBtn = $("[data-act='custom-save']");
  if (saveBtn) saveBtn.dataset.kind = customKind;
});
reg("custom-save", (btn) => {
  const name = $("#cuName")?.value.trim();
  const kind = btn.dataset.kind || "text";
  if (!name) { toast("Нужно название", "warn"); return; }
  const sub = $("#cuSub")?.value.trim();
  const text = $("#cuText")?.value.trim();
  const id = btn.dataset.id;
  const rec = { name, kind, sub, text };
  if (kind === "monster") {
    rec.lvl = $("#cuLvl")?.value.trim() || "1";
    rec.hp = Math.max(1, Number($("#cuHp")?.value) || 1);
    rec.speed = Math.max(0, Number($("#cuSpeed")?.value) || 6);
    rec.size = $("#cuSize")?.value || "Средний";
    rec.armor = $("#cuArmor")?.value || "none";
    rec.group = $("#cuKind")?.value.trim() || "";
  } else if (kind === "weapon") {
    rec.dice = $("#cuDice")?.value.trim() || "1d6";
    rec.stat = $("#cuStat")?.value || "";
    rec.wtype = $("#cuWtype")?.value.trim() || "";
    rec.cost = $("#cuCost")?.value.trim() || "";
    rec.props = ($("#cuProps")?.value || "").split(",").map((x) => x.trim()).filter(Boolean);
  }
  if (id) {
    const item = state.custom.find((c) => c.id === id);
    if (item) Object.keys(rec).forEach((k) => { item[k] = rec[k]; });
  } else {
    state.custom.push({ id: uid(), ...rec });
  }
  rebuildRefIndex(); save(); closeModal();
  state.ui.refType = kind === "monster" ? "monster" : kind === "weapon" ? "weapon" : "custom";
  state.ui.refSel = (kind === "monster" ? "monster:" : kind === "weapon" ? "weapon:" : "custom:") + name;
  render();
  toast("Запись сохранена");
});
reg("custom-delete", (btn) => {
  if (!confirm("Удалить эту запись?")) return;
  state.custom = state.custom.filter((c) => c.id !== btn.dataset.id);
  rebuildRefIndex(); save(); state.ui.refSel = null; closeDrawer(); render();
});

/* ---------------- Command palette ---------------- */
let paletteIdx = 0;
let paletteItems = [];

function paletteOpen() {
  const p = $("#palette");
  if (!p) return;
  p.hidden = false;
  document.body.style.overflow = "hidden";
  const inp = $("#paletteInput");
  inp.value = "";
  paletteIdx = 0;
  renderPalette("");
  setTimeout(() => inp.focus(), 30);
}
function paletteClose() {
  const p = $("#palette");
  if (!p) return;
  p.hidden = true;
  document.body.style.overflow = $("#modalRoot").hidden && $("#drawer").hidden ? "" : "hidden";
}
function openPalette() { paletteOpen(); }
reg("open-palette", () => paletteOpen());

function renderPalette(q) {
  const query = q.trim();
  const host = $("#paletteResults");
  if (!host) return;
  paletteItems = [];
  const low = norm(query);
  const mark = (text) => {
    if (!query) return esc(text);
    const i = norm(text).indexOf(low);
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + query.length)) + "</mark>" + esc(text.slice(i + query.length));
  };
  const add = (item) => { if (!query || norm(item.name + " " + (item.sub || "")).includes(low)) paletteItems.push(item); };

  ["Ширма", "Персонажи", "Кубики", "Справочник", "Бой", "Напоминания", "Заметки"].forEach((name) => {
    const tab = { "Ширма": "screen", "Персонажи": "chars", "Кубики": "dice", "Справочник": "ref", "Бой": "combat", "Напоминания": "reminders", "Заметки": "notes" }[name];
    add({ kind: "tab", name, sub: "раздел", tab });
  });
  state.chars.forEach((c) => add({ kind: "char", name: c.name, sub: charSummary(c), id: c.id }));
  state.notes.forEach((n) => add({ kind: "note", name: n.title || "Без названия", sub: "заметка · " + timeAgo(n.updated || n.created || Date.now()), id: n.id }));
  searchRefs(query, "all").slice(0, 40).forEach((e) => add({ kind: "ref", name: e.name, sub: e.sub || TYPE_LABEL[e.type], ref: e }));

  paletteItems = paletteItems.slice(0, 30);
  if (paletteIdx >= paletteItems.length) paletteIdx = 0;
  if (!paletteItems.length) {
    host.innerHTML = `<div class="palette-empty">Ничего не нашлось. Проверьте слово или добавьте свою запись в справочнике.</div>`;
    return;
  }
  host.innerHTML = paletteItems.map((it, i) => `<button class="p-result ${i === paletteIdx ? "is-active" : ""}" type="button" data-act="palette-pick" data-i="${i}">
    <div><div class="nm">${mark(it.name)}</div><div class="sub">${esc(it.sub || "")}</div></div>
    <span class="ty">${it.kind === "ref" ? TYPE_LABEL[it.ref.type] : it.kind === "char" ? "Герой" : it.kind === "note" ? "Заметка" : "Раздел"}</span>
  </button>`).join("");
}
function palettePick(i) {
  const it = paletteItems[i];
  if (!it) return;
  paletteClose();
  if (it.kind === "tab") go(it.tab);
  else if (it.kind === "char") { go("chars"); openCharSheet(it.id); }
  else if (it.kind === "note") { state.ui.noteId = it.id; go("notes"); }
  else if (it.kind === "ref") {
    if (it.ref.type === "custom") { state.ui.refSel = refKey(it.ref); go("ref"); }
    else { go("ref"); state.ui.refSel = refKey(it.ref); state.ui.refQuery = ""; render(); }
  }
}
reg("palette-pick", (btn) => palettePick(Number(btn.dataset.i)));

function initPalette() {
  const inp = $("#paletteInput");
  if (!inp) return;
  inp.addEventListener("input", () => { paletteIdx = 0; renderPalette(inp.value); });
  inp.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); paletteIdx = Math.min(paletteItems.length - 1, paletteIdx + 1); renderPalette(inp.value); }
    else if (e.key === "ArrowUp") { e.preventDefault(); paletteIdx = Math.max(0, paletteIdx - 1); renderPalette(inp.value); }
    else if (e.key === "Enter") { e.preventDefault(); palettePick(paletteIdx); }
    else if (e.key === "Escape") { paletteClose(); }
  });
}
