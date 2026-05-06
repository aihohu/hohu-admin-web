# Changelog

All notable changes to this project will be documented in this file.

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
