# Cars24 — новий сайт

Основний вебсайт Cars24 на Astro + React + TypeScript.

## Архітектура

- Astro — сторінки, SEO та статична збірка.
- React — інтерактивні інструменти: бюджет, VIN, фільтри.
- Supabase — дані, API, VIN / Vehicle Graph та медіа.
- GitHub — вихідний код, історія, CI та готові production-збірки.
- `main` поки зберігає старий Telegram WebApp; новий сайт розробляється у `astro-site` до контрольованого перемикання.

## Локальний запуск у Windows

Після клонування гілки `astro-site` достатньо двічі натиснути:

- `start-site.bat` — при першому запуску сам поставить залежності, запустить Astro і відкриє `http://localhost:4321` у браузері.
- `build-site.bat` — перевірить і збере production-версію в папку `dist/`.

Потрібен лише Node.js 22 LTS. Команди npm вручну вводити не потрібно.

## GitHub Actions

Кожен push у `astro-site` автоматично:

1. встановлює залежності;
2. запускає `astro check` та production build;
3. перевіряє живі Cars24 API (`health`, каталог, бюджет, VIN Graph, NHTSA);
4. якщо все успішно — зберігає готову папку `dist/` як artifact `cars24-site-dist` на 7 днів.

## Ручний режим для розробника

```bash
npm install
npm run dev
npm run build
npm run smoke
```
