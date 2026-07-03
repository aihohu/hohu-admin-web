# Changelog

All notable changes to this project will be documented in this file.

## [v0.1.4] (2026-07-03)

### Features

- **Marketplace UI** — Browse / detail / installed / developer upload / admin review pages with search, category filter, sort, rating, and full i18n
- **Lowcode Renderer** — `LowcodeRenderer` dispatching `TablePage` / `FormPage` / `DetailPage`; responsive grid layout; `WidgetArray` (tag-style) + `WidgetObject` (textarea + JSON validate) editors; field-type-aware async-validator declarations
- **Lowcode belongs_to Widget** — `WidgetSelectBelongsTo` for FK fields (target record lookup, size:100 cap); TablePage columns read `<key>_label` instead of raw FK id; sorter re-enabled on label columns (backend JOIN)
- **Contributes Sidebar Injection** — Marketplace apps inject menus into sidebar after login; auto-grouped under app-name parent for multi-menu apps (single-menu apps stay flat); live refresh after install / uninstall / enable / disable via `contributesStore.refresh()` + `routeStore.rebuildMenus()`
- **Table Filter & Sort** — `useTableFilters` derives filter UI from `data_schema` (string→contains, enum→eq select, number/date→gte/lte pair, array→has); `LowcodeTableSearch` collapse component; server-side sort via NaiveUI built-in sorter
- **Button-Level Permission UI** — `v-permission` directive (slot-safe via watchEffect + display:none), `hasAuth()` for TSX render, `TableHeaderOperation` `addAuth` / `deleteAuth` props; applied across system / ai / marketplace pages
- **Auth Refresh Token** — Axios interceptor refreshes expired token transparently; logout blacklist prevents reuse
- **Job Execution Controls UI** — Per-job timeout / retry / next_run_time / run_on_enable form fields
- **Department Users Modal** — Cascade dept tree in user drawer + dedicated dept users modal
- **Data Scope Demo Page** — UI with i18n and types matching backend demo seed

### Bug Fixes

- **Log Time Range** — Send ms timestamp (not ISO string) for `NDatePicker` datetimerange to match backend `LocalNaiveDatetime`
- **Menu Auth Modal** — Recompute indeterminate keys after async checks load; prevent parent menu loss on submit-without-interaction
- **Menu Operate Modal** — Disable button code editing in edit mode (code is stable business key, cascades role_menus)
- **Multi-Model Navigation** — `findFormPage` / `findListPage` match current page's model so order_list → order_form → order_list round-trip stays within the same model (was returning first form/table page)
- **App Route Layout** — `/app/:slug/:pageKey` wrapped in `BaseLayout` (was dropping sidebar/header); auth guard applies
- **Active Menu Highlight** — `selectedKey` returns route.path (not name) for app routes since contributes share the `app-lowcode` route name
- **App Navigation** — In-place `router.push` instead of new tab for trusted Phase 1 apps
- **Category/Sort Preservation** — Route keyword search through `fetchMarketplaceApps` (was switching to dedicated `/search` endpoint and dropping category/sort)
- **Install Status Query** — Pass `appSlug` to `fetchInstalledApps` (was pulling 100 records then filtering client-side)
- **Required Validation** — Declare async-validator type from schema field type so numeric `123` passes required check (was defaulting to 'string')

### Improvements

- **i18n** — `MISSING_PERMISSION`, `SUPER_ADMIN_ONLY` errorCode mappings; `rangeMin` / `rangeMax`, `msgFieldRequired`, `msgValidationFailed` form keys
- **Docker** — Pin nginx base to `1.31.2-alpine` to avoid repulling on every build
- **Cleanup** — Remove orphan `docker-compose.yml` in favor of hohu-cli deploy template

## [v0.1.3] (2026-06-11)

### Features

- **Config Export/Import UI** — Excel-based config export and import with permission control and preset button improvements
- **Operation Log Detail** — Modal to view full request parameters in operation log
- **Job Log Detail** — Modal to view job log details with dedicated view button
- **User Role Column** — Display role names in user list, add role search filter and auto-uppercase role code
- **Menu Parent Selector** — Tree-based parent menu selector in menu edit modal

### Bug Fixes

- **Dockerfile** — Fix pnpm/Node.js version compatibility (pin pnpm 11.1.3, Node 22, client_max_body_size)

### Improvements

- **Upstream Sync** — Sync SoybeanAdmin framework updates: Vite 8, TypeScript 6, UnoCSS, `moduleResolution: bundler`, oxc extension, MixMenu context key stability, mobile sider fix

## [v0.1.2] (2026-05-28)

### Features

- **AI Model Management** — Separate model CRUD with capabilities (`text`, `vision`, `image-gen`, `video`, `audio`, `embedding`), per-model base URL, sort order, and required validation
- **Image Vision in Chat** — Upload/paste/drag-drop images in AI chat, auto-send to LLM providers as base64
- **Model Selector** — Chat model dropdown grouped by provider, using Snowflake model ID
- **Provider Drawer Redesign** — Model management section with card layout, capability tags, add/edit/delete with form validation

### Bug Fixes

- **Streaming Message Parts** — Fix missing `parts` field in abort handler causing TypeScript errors
- **Unused Import** — Remove stale `AiModelOption` type and `request` import from AI store

### Improvements

- **Model API Service** — New `fetchGetAvailableModels`, `fetchGetProviderModels`, `fetchAddProviderModel`, `fetchUpdateProviderModel`, `fetchDeleteProviderModel` API wrappers
- **i18n** — Add model capability labels (文本/视觉/图片生成/视频/音频/向量), model form labels, and validation messages in zh-CN and en-US
- **Types** — New `AiModel`, `ModelCapability`, `AvailableModel`, `AiModelCreateParams`, `AiModelUpdateParams` types in `ai.d.ts`

## [v0.1.1] (2026-05-06)

### Features

- **AI Chat Module** — Chat interface with sidebar, streaming messages, model selection, and provider management
- **Scheduled Job Management** — Job CRUD, enable/disable, manual trigger, and job log viewer
- **File Management Module** — Upload component with file list CRUD
- **Data Permission Selector** — Role management drawer with data scope configuration
- **IconPicker Component** — Iconify icon selection for menu form
- **Auth Error Code i18n** — Login error messages (`UNAUTHORIZED`, `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `ACCOUNT_DISABLED`, `UNSUPPORTED_LOGIN_TYPE`) mapped via `errorCode` for localized display

### Bug Fixes

- **Fix 401 Stuck Loading** — Add HTTP 401 status fallback to prevent infinite spinner on auth failure
- **Fix Menu Edit Mode** — Resolve form bugs in menu management edit mode
- **Fix File Upload Loop** — Resolve watch loop causing list reset after upload
- **Fix Error Handling** — Improve centralized error handling and remove duplicate error toasts

### Documentation

- Rewrite README

## [v0.1.0] (2026-04-16)

### Features

- **RBAC Permissions** — Dynamic routing + button-level access control
- **User Management** — User CRUD with role assignment
- **Role Management** — Role CRUD with menu permission configuration
- **Menu Management** — Tree-based menu CRUD with route generation
- **Department Management** — Department tree with CRUD
- **Dictionary Management** — Dict type & dict data management
- **i18n** — Built-in Chinese & English support via Vue I18n
- **Dynamic Routing** — Backend-driven route generation via `@elegant-router`
- **Docker Support** — Nginx-based Docker build with CI/CD release workflow (linux/amd64 + linux/arm64)
- **Table Column Settings** — Select all, fixed columns, and viewport-aware overflow handling

### Bug Fixes

- Fix wrong new tab opening for external link navigation
- Fix NColorPicker width issue
- Fix HTML lang attribute not updating on locale change
- Fix NButton props conflicts
- Fix nginx permission errors when running as non-root user
- Simplify route guard logic

### Improvements

- Integrate oxlint and oxfmt
- Update to SoybeanAdmin v2.1.0
- Optimize token injection location
- Add `.npmrc` configuration
