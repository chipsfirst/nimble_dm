/* ================= Инициализация и системные действия ================= */
function exportData() {
  const payload = { app: "nimble-shirma", version: 1, exported: new Date().toISOString(), data: state };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "nimble-shirma-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast("Файл с данными сохранён");
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const data = parsed && parsed.data ? parsed.data : parsed;
      if (!data || typeof data !== "object") throw new Error("пустой файл");
      if (!Array.isArray(data.chars) && !Array.isArray(data.notes) && !Array.isArray(data.reminders)) throw new Error("нет знакомых разделов");
      if (!confirm("Импорт заменит текущие персонажи, бой, напоминания и заметки. Продолжить?")) return;
      state = { ...defaultState(), ...data, ui: { ...defaultState().ui, ...(data.ui || {}) } };
      rebuildRefIndex();
      save(true);
      REF_INDEX = null;
      render();
      toast("Данные импортированы");
    } catch (e) {
      toast("Не удалось прочитать файл: " + esc(e.message), "warn");
    }
  };
  reader.readAsText(file);
}

function resetAll() {
  if (!confirm("Удалить ВСЕ данные ширмы: героев, бой, напоминания и заметки? Отменить это будет нельзя.")) return;
  if (!confirm("Точно? Рекомендую сначала сделать экспорт.")) return;
  state = defaultState();
  REF_INDEX = null;
  save(true);
  closeModal(); closeDrawer(); paletteClose();
  render();
  toast("Всё сброшено");
}

reg("export-data", () => exportData());
reg("import-data", () => $("#importFile").click());
reg("print-screen", () => window.print());
reg("reset-data", () => resetAll());

function initShell() {
  document.addEventListener("click", (e) => {
    const closer = e.target.closest("[data-close-modal]");
    if (closer) { closeModal(); return; }
    const dcloser = e.target.closest("[data-close-drawer]");
    if (dcloser) { closeDrawer(); return; }
    const pcloser = e.target.closest("[data-close-palette]");
    if (pcloser) { paletteClose(); return; }
    const act = e.target.closest("[data-act]");
    if (act) {
      const fn = ACTIONS[act.dataset.act];
      if (fn) { e.preventDefault(); fn(act, e); return; }
    }
  });

  $$("#tabs .tab").forEach((tab) => tab.addEventListener("click", () => go(tab.dataset.tab)));

  const menuBtn = $("#dataMenuBtn");
  const menu = $("#dataMenu");
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".menu-wrap")) { menu.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); }
    });
    menu.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      menu.hidden = true;
      menuBtn.setAttribute("aria-expanded", "false");
      const map = { export: "export-data", import: "import-data", print: "print-screen", reset: "reset-data" };
      ACTIONS[map[btn.dataset.action]]?.();
    });
  }

  const searchTrigger = $("#searchTrigger");
  if (searchTrigger) searchTrigger.addEventListener("click", () => paletteOpen());
  const quick = $("#quickD20");
  if (quick) quick.addEventListener("click", () => {
    const res = rollFormula("1d20");
    pushRoll("d20", res);
    toast(`<b>d20:</b> ${res.total}<br><span class="dim mono small">${esc(res.detail)}</span>`);
    if (state.ui.tab === "dice" || state.ui.tab === "screen") render();
  });

  const file = $("#importFile");
  if (file) file.addEventListener("change", () => { if (file.files[0]) importData(file.files[0]); file.value = ""; });

  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable;
    if (e.key === "Escape") {
      if (!$("#palette").hidden) paletteClose();
      else if (!$("#modalRoot").hidden) closeModal();
      else if (!$("#drawer").hidden) closeDrawer();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if ($("#palette").hidden) paletteOpen(); else paletteClose();
      return;
    }
    if (!typing && e.key === "/") { e.preventDefault(); paletteOpen(); }
  });

  window.addEventListener("resize", () => { if (state.ui.tab === "screen") render(); });

  initPalette();
  render();
  updateBadges();
  setTimeout(checkReminderAlerts, 1200);
  setInterval(updateBadges, 20000);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initShell);
else initShell();
