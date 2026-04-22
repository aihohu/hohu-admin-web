# hohu-admin-web

A modern admin dashboard built with Vue 3, Vite, TypeScript, NaiveUI, and UnoCSS. Part of the [HoHu](https://github.com/aihohu) admin platform, designed to work with the [FastAPI backend](https://github.com/aihohu/hohu-admin).

## Tech Stack

| Category   | Technology                                | Version |
| ---------- | ----------------------------------------- | ------- |
| Framework  | Vue 3 (Composition API, `<script setup>`) | 3.5     |
| Build Tool | Vite                                      | 7.3     |
| Language   | TypeScript                                | 5.9     |
| UI Library | NaiveUI                                   | 2.44    |
| CSS Engine | UnoCSS                                    | 66.6    |
| State      | Pinia                                     | 3.0     |
| Router     | Vue Router + @elegant-router              | 5.0     |
| i18n       | Vue I18n                                  | 11.3    |
| Charts     | ECharts                                   | 6.0     |

## Prerequisites

- **Node.js** >= 20.19.0
- **pnpm** >= 10.5.0

## Quick Start

```bash
# Clone the repository
git clone https://github.com/aihohu/hohu-admin-web.git
cd hohu-admin-web

# Install dependencies
pnpm install

# Start dev server (http://localhost:9527)
pnpm dev
```

The dev server proxies API requests to `http://127.0.0.1:8000` by default. Make sure the backend is running.

## Scripts

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `pnpm dev`        | Start dev server (test env)        |
| `pnpm dev:prod`   | Start dev server (prod env)        |
| `pnpm build`      | Production build                   |
| `pnpm build:test` | Test env build                     |
| `pnpm preview`    | Preview production build           |
| `pnpm lint`       | Lint with oxlint + eslint          |
| `pnpm typecheck`  | TypeScript type check              |
| `pnpm gen-route`  | Regenerate routes from `src/views` |
| `pnpm commit`     | Conventional commit (English)      |
| `pnpm commit:zh`  | Conventional commit (Chinese)      |

## Project Structure

```
hohu-admin-web/
├── build/                    # Vite build config & plugins
├── packages/                 # Monorepo workspace packages
│   ├── @sa/axios/           # HTTP request wrapper
│   ├── @sa/hooks/           # Vue composition hooks
│   ├── @sa/utils/           # Utility functions
│   ├── @sa/color/           # Color utilities
│   ├── @sa/materials/       # Shared UI components
│   ├── @sa/scripts/         # Build/dev scripts
│   └── @sa/uno-preset/      # UnoCSS preset
├── src/
│   ├── components/          # Global Vue components
│   ├── constants/           # App constants
│   ├── enum/                # Enum definitions
│   ├── hooks/               # Custom hooks (business & common)
│   ├── layouts/             # Layout components
│   ├── locales/             # i18n translations (zh-cn, en-us)
│   ├── router/              # Routing (elegant-router + guards)
│   ├── service/             # API service layer
│   │   ├── api/             # Endpoint definitions
│   │   └── request/         # HTTP client config
│   ├── store/               # Pinia stores (auth, app, route, tab, theme)
│   ├── styles/              # Global styles (CSS + SCSS)
│   ├── theme/               # Theme configuration
│   ├── typings/             # TypeScript type definitions
│   │   └── api/             # API response/request types
│   ├── utils/               # Utility functions
│   └── views/               # Page components
│       ├── _builtin/        # Login, 403, 404, 500, iframe
│       ├── home/            # Dashboard
│       └── system/          # System management
├── .env.test                # Test environment variables
└── .env.prod                # Production environment variables
```

## Development Guide

### Adding a New Page

1. Create `src/views/<module>/index.vue`
2. Run `pnpm gen-route` to register the route
3. Optionally add i18n keys in `src/locales/langs/`

### Adding an API Endpoint

1. Define types in `src/typings/api/`
2. Create service function in `src/service/api/`
3. Use in components via the typed `request` wrapper

### Routing

Routes are auto-generated from `src/views` directory structure by [@elegant-router](https://github.com/soybean-js/elegant-router). After adding or renaming pages, run `pnpm gen-route`.

### State Management

Pinia stores live in `src/store/modules/`. Use the composition API style (`defineStore` with setup function).

### Styling

UnoCSS utility classes are used throughout. Global SCSS variables are available via `@use "@/styles/scss/global.scss" as *;`.

## Backend Integration

| Item            | Value                                      |
| --------------- | ------------------------------------------ |
| API Base URL    | `http://127.0.0.1:8000`                    |
| API Docs        | `http://127.0.0.1:8000/docs`               |
| Response Format | `{ code: number, msg: string, data: any }` |
| Auth            | Bearer JWT in `Authorization` header       |
| IDs             | Snowflake IDs serialized as **strings**    |

The backend uses `snake_case`; the frontend uses `camelCase`. Conversion is handled automatically by request/response interceptors.

## Pre-commit Hooks

Git hooks (via `simple-git-hooks`) run automatically before each commit:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fmt`
4. `git diff --exit-code` (ensures formatted files are staged)

## License

[MIT](./LICENSE)
