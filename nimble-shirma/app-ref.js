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
    body = `${tag(r.cat)}${tag(r.cost)}${tag(r.dice + "+" + r.stat + " " + r.type, "amber")}</div>
      <dl class="kv"><dt>Урон</dt><dd>${esc(r.dice)}${r.stat ? "+" + esc(r.stat) : ""} ${esc(r.type)}</dd>
      <dt>Стоимость</dt><dd>${esc(r.cost)}</dd>
      <dt>Свойства</dt><dd>${(r.props || []).map(esc).join(", ") || "—"}</dd></dl>
      <div class="row mt-12"><button class="btn btn-sm" type="button" data-act="ref-roll" data-formula="${esc(r.dice)}" data-label="${esc(r.name)}">Бросить d${esc(r.dice.replace(/^\d*d/, ""))}</button>
      <button class="btn btn-sm" type="button" data-act="ref-attack" data-formula="${esc(r.dice + "+" + r.stat)}" data-label="${esc(r.name)}">Атака с ${STAT_SHORT[r.stat] || r.stat}</button></div>
      ${r.props && r.props.length ? `<h3>Свойства</h3>${r.props.map((p) => {
        const prop = DATA.weaponProps.find((x) => p.toLowerCase().includes(x.name.toLowerCase().slice(0, 4)));
        return `<p><b>${esc(p)}.</b> ${prop ? esc(prop.desc) : ""}</p>`;
      }).join("")}` : ""}`;
    body = `<div class="statline">${tag(r.cat)}${tag(r.cost)}${tag(r.dice + "+" + r.stat + " " + r.type, "amber")}</div>
      <dl class="kv"><dt>Урон</dt><dd>${esc(r.dice)}${r.stat ? "+" + esc(r.stat) : ""} ${esc(r.type)}</dd>
      <dt>Стоимость</dt><dd>${esc(r.cost)}</dd>
      <dt>Свойства</dt><dd>${(r.props || []).map(esc).join(", ") || "—"}</dd></dl>
      <div class="row mt-12"><button class="btn btn-sm" type="button" data-act="ref-roll" data-formula="${esc(r.dice)}" data-label="${esc(r.name)}">Бросок урона</button>
      <button class="btn btn-sm" type="button" data-act="ref-attack" data-formula="${esc(r.dice + (r.stat ? "+" + r.stat : ""))}" data-label="${esc(r.name)}">Как атаку</button></div>
      ${(r.props || []).length ? `<h3>Свойства оружия</h3>${r.props.map((p) => { const prop = DATA.weaponProps.find((x) => p.toLowerCase().startsWith(x.name.toLowerCase().slice(0, 4))); return `<p><b>${esc(p)}.</b> ${prop ? esc(prop.desc) : ""}</p>`; }).join("")}` : ""}`;
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
    const armorTxt = r.armor === "medium" ? "Средняя" : r.armor === "heavy" ? "Тяжёлая" : "Нет";
    body = `<div class="statline">${tag("Уровень " + r.lvl, "amber")}${r.hp ? tag(r.hp + " хитов", "green") : tag("Миньон", "red")}${tag(r.size)}${tag("Броня: " + armorTxt, "blue")}${tag("Скорость " + r.speed + " (" + r.mode + ")")}${tag(r.kind)}</div>
      <div class="row" style="margin-bottom:10px">
        <button class="btn btn-sm btn-primary" type="button" data-act="ref-monster" data-name="${esc(r.name)}">Добавить в бой</button>
        <button class="btn btn-sm" type="button" data-act="ref-monster-group" data-name="${esc(r.name)}" data-n="3">×3 миньона</button>
      </div>
      <h3>Действия</h3>
      ${(r.actions || []).length ? r.actions.map((a) => `<div class="action"><b>${esc(a.n)}.</b> <span class="d">${esc(a.d)}</span></div>`).join("") : `<p class="hint">Особых атак нет — действует по правилам миньонов.</p>`}
      ${(r.special || []).length ? `<h3>Особенности</h3>${r.special.map((a) => `<div class="action"><b>${esc(a.n)}.</b> <span class="d">${esc(a.d)}</span></div>`).join("")}` : ""}
      <p class="hint mt-12">${r.armor === "medium" ? "Средняя броня: игнорирует все модификаторы урона, считает только кости." : r.armor === "heavy" ? "Тяжёлая броня: берёт половину суммы костей урона (вверх)." : "Без брони: получает урон целиком."}</p>`;
  } else if (e.type === "spell") {
    const dmg = (r.text.match(/(\d*d\d+|\d+)/i) || [])[0];
    body = `<div class="statline">${tag(r.school, "violet")}${tag(r.tier ? "Тир " + r.tier : "Кантрип", "amber")}${tag(r.cast)}${r.target ? tag(r.target) : ""}</div>
      <p>${esc(r.text).replace(/\n/g, "<br>")}</p>
      <div class="row mt-12">
        <button class="btn btn-sm" type="button" data-act="ref-roll" data-formula="d20" data-label="${esc(r.name)}">d20</button>
        ${/\d*d\d+/.test(r.text) ? `<button class="btn btn-sm" type="button" data-act="ref-roll" data-formula="${esc((r.text.match(/\d*d\d+(?:\+\d+)?/) || [""])[0] || "1d6")}" data-label="${esc(r.name)}">Бросок урона</button>` : ""}
        <button class="btn btn-sm" type="button" data-act="ref-copy" data-text="${esc(r.name + ". " + r.text)}">Копировать</button>
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
    body = `<div class="statline">${tag("Своя запись", "violet")}${r.sub ? tag(r.sub) : ""}</div>
      <p>${esc(r.text || "").replace(/\n/g, "<br>")}</p>
      <div class="row mt-12"><button class="btn btn-sm" type="button" data-act="custom-edit" data-id="${esc(r.id)}">Изменить</button>
      <button class="btn btn-sm btn-danger" type="button" data-act="custom-delete" data-id="${esc(r.id)}">Удалить</button></div>`;
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
  openModal({
    title: item ? "Изменить запись" : "Своя запись",
    body: `<div class="stack">
      <div class="field"><label for="cuName">Название</label><input id="cuName" type="text" value="${esc(item?.name || "")}" placeholder="Например, «Долг крови»"></div>
      <div class="field"><label for="cuSub">Подзаголовок</label><input id="cuSub" type="text" value="${esc(item?.sub || "")}" placeholder="Правило, NPC, место, предмет…"></div>
      <div class="field"><label for="cuText">Текст</label><textarea id="cuText" rows="7" placeholder="Что нужно помнить за столом">${esc(item?.text || "")}</textarea></div>
    </div>`,
    footer: `<button class="btn" type="button" data-close-modal>Отмена</button><span class="spacer"></span><button class="btn btn-primary" type="button" data-act="custom-save" data-id="${item ? item.id : ""}">Сохранить</button>`
  });
}
reg("custom-save", (btn) => {
  const name = $("#cuName")?.value.trim();
  const sub = $("#cuSub")?.value.trim();
  const text = $("#cuText")?.value.trim();
  if (!name) { toast("Нужно название", "warn"); return; }
  const id = btn.dataset.id;
  if (id) {
    const item = state.custom.find((c) => c.id === id);
    if (item) { item.name = name; item.sub = sub; item.text = text; }
  } else {
    state.custom.push({ id: uid(), name, sub, text });
  }
  rebuildRefIndex(); save(); closeModal();
  state.ui.refType = "custom";
  state.ui.refSel = "custom:" + name;
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
