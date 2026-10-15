# HoHu Admin Web

<p align="center">
  <b>AI-native enterprise application platform · Web frontend</b>
</p>

<p align="center">
  <a href="https://hohu.org/">Website</a> ·
  <a href="https://show.hohu.org">Live demo</a> ·
  <a href="https://hohu.org/guide/user/">User guide</a> ·
  <a href="https://hohu.org/guide/development/">Developer guide</a>
</p>

<p align="center">
  English · <a href="./README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-Apache--2.0-green.svg" alt="Apache License 2.0" />
  <img src="https://img.shields.io/badge/Vue-3-42b883.svg" alt="Vue 3" />
  <img src="https://img.shields.io/badge/Vite-646cff.svg" alt="Vite" />
  <img src="https://img.shields.io/badge/TypeScript-3178c6.svg" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Naive_UI-36ad6a.svg" alt="Naive UI" />
  <img src="https://img.shields.io/badge/UnoCSS-333333.svg" alt="UnoCSS" />
  <img src="https://img.shields.io/github/stars/aihohu/hohu-admin-web" alt="GitHub stars" />
</p>

**HoHu is an AI-native enterprise application platform for building business applications and completing work through application interfaces and AI assistants.**

This repository provides HoHu's Vue 3 Web frontend, including application AI assistants, business pages, member and permission management, system settings, themes, and language switching. It works with the [hohu-admin backend](https://github.com/aihohu/hohu-admin), which handles business data, authentication, authorization, and model calls.

## Core capabilities

- **Application AI assistants**: Streaming answers, conversation history, tool results, and operation confirmations, backed by server permissions and model configuration.
- **AI-assisted development**: HoHu Skills guide coding assistants through pages, APIs, permissions, and business modules using project conventions.
- **Access and administration**: Dynamic menus, routes, and button permissions, plus pages for users, roles, departments, dictionaries, settings, and jobs. The backend enforces operation and data access controls.
- **Themes and languages**: Light and dark themes, layout settings, and Chinese and English interfaces. Pages reuse Naive UI, UnoCSS, and existing theme variables.
- **Typed integration**: Shared requests, authentication, and error handling with centralized API types. Snowflake IDs are received and passed as strings.
- **Development tools**: Directory-based route generation, Pinia state management, shared workspace packages, type checks, unit tests, and end-to-end test commands.

## Quick start

Full application development requires Git, Python 3.12+, uv, Node.js, pnpm, and reachable PostgreSQL and Redis services. Follow the [development setup guide](https://hohu.org/guide/quick-start.html); see [install Skills](https://hohu.org/guide/cli/skills.html) for the Skills installer's Node.js requirements.

Install HoHu CLI first:

```bash
uv tool install hohu
hohu --version
```

### Create and develop with AI

Run this in the parent workspace where you plan to create the project:

```bash
npx skills@latest add aihohu/hohu-skills
```

Select `hohu-project`, `hohu-business-module`, and your coding assistant, such as Claude Code, Cursor, or Codex. Reopen the assistant, verify that the Skills are available, and ask:

> Use hohu-project to create my-project with Backend and Web only. Check the development environment and database configuration, initialize and start the project, and report the URLs and verification results.

For an existing project, install and use Skills from the common Backend/Web root. Once it is running, describe a business feature:

> Use hohu-business-module to build an equipment lending module with a list, filters, borrowing, and returns. Ordinary users may only view and return their own loans, and equipment cannot be borrowed twice at the same time. Implement matching backend APIs, permissions, Web pages, AI queries, and borrowing with confirmation. Verify loading, empty and error states, light and dark themes, and Chinese and English interfaces.

Equipment lending is a development example to implement. Skills provide workflows, not dependency installation or service configuration. Application AI and coding-assistant models are configured separately. See [AI-assisted development](https://hohu.org/guide/ai-coding.html) for the full workflow.

### Create a project with CLI

Select **Backend** and **Frontend** in the creation wizard:

```bash
hohu create my-project
cd my-project
hohu init
hohu dev
```

`hohu init` installs selected component dependencies, prepares backend configuration, runs migrations, and synchronizes built-in data. If the first run fails to connect, update PostgreSQL and Redis connections in the backend `.env` and run `hohu init` again, preserving existing secrets and passwords.

The default Web address is <http://localhost:9527> and the backend is <http://127.0.0.1:8000>; use terminal output if ports differ. For first sign-in, use `admin` and `HOHU_ADMIN_PASSWORD` from the backend `.env`. Existing accounts use their current passwords. See [AI configuration and operations](https://hohu.org/guide/operations/ai.html) for providers, models, and authorization.

### Run Web independently

If a working backend is already available, clone this repository to develop the frontend independently. Use Node.js and pnpm versions compatible with current dependencies; see [package.json](./package.json) for constraints and [Dockerfile](./Dockerfile) for the container build environment. This repository uses pnpm workspaces; do not mix npm or Yarn dependency installation.

```bash
git clone https://github.com/aihohu/hohu-admin-web.git
cd hohu-admin-web
pnpm install --frozen-lockfile
pnpm dev
```

This starts Web only, without creating backend databases or accounts. `pnpm dev` uses `test` mode and reads `.env` and `.env.test`. Put local overrides in the uncommitted `.env.test.local`:

```dotenv
VITE_SERVICE_BASE_URL=http://127.0.0.1:8000
VITE_HTTP_PROXY=Y
```

Restart the development server after changes. With proxying enabled, browser requests to `/proxy-default` are forwarded by Vite to the backend; this is expected. A visible login page does not prove backend connectivity. Verify sign-in and a permission-protected data request.

## Build and deployment

```bash
pnpm build
```

Production builds use `prod` mode and write to `dist/`. The current `.env.prod` API base is `/api`, which needs a reverse proxy to the backend. `VITE_HTTP_PROXY` controls development proxying only. `VITE_*` variables are public client configuration; do not store model keys, database passwords, or other server credentials in them. Rebuild after changing build-time variables.

| Scenario                    | Setup                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full application deployment | Use HoHu CLI and Docker Compose; follow the [deployment guide](https://hohu.org/guide/deploy.html) for versions, access ports, storage, and HTTPS       |
| Custom Web image            | See Dockerfile; runtime Nginx uses API_URL for backend forwarding and requires a trailing `/`, as shown in [nginx.conf.template](./nginx.conf.template) |
| Hosting dist                | Serve the dist contents, proxy `/api/`, and fall back to `/index.html` for the default history routing                                                  |
| Local preview               | `pnpm preview` defaults to port 9725 and serves static output without the development API proxy                                                         |

Before launch, verify deep-link refreshes, sign-in, file operations, and AI streaming. See [upgrade, backup, and recovery](https://hohu.org/guide/operations/upgrade.html) for upgrades.

## Technology and related projects

| Layer                           | Technologies                                       |
| ------------------------------- | -------------------------------------------------- |
| Pages and language              | Vue 3 Composition API, TypeScript                  |
| Build                           | Vite, pnpm workspace                               |
| Components and styles           | Naive UI, UnoCSS, SCSS                             |
| State and routing               | Pinia, Vue Router, @elegant-router                 |
| Internationalization and charts | Vue I18n, ECharts                                  |
| Checks and tests                | Oxlint, ESLint, Oxfmt, vue-tsc, Vitest, Playwright |

See [package.json](./package.json) and [pnpm-lock.yaml](./pnpm-lock.yaml) for exact dependency versions. Related components are maintained separately:

| Project                                                            | Purpose                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------- |
| [hohu-admin](https://github.com/aihohu/hohu-admin)                 | FastAPI backend and business services                         |
| [hohu-admin-app](https://github.com/aihohu/hohu-admin-app)         | uni-app mobile application and mini-program                   |
| [hohu-admin-desktop](https://github.com/aihohu/hohu-admin-desktop) | Electron desktop client                                       |
| [hohu-cli](https://github.com/aihohu/hohu-cli)                     | Project creation, initialization, development, and deployment |
| [hohu-skills](https://github.com/aihohu/hohu-skills)               | Skills for project creation and business module development   |
| [hohu-admin-docs](https://github.com/aihohu/hohu-admin-docs)       | Website and bilingual documentation                           |

## Development and contributions

Use Composition API with `<script setup lang="ts">`. Pages live in `src/views/`, requests in `src/service/api/`, API types in `src/typings/api/`, and translated interface text in `src/locales/`. Reuse the shared request layer for authentication, refresh, and errors rather than adding page-specific clients.

During development, `@elegant-router` generates routes automatically. Use `pnpm gen-route` only when the dev server is stopped, pregeneration is needed, or routes are out of sync. Generating a frontend route does not create a backend menu or grant access. See [Web pages and requests](https://hohu.org/guide/development/web.html) and [add a module](https://hohu.org/guide/development/module.html).

| Command              | Purpose                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm typecheck`     | TypeScript and Vue type checks                                                                                                       |
| `pnpm lint`          | Oxlint and ESLint checks, including automatic fixes                                                                                  |
| `pnpm fmt`           | Format files                                                                                                                         |
| `pnpm test`          | Vitest unit tests                                                                                                                    |
| `pnpm test:coverage` | Unit tests with coverage                                                                                                             |
| `pnpm e2e`           | Playwright end-to-end tests; prepare the environment using the [verification guide](https://hohu.org/guide/development/testing.html) |

Read the [contribution guide](./CONTRIBUTING.md) before submitting changes and review formatting and automatic fixes. Issue reports should include versions, reproduction steps, and redacted information without tokens or real business data.

## License

[Apache License 2.0](./LICENSE) &copy; HoHu, except where otherwise noted.

This project includes code derived from SoybeanAdmin, retaining its applicable MIT license and copyright notices. See [NOTICE](./NOTICE) and [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for historical licensing and third-party scope.
