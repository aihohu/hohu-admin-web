# Changelog

All notable changes to this project will be documented in this file.

## [v0.1.6]

### Compatibility Fixes

- Preserve unknown AI write outcomes as requiring reconciliation, including legacy and restored history. A disconnected confirmation or failed result delivery must not display an unverified failure or offer a second execution.
- Keep prepared confirmations, cancellation, preflight rejection, and conversation readiness aligned with backend durable facts. A proven rejection allows a new request without replaying the rejected operation; ambiguous outcomes remain visible for review.
- Retain safe history projection, current authorization checks, and compatibility with Backend 0.1.6 recovery semantics. Preserve the footer link attribution fix included since 0.1.5.

### Release and Maintenance

- Apply full lint, type, build, test, and coverage gates to version branches and require a same-version Backend/Web combination.
- Protect complete-version images against overwrites and resume only downstream delivery from the first successful build in the same workflow run. Keep existing series and `latest` aliases unchanged.

### Compatibility and Upgrade Notes

- Pair Web 0.1.6 with Backend 0.1.6 and use the validated `release.json` attached to the matching [Backend release](https://github.com/aihohu/hohu-admin/releases). A component announcement or matching version string alone does not qualify the product combination.
- CLI 0.1.16 uses `hohu deploy` with the [manual fixed-artifact procedure](https://github.com/aihohu/hohu-admin-docs/blob/86691fb578ed17768796d8a7c6b95957e226043c/docs/guide/operations/upgrade.md). It does not validate the product manifest or automatically stop old writers and scheduled jobs.
- Candidate installation, upgrade from the original 0.1.5 images, recovery, and cached 0.1.5 Web compatibility have been exercised on `linux/amd64`. Repeat acceptance with the final published Backend/Web digests; other platforms remain unverified until supported by their own evidence. Mobile and desktop clients are not released in this product version.
- Terminate old writers, fence stale credentials, back up database/files/keys and current revocation facts, and pause the scheduler before migration. Unknown AI outcomes must remain visible without retrying the business operation. Restoring 0.1.5 must retain its documented AI safety restriction.
- Deploy fixed digests from the verified product manifest. This release does not advance series or `latest` aliases and does not make source creation from `main` a reproducible fixed-product installation.

## [v0.1.5]

### Features

- **Tenant management** — Add tenant creation, administrator/model initialization, activation and disabling, and a dedicated AI authorization entry for initialized tenants. Hosted sign-in supports the backend's optional tenant locator and login capabilities.
- **Tenant model access** — Add model-policy management with availability, default-model selection, per-user daily quotas, and batch authorization through the tenant model catalog.
- **AI Agent administration** — Add Agent editing, Role-Agent authorization, supervisor routing choices and clarification cards, and routing-feedback views. Role authorization now shows tool permission requirements, grant status, and disabled-tool diagnostics.
- **AI-first navigation** — Use AI chat as the primary landing page when authorized, retain dashboard compatibility for existing home menus, and select accessible fallbacks when AI access is unavailable.
- **Structured AI conversations** — Embed tool cards under their owning messages, render structured results and business links, and expose conversation traces and authorized operation details. Improve Agent/model selectors, attachment chips, and routing feedback.
- **Durable confirmations** — Restore persisted prepared confirmations after refresh, separate approval/rejection from drawer visibility, and synchronize completion with committed history or safe deletion receipts. Preserve frozen targets instead of rebuilding execution arguments in the client.
- **User import/export** — Add upload, preview, confirmation, execution-result, and history flows with protected downloads and AI entry chips. Surface row errors, resource limits, and import/export status through the shared business workflow.
- **Scoped system administration** — Add authorized user-role and department-assignment flows, delegated role/department management, data-scope controls, and responsive user/role/department interfaces.
- **Grouped settings** — Add localized brand, account, language, file, agreement, and security settings, with custom parameters maintained separately. Handle revision conflicts and configured-secret states without redisplaying saved passwords.
- **Email account services** — Add system mail settings and testing, email-verified registration, password recovery, and authenticated recovery-email binding. Login and account forms follow backend capability flags, tenant selection, code expiry, and resend cooldowns.
- **Model configuration** — Restore system model management, improve Provider/model editor layout and save actions, and test saved configurations or current unsaved form values without implicitly saving drafts.

### Security and Bug Fixes

- **Session isolation** — Serialize token refresh and hosted rollback resets, remove inherited request credentials, and clear account-scoped AI, routing, and pending-operation state on logout or identity changes.
- **Authorization changes** — Fail closed when Agent/model access, tool permissions, or business scope is revoked. Keep interface visibility aligned with backend checks rather than treating hidden controls as authorization.
- **Confirmation clarity** — Localize user deletion targets, task names, cron changes, enable states, and errors. Keep technical details expandable and preserve string IDs and backend-bound values.
- **Write-result verification** — Do not report unverified AI writes as completed. Recognize audited deletion receipts after deleted targets are removed from history projections, avoiding false synchronization failures.
- **Stream and recovery state** — Isolate concurrent prepared-action recovery, reset stale resume state when conversations change, and release abandoned requests. Keep transient streaming cards separate from persisted conversation history.
- **Sensitive content** — Suppress sensitive diagnostic output and preserve safe rendering and download boundaries in chat and file management.
- **System forms and navigation** — Align user validation, assignment controls, menu translations, and grouped routes with backend contracts; stabilize router startup, dashboard fallback, and responsive action layouts.

### Deployment and Maintenance

- Add GitHub-to-Gitee source mirroring and default-branch manual test-image builds, with optional ACR synchronization and anonymous verification of matching `linux/amd64` and `linux/arm64` image digests.
- Disable shared-build provenance/SBOM attestation manifests for ACR compatibility. Keep manual test tags separate from version tags and `latest`, and run mirroring only after a successful image build.
- Keep production request-size configuration aligned with deployment upload limits, and distribute project and upstream license notices with static assets.
- Expand isolated component, store, request, permission, and browser acceptance coverage for tenant management, settings, account services, model editing, and AI confirmation workflows.

### Licensing

- Adopt Apache-2.0 as the project license starting with v0.1.5, except where otherwise noted. Previously released hohu-admin-web versions through v0.1.4 retain their original MIT license.
- Preserve the SoybeanAdmin upstream MIT license, including its original copyright attribution, in `THIRD_PARTY_NOTICES.md`.
- Include license and attribution files in production builds under `dist/licenses/`. Other dependencies retain their respective licenses.

### Upgrade Notes

- Use a backend build implementing the v0.1.5 tenant, grouped-settings, account-service, model-policy, and durable-confirmation contracts. Frontend and backend releases are independent; matching version numbers alone do not establish compatibility. Review the [backend changelog](https://github.com/aihohu/hohu-admin/blob/main/CHANGELOG.md) before deployment.
- System tenant, Agent, Provider, and model-policy management uses an ordinary default-tenant system-administrator session. The username `admin` grants no authority, and legacy platform tokens do not authorize these management APIs.
- Configure Role-Agent grants, explicit business permissions, data scope, and tenant model policies separately. Grant-status displays help identify missing configuration but do not automatically grant access or establish a user's final effective permissions.
- Backend account-service migration disables registration. Configure and verify mail delivery before enabling registration or password recovery for the required tenants; existing email addresses need verification before recovery use.
- Built-in settings now use grouped settings APIs while custom parameters remain separate. Reload a group after revision conflicts and merge changes rather than silently overwriting another administrator's values; blank password inputs retain configured secrets unless explicitly cleared.
- Fresh installations receive the reorganized default menus; incremental initialization preserves existing menu grouping, ordering, and grants. Retained Marketplace/Lowcode source or old menu entries do not mean those capabilities are supported by the current main application.
- Restoring a durable confirmation observes its state; it does not approve or replay a tool. Persisted approvals do not provide a background job queue or guarantee completion after disconnects or service restarts.

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
