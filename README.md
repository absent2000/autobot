# Cars24 — новий сайт

Основний вебсайт Cars24 на Astro + React + TypeScript.

## Архітектура

- Astro — сторінки, SEO та статична збірка.
- React — інтерактивні інструменти: бюджет, VIN, фільтри.
- Supabase — дані, API, VIN/Vehicle Graph та медіа.
- GitHub — вихідний код, історія, CI.
- `main` поки зберігає старий Telegram WebApp; новий сайт розробляється у `astro-site` до контрольованого перемикання.

## Локально

```bash
npm install
npm run dev
```

Перевірка production build:

```bash
npm run build
```
