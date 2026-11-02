# Nimble — ширма мастера

Локальное одностраничное приложение для ведения игры по Nimble RPG: персонажи, кубики, справочник с бестиарием и заклинаниями, трекер боя, напоминания и заметки.

## Что где

- `index.html` — оболочка (вкладки, панели, оверлеи).
- `styles.css` — оформление и адаптив.
- `data-ru.js` — справочник, собранный из локализации `Nimble Vault RU` (461 запись).
- `tools/build-data.py` — генератор `data-ru.js` из markdown-локализации.
- `data-core.js`, `data-bestiary.js`, `data-spells.js`, `data-people.js` — прежний ручной набор, больше не подключается.
- `app-core.js` — состояние, localStorage, броски, роутер.
- `app-screen.js` — ширма и кубики.
- `app-chars.js` — персонажи, конструктор, лист.
- `app-ref.js` — справочник, записи, палитра поиска.
- `app-combat.js` — трекер боя.
- `app-extra.js` — напоминания и заметки.
- `app-init.js` — запуск, меню данных, горячие клавиши.

## Сборка и проверка

```text
multitool-node --skill websites site.cjs bundle nimble-shirma/index.html Nimble-Shirma.html
multitool-node --skill websites site.cjs check Nimble-Shirma.html
multitool-node --skill websites verify.cjs Nimble-Shirma.html --actions tools/verify-actions.json
```

Готовый файл — `../Nimble-Shirma.html`, работает офлайн, все данные хранятся в localStorage браузера.

## Горячие клавиши

- `⌘K` / `Ctrl+K` или `/` — поиск по всей ширме.
- `Esc` — закрыть поиск, окно или панель.

## Источник данных

Тексты, названия и числа взяты из markdown-локализации `Nimble Vault RU` (папка `~/Downloads/nimble-localization-main`). Обновить данные:

```text
python3 tools/build-data.py
```

Затем пересобрать HTML. Формулы с «к» автоматически переводятся в `d` для движка кубиков. Nimble RPG © Nimble Co., неофициальный перевод для личного использования.
