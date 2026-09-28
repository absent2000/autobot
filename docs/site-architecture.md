# Архітектура нового сайту Cars24

## Ролі систем

- **GitHub** — вихідний код, історія змін, CI.
- **Astro** — маршрути, HTML, SEO, sitemap, статичні сторінки каталогу.
- **React** — тільки інтерактивні острови: бюджет, VIN, фільтри.
- **Supabase** — єдине джерело даних і контрольовані публічні API.
- **Cars24 Data Backbone** — VIN/Vehicle/Observation/Event та окремі джерельні модулі.

Фронтенд не повинен повертатися до локальних `cars.json` / `motos.json` як до джерела істини.

## Публічні маршрути MVP

- `/` — Budget Picker як головний сценарій.
- `/catalog/` — всі дозволені моделі Cars24.
- `/catalog/{type}/{make}/` — сторінка марки.
- `/catalog/{type}/{make}/{model}/` — сторінка моделі.
- `/vin/` — безкоштовний VIN decoder.
- `/journal/` — дослідження Cars24.

## Data flow

### Каталог

`catalog.* + media.* + model_decisions -> cars24-public-api -> Astro/React`

Ручний Cars24 whitelist / `catalog.model_decisions` залишається джерелом істини щодо того, що публікується.

### VIN

`browser -> cars24-vin-api -> NHTSA + Cars24 cache/log -> normalized response -> browser`

Браузер не звертається до NHTSA напряму.

### Budget Picker

Поточний шар:

`catalog.budget_examples -> cars24-public-api/budget -> BudgetPicker`

`reference_budget_usd` — історичний Cars24 орієнтир для відібраного реального лота, **не точний поточний quote і не Max Bid**.

Майбутній точний шар:

`auction price / max bid + auction fee + US inland + ocean + port + customs + certification + Cars24 fee + repair reserve -> versioned calculation -> public result`

Тарифи мають зберігатися як дані з версією, датою дії та джерелом, а не як константи у React.

## SEO

- Статичні сторінки моделей і марок.
- canonical URL.
- Schema.org для model pages / collection pages.
- `robots.txt`.
- sitemap генерується з актуального Cars24 catalog API.

## Принципи

1. Один канонічний каталог у Supabase.
2. Не дублювати бізнес-логіку у фронтенді.
3. Не показувати приблизний розрахунок як точний.
4. Кожен зовнішній/внутрішній факт повинен мати джерело або provenance.
5. Astro рендерить максимум контенту без JS; React підключається лише там, де потрібна взаємодія.
