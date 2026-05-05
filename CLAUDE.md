# CLAUDE.md

## Project Overview

Vue 3 admin dashboard (Composition API, `<script setup>`). Monorepo with workspace packages under `packages/`.

**Tech Stack:** Vue 3.5 / Vite 7 / TypeScript 5.9 / NaiveUI / UnoCSS / Pinia / Vue Router + @elegant-router / Vue I18n / ECharts

**Requirements:** pnpm >= 10.5, Node >= 20.19

## Commands

```bash
pnpm install              # Install dependencies
pnpm dev                  # Dev server (port 9527, proxies to backend :8000)
pnpm build                # Production build
pnpm lint                 # oxlint + ESLint check + fix
pnpm fmt                  # oxfmt format
pnpm typecheck            # TypeScript type check
pnpm gen-route            # Regenerate routes from src/views directory
pnpm commit / pnpm commit:zh  # Conventional commits
```

**Must run `pnpm lint && pnpm fmt` after code changes** — ensures all checks pass (consistent with git pre-commit).

## Project Structure

```
src/
├── views/<module>/index.vue   # Pages → auto-generate routes via @elegant-router
├── service/api/<module>.ts    # API request wrappers
├── typings/api/               # TypeScript types: declare namespace Api { namespace Module { ... } }
├── store/modules/             # Pinia stores
├── hooks/business/            # Business hooks
├── hooks/common/table.ts     # useNaivePaginatedTable, useTableOperate
├── hooks/common/form.ts      # useFormRules, useNaiveForm
├── locales/langs/             # i18n (zh-cn, en-us)
├── router/elegant/            # Auto-generated routes (DO NOT edit manually)
├── router/guard/              # Route guards
├── theme/                     # Theme config
├── layouts/                   # Layout components
└── styles/                    # Global CSS/SCSS

packages/                      # Monorepo workspace packages
├── @sa/axios/                 # HTTP request wrapper
├── @sa/hooks/                 # Shared Vue hooks
├── @sa/utils/                 # Shared utilities
├── @sa/color/                 # Color utilities
├── @sa/materials/             # Shared UI components
├── @sa/uno-preset/            # UnoCSS preset
├── @sa/scripts/               # Build/dev scripts
└── @sa/alova/                 # Alternative HTTP client
```

## Backend Integration

- **API base:** `http://127.0.0.1:8000` (docs at `/docs`)
- **Response:** `{code: number, msg: string, data: any}` — success code `0000`
- **Auth:** Bearer token in `Authorization` header
- **Snowflake IDs:** Always `string` type in frontend — never convert to `number`
- **Case conversion:** Backend `snake_case` ↔ Frontend `camelCase` — handled by request/response interceptors

## Key Patterns

### Adding a New Page

1. Create `src/views/<module>/index.vue`
2. Add `defineOptions({ name, meta: { title, i18nKey, icon } })` if needed
3. Run `pnpm gen-route` to regenerate route types

### Adding an API Endpoint

1. Define types in `src/typings/api/` — use `declare namespace Api { namespace Module { ... } }`
2. Create service in `src/service/api/<module>.ts` — import `request` from `@/service/request`
3. Use in component via import

### i18n Conventions

- Page text: `page.<module>.xxx` namespace (e.g., `page.ai.chat.title`)
- Common operations: reuse `common.*` (`common.edit`, `common.delete`, `common.confirm`, `common.cancel`)
- Status labels: reuse `page.system.common.status.enable/disable`
- Backend error codes: `errorCode.*` mapping (e.g., `AI_PROVIDER_NOT_FOUND`), fallback to backend `msg`
- Schema types defined in `src/typings/app.d.ts` `Schema` interface

### Table CRUD Pattern

- Reference: `views/system/role/index.vue` — TSX columns + `useNaivePaginatedTable` + `useTableOperate`
- Drawer forms: reference `role/modules/role-operate-drawer.vue`

### API Service Example

```typescript
import { request } from '@/service/request';

export function fetchList(params: Api.Module.Query) {
  return request<Api.Module.List>({ url: '/module/list', method: 'get', params });
}

export function createItem(data: Api.Module.Create) {
  return request<boolean>({ url: '/module/add', method: 'post', data });
}
```

## Common Pitfalls

1. **Snowflake ID precision:** IDs are strings — never use `.map(Number)` or type as `number`
2. **Dictionary data PK:** Use `dictCode` (not `dictDataId`) — this is the actual primary key
3. **Dictionary type PK:** `dictTypeId` must be `string` type
4. **isDefault values:** `'Y'` | `'N'` (not `0` | `1`)
5. **Batch delete:** Always pass `string[]` for Snowflake IDs
6. **Route params:** Use query params for navigation (e.g., `/dict/data?dictType=xxx`)
7. **Form validation:** Always use `$t()` for i18n in validation messages
8. **Default values:** `status: '1'` for enabled, `isDefault: 'N'` for not default
9. **Reference module:** Use role module (`src/views/system/role/`) as pattern reference
10. **API Key editing:** Leave `apiKey` field empty when editing (don't send masked value); validation not required in edit mode
11. **AI streaming:** Chat uses native `fetch` + `ReadableStream` (not axios request wrapper)
12. **Dark theme:** Custom components use `var(--n-*)` CSS variables + `html.dark` overrides

## AI Module

```
src/views/ai/chat/          # Chat page (sidebar, main, message, input)
src/views/ai/provider/      # Provider management (table + drawer)
src/store/modules/ai/       # Pinia store (conversations, messages, streaming, models)
src/service/api/ai.ts       # API wrappers
src/typings/api/ai.d.ts     # Api.Ai namespace
```

- **SSE streaming:** Native `fetch` + `ReadableStream` (not axios), POST `/ai/chat`
- **Model selection:** `GET /ai/provider/models` returns `{providerId, providerCode, providerName, model, modelId}`, grouped by provider
- **Model ID format:** `{providerCode}:{modelName}` (e.g., `openai:gpt-4o`)
- **API Key:** Backend Fernet encryption; list/edit returns masked value; leave empty in edit form to keep unchanged
- **Provider test:** `POST /ai/provider/test-model`, supports saved and unsaved providers

## Environment Variables

```bash
# .env.test
VITE_SERVICE_BASE_URL=http://127.0.0.1:8000
VITE_SERVICE_SUCCESS_CODE=0000
VITE_SERVICE_EXPIRED_TOKEN_CODES=1002
VITE_SERVICE_LOGOUT_CODES=1003
VITE_SERVICE_MODAL_LOGOUT_CODES=1004
VITE_HTTP_PROXY=N
```

## Git Workflow

- **Commit:** `pnpm commit` (English) / `pnpm commit:zh` (Chinese) — conventional commits
- **Pre-commit:** typecheck + lint auto-run
- **Branches:** `feature/*`, `fix/*`, `release/*`
