/* ================= Напоминания ================= */
const REM_TEMPLATES = [
  "Концентрация: проверить при крите (СИЛ DC 10)",
  "Яд: 1d6 в начале хода",
  "Горит: 1d6 в начале хода",
  "Регенерация тролля: +10 хитов",
  "Ловушка сработает при входе",
  "Благословение: +1 к броскам",
  "Проверить реакцию «Защита»",
  "Истекает эффект заклинания"
];

function remindersView() {
  const list = state.reminders.slice().sort(reminderSort);
  const active = list.filter((r) => !r.done);
  return `<div class="page-head">
    <div><p class="eyebrow">Память мастера</p><h1 class="page-title">Напоминания</h1>
      <p class="page-sub">Таймеры, эффекты по раундам и просто «не забыть». Просроченные подсвечиваются и всплывают уведомлением.</p></div>
    <div class="head-actions"><button class="btn btn-primary" type="button" data-act="rem-new"><svg class="ico"><use href="#i-plus"/></svg>Напоминание</button></div>
  </div>
  <div class="rem-layout">
    <section class="card card-flush">
      <div class="card-head"><h2>Список</h2><span class="count">${active.length} активных</span>
        ${state.reminders.some((r) => r.done) ? `<button class="card-link" type="button" data-act="rem-clear-done">убрать выполненные</button>` : ""}
      </div>
      ${list.length ? `<div class="rem-list">${list.map((r) => {
        const due = !r.done && isReminderDue(r);
        return `<div class="reminder ${due ? "overdue" : ""} ${r.done ? "done" : ""}">
          <button class="rem-check" type="button" data-act="rem-done" data-id="${r.id}" aria-label="Отметить выполненным"><svg class="ico"><use href="#i-check"/></svg></button>
          <div class="rem-main">
            <div class="rem-text">${esc(r.text)}</div>
            <div class="rem-meta">
              <span class="rem-time ${due ? "overdue" : ""}">${esc(reminderLabel(r))}</span>
              ${r.mode === "time" && r.due ? `<span>· ${fmtDateTime(r.due)}</span>` : ""}
              ${r.mode === "round" ? `<span>· раунд ${state.combat.round}${state.combat.active ? "" : " (бой не идёт)"}</span>` : ""}
            </div>
          </div>
          <div class="rem-actions">
            <button class="icon-btn" type="button" data-act="rem-edit" data-id="${r.id}" title="Изменить"><svg class="ico"><use href="#i-edit"/></svg></button>
            <button class="icon-btn danger" type="button" data-act="rem-delete" data-id="${r.id}" title="Удалить"><svg class="ico"><use href="#i-close"/></svg></button>
          </div>
        </div>`;
      }).join("")}</div>` : `<div class="empty" style="padding:34px 20px"><svg class="ico"><use href="#i-bell"/></svg><p>Память чиста. Начните с шаблона — или добавьте свой таймер.</p></div>`}
    </section>

    <div class="stack">
      <section class="card">
        <div class="card-head"><h2>Быстрые шаблоны</h2><span class="count">1 клик</span></div>
        <div class="card-body"><div class="chips">${REM_TEMPLATES.map((t) => `<button class="chip" type="button" data-act="rem-template" data-text="${esc(t)}">${esc(t)}</button>`).join("")}</div>
          <p class="hint">Шаблон добавит напоминание «вручную» — отметьте его, когда сработает.</p>
        </div>
      </section>
      <section class="card">
        <div class="card-head"><h2>Эффекты по раундам</h2><span class="count">бой</span></div>
        <div class="card-body">
          <p class="small muted" style="margin-top:0">Напоминание «каждые N раундов» всплывает в начале раунда N, 2N, 3N… Удобно для яда, регенерации и горящих.</p>
          <button class="btn btn-sm" type="button" data-act="rem-new" data-mode="round">Добавить эффект</button>
        </div>
      </section>
    </div>
  </div>`;
}
registerView("reminders", remindersView);

function reminderForm(existing, presetMode) {
  const r = existing || { mode: presetMode || "time", text: "", due: null, every: 3 };
  const localDate = (ts) => {
    const d = ts ? new Date(ts) : new Date(Date.now() + 30 * 60000);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  openModal({
    title: existing ? "Изменить напоминание" : "Новое напоминание",
    body: `<div class="stack">
      <div class="field"><label for="remText">Что не забыть</label><input id="remText" type="text" value="${esc(r.text || "")}" placeholder="Например: «Культист держит концентрацию»"></div>
      <div class="field"><span class="field-label">Когда</span>
        <div class="chips">
          <button class="chip ${r.mode === "time" ? "is-active" : ""}" type="button" data-act="rem-mode" data-mode="time">Таймер</button>
          <button class="chip ${r.mode === "round" ? "is-active" : ""}" type="button" data-act="rem-mode" data-mode="round">По раундам</button>
          <button class="chip ${r.mode === "manual" ? "is-active" : ""}" type="button" data-act="rem-mode" data-mode="manual">Вручную</button>
        </div>
      </div>
      <div class="field" id="remTimeField" ${r.mode !== "time" ? 'style="display:none"' : ""}>
        <label for="remDue">Время</label><input id="remDue" type="datetime-local" value="${localDate(r.due)}">
      </div>
      <div class="field" id="remRoundField" ${r.mode !== "round" ? 'style="display:none"' : ""}>
        <label for="remEvery">Каждые N раундов</label><input id="remEvery" type="number" min="1" max="20" value="${r.every || 3}">
        <p class="hint">Например, «яд» каждые 1 раунд или «регенерация» каждые 2.</p>
      </div>
    </div>`,
    footer: `<button class="btn" type="button" data-close-modal>Отмена</button><span class="spacer"></span><button class="btn btn-primary" type="button" data-act="rem-save" data-id="${existing ? existing.id : ""}" data-mode="${r.mode}">Сохранить</button>`
  });
}

let remDraftMode = "time";
reg("rem-new", () => { remDraftMode = "time"; reminderForm(null, "time"); });
reg("rem-mode", (btn) => {
  remDraftMode = btn.dataset.mode;
  $$("[data-act='rem-mode']").forEach((b) => b.classList.toggle("is-active", b.dataset.mode === remDraftMode));
  const tf = $("#remTimeField"), rf = $("#remRoundField");
  if (tf) tf.style.display = remDraftMode === "time" ? "" : "none";
  if (rf) rf.style.display = remDraftMode === "round" ? "" : "none";
  const saveBtn = $("[data-act='rem-save']");
  if (saveBtn) saveBtn.dataset.mode = remDraftMode;
});
reg("rem-save", (btn) => {
  const text = $("#remText")?.value.trim();
  if (!text) { toast("Напишите, что напомнить", "warn"); return; }
  const mode = btn.dataset.mode || remDraftMode;
  const dueVal = $("#remDue")?.value;
  const every = Math.max(1, Number($("#remEvery")?.value) || 1);
  const id = btn.dataset.id;
  const item = id ? state.reminders.find((r) => r.id === id) : null;
  const patch = {
    text, mode,
    due: mode === "time" ? (dueVal ? new Date(dueVal).getTime() : Date.now() + 1800000) : null,
    every: mode === "round" ? every : null,
    notified: false, done: false
  };
  if (item) Object.assign(item, patch);
  else state.reminders.push({ id: uid(), created: Date.now(), ...patch });
  save(); closeModal(); render();
  toast("Напоминание сохранено");
});
reg("rem-template", (btn) => {
  state.reminders.push({ id: uid(), text: btn.dataset.text, mode: "manual", done: false, created: Date.now(), notified: false });
  save(); render(); toast("Добавлено");
});
reg("rem-done", (btn) => {
  const r = state.reminders.find((x) => x.id === btn.dataset.id);
  if (!r) return;
  r.done = !r.done;
  save(); render();
});
reg("rem-delete", (btn) => {
  state.reminders = state.reminders.filter((r) => r.id !== btn.dataset.id);
  save(); render();
});
reg("rem-edit", (btn) => {
  const r = state.reminders.find((x) => x.id === btn.dataset.id);
  if (!r) return;
  remDraftMode = r.mode;
  reminderForm(r);
});
reg("rem-clear-done", () => { state.reminders = state.reminders.filter((r) => !r.done); save(); render(); });

function checkReminderAlerts() {
  let changed = false;
  state.reminders.forEach((r) => {
    if (r.done || r.mode !== "time" || !r.due) return;
    if (Number(r.due) <= Date.now() && !r.notified) {
      r.notified = true; changed = true;
      toast(`<b>Напоминание:</b> ${esc(r.text)}`);
    }
  });
  if (changed) { save(); if (state.ui.tab === "reminders" || state.ui.tab === "screen") render(); }
  else updateBadges();
}
function checkRoundReminders() {
  if (!state.combat.active) return;
  state.reminders.forEach((r) => {
    if (r.done || r.mode !== "round") return;
    const every = Number(r.every) || 1;
    if (state.combat.round % every === 0 && r.lastRound !== state.combat.round) {
      r.lastRound = state.combat.round;
      toast(`<b>Раунд ${state.combat.round}:</b> ${esc(r.text)}`);
    }
  });
  save();
}
setInterval(checkReminderAlerts, 15000);

/* ================= Заметки ================= */
function noteById(id) { return state.notes.find((n) => n.id === id); }
function noteExcerpt(n) { return (n.plain || "").replace(/\s+/g, " ").trim().slice(0, 80); }

function notesView() {
  const sorted = state.notes.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const q = norm(state.ui.noteQuery || "");
  const filtered = q ? sorted.filter((n) => norm((n.title || "") + " " + (n.plain || "")).includes(q)) : sorted;
  if (!state.ui.noteId && filtered.length) state.ui.noteId = filtered[0].id;
  const note = noteById(state.ui.noteId);
  return `<div class="page-head">
    <div><p class="eyebrow">Сюжет и память</p><h1 class="page-title">Заметки</h1>
      <p class="page-sub">Редактор с форматированием, автосохранением и поиском. Всё лежит в этом браузере.</p></div>
    <div class="head-actions"><button class="btn btn-primary" type="button" data-act="new-note"><svg class="ico"><use href="#i-plus"/></svg>Новая заметка</button></div>
  </div>
  <div class="notes-layout">
    <section class="card notes-side">
      <div class="notes-search"><div class="searchbar"><svg class="ico"><use href="#i-search"/></svg><input type="search" id="noteSearch" aria-label="Поиск по заметкам" placeholder="Поиск по заметкам" value="${esc(state.ui.noteQuery || "")}"></div></div>
      <div class="notes-list">
        ${filtered.length ? filtered.map((n) => `<button class="note-item ${n.id === state.ui.noteId ? "is-active" : ""}" type="button" data-act="note-select" data-id="${n.id}">
          <b>${esc(n.title || "Без названия")}</b>
          <span>${esc(noteExcerpt(n) || "Пустая заметка")}</span>
          <time>${fmtDate(n.updated || n.created || Date.now())}</time>
        </button>`).join("") : `<div class="empty" style="padding:22px"><p>${q ? "Ничего не найдено" : "Заметок нет"}</p></div>`}
      </div>
    </section>

    ${note ? `<section class="card editor">
      <div class="editor-head">
        <input class="editor-title" id="noteTitle" type="text" placeholder="Заголовок" value="${esc(note.title || "")}" aria-label="Заголовок заметки">
        <button class="icon-btn" type="button" data-act="note-download" data-id="${note.id}" title="Скачать .md"><svg class="ico"><use href="#i-note"/></svg></button>
        <button class="icon-btn danger" type="button" data-act="note-delete" data-id="${note.id}" title="Удалить"><svg class="ico"><use href="#i-trash"/></svg></button>
      </div>
      <div class="editor-tools" role="toolbar" aria-label="Форматирование">
        <button class="tool" type="button" data-cmd="bold" title="Жирный (⌘B)"><b>B</b></button>
        <button class="tool" type="button" data-cmd="italic" title="Курсив"><i>I</i></button>
        <button class="tool" type="button" data-cmd="underline" title="Подчёркнутый"><u>U</u></button>
        <span class="tool-sep"></span>
        <button class="tool" type="button" data-cmd="h2" title="Заголовок">H2</button>
        <button class="tool" type="button" data-cmd="h3" title="Подзаголовок">H3</button>
        <button class="tool" type="button" data-cmd="p" title="Обычный текст">¶</button>
        <span class="tool-sep"></span>
        <button class="tool" type="button" data-cmd="ul" title="Список">•</button>
        <button class="tool" type="button" data-cmd="ol" title="Нумерованный список">1.</button>
        <button class="tool" type="button" data-cmd="quote" title="Цитата">❝</button>
        <span class="tool-sep"></span>
        <button class="tool" type="button" data-cmd="removeFormat" title="Убрать формат">⌫</button>
        <button class="tool" type="button" data-cmd="undo" title="Отменить">↺</button>
        <button class="tool" type="button" data-cmd="redo" title="Вернуть">↻</button>
      </div>
      <div class="note-body" id="noteBody" contenteditable="true" spellcheck="true" data-placeholder="Пишите сцену, NPC, тайну или обещание игрокам…">${note.html || ""}</div>
      <div class="editor-foot">
        <span id="noteWords">${countWords(note.plain)}</span>
        <span class="dim">символов: ${(note.plain || "").length}</span>
        <span class="saved" id="noteSaved">сохранено</span>
      </div>
    </section>` : `<section class="card"><div class="empty" style="padding:60px 20px">
      <svg class="ico" style="width:32px;height:32px"><use href="#i-note"/></svg>
      <p>Здесь можно писать сцены, портреты NPC и планы. Форматирование — как в обычном редакторе.</p>
      <button class="btn btn-primary" type="button" data-act="new-note">Создать заметку</button>
    </div></section>`}
  </div>`;
}
registerView("notes", notesView);

function countWords(text) {
  const t = String(text || "").trim();
  if (!t) return "0 слов";
  const n = t.split(/\s+/).length;
  return n + " " + plural(n, "слово", "слова", "слов");
}

let noteSaveTimer = null;
function saveNoteFromDom() {
  const note = noteById(state.ui.noteId);
  const body = $("#noteBody");
  const titleEl = $("#noteTitle");
  if (!note || !body) return;
  note.html = body.innerHTML;
  note.plain = body.innerText || "";
  note.title = titleEl ? titleEl.value : note.title;
  note.updated = Date.now();
  const words = $("#noteWords");
  if (words) words.textContent = countWords(note.plain);
  const saved = $("#noteSaved");
  if (saved) saved.textContent = "сохранено " + fmtTimeShort(Date.now());
  save();
}
function scheduleNoteSave() {
  const saved = $("#noteSaved");
  if (saved) saved.textContent = "сохраняю…";
  clearTimeout(noteSaveTimer);
  noteSaveTimer = setTimeout(saveNoteFromDom, 600);
}

onBind("notes", () => {
  const body = $("#noteBody");
  const title = $("#noteTitle");
  const search = $("#noteSearch");
  if (search) {
    search.addEventListener("input", () => {
      state.ui.noteQuery = search.value;
      saveNoteFromDom();
      render();
      const again = $("#noteSearch");
      if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
    });
  }
  if (body) {
    body.addEventListener("input", scheduleNoteSave);
    body.addEventListener("blur", saveNoteFromDom);
    body.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text/plain");
      document.execCommand("insertText", false, text);
    });
    body.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") { e.preventDefault(); document.execCommand("bold"); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") { e.preventDefault(); document.execCommand("italic"); }
    });
  }
  if (title) title.addEventListener("input", scheduleNoteSave);

  $$("[data-cmd]").forEach((btn) => {
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    btn.addEventListener("click", () => {
      const cmd = btn.dataset.cmd;
      const map = { h2: "formatBlock", h3: "formatBlock", p: "formatBlock", quote: "formatBlock", ul: "insertUnorderedList", ol: "insertOrderedList" };
      body?.focus();
      if (cmd === "h2") document.execCommand("formatBlock", false, "<h2>");
      else if (cmd === "h3") document.execCommand("formatBlock", false, "<h3>");
      else if (cmd === "p") document.execCommand("formatBlock", false, "<p>");
      else if (cmd === "quote") document.execCommand("formatBlock", false, "<blockquote>");
      else if (cmd === "ul" || cmd === "ol") document.execCommand(map[cmd], false);
      else document.execCommand(cmd, false);
      scheduleNoteSave();
    });
  });
});

reg("new-note", () => {
  saveNoteFromDom();
  const note = { id: uid(), title: "", html: "", plain: "", created: Date.now(), updated: Date.now() };
  state.notes.push(note);
  state.ui.noteId = note.id;
  save(); go("notes");
  setTimeout(() => $("#noteTitle")?.focus(), 120);
});
reg("note-select", (btn) => {
  saveNoteFromDom();
  state.ui.noteId = btn.dataset.id;
  save(); render();
});
reg("open-note", (btn) => { state.ui.noteId = btn.dataset.id; go("notes"); });
reg("note-delete", (btn) => {
  const note = noteById(btn.dataset.id);
  if (!note) return;
  if (!confirm(`Удалить заметку «${note.title || "Без названия"}»?`)) return;
  state.notes = state.notes.filter((n) => n.id !== note.id);
  state.ui.noteId = state.notes[0]?.id || null;
  save(); render(); toast("Заметка удалена");
});
reg("note-download", (btn) => {
  const note = noteById(btn.dataset.id);
  if (!note) return;
  saveNoteFromDom();
  const md = `# ${note.title || "Заметка"}\n\n` + (note.plain || "");
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (note.title || "note").replace(/[\\/:*?"<>|]/g, "-") + ".md";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});
