# HoHu Admin Web

<p align="center">
  <b>AI-driven modern full-stack admin platform · Web Frontend</b>
</p>

<p align="center">
  <a href="https://show.hohu.org">Demo</a> ·
  <a href="https://github.com/aihohu/hohu-admin">Backend</a> ·
  <a href="https://github.com/aihohu/hohu-admin-app">Mobile</a> ·
  <a href="https://hohu.org/guide/introduction.html">Docs</a>
</p>

<p align="center">
  <a href="./README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="license" />
  <img src="https://img.shields.io/badge/Vue-3.5-42b883.svg" alt="Vue" />
  <img src="https://img.shields.io/badge/Vite-7.3-646cff.svg" alt="Vite" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178c6.svg" alt="TypeScript" />
  <img src="https://img.shields.io/badge/NaiveUI-2.44-36ad6a.svg" alt="NaiveUI" />
  <img src="https://img.shields.io/badge/UnoCSS-66.6-333333.svg" alt="UnoCSS" />
  <img src="https://img.shields.io/badge/Node.js->=20-339933.svg" alt="Node.js" />
  <img src="https://img.shields.io/badge/pnpm->=10.5-F69220.svg" alt="pnpm" />
</p>

---

## Introduction

HoHu Admin is an AI-driven modern full-stack admin platform. This repository contains the **web frontend** — a fresh and elegant admin dashboard built with Vue 3, Vite, TypeScript, NaiveUI, and UnoCSS.

Designed for AI-first development: standardized schemas, explicit type hints, and prompt-friendly architecture make it easy to build features with AI-assisted coding tools.

## Features

- **RBAC Permissions** — Dynamic routing + button-level access control
- **i18n** — Built-in Chinese & English support via Vue I18n
- **Snowflake IDs** — All primary keys use Snowflake, serialized as strings to avoid BigInt precision loss
- **Auto snake_case ↔ camelCase** — Request/response interceptors handle naming conversion transparently
- **File-based Routing** — Routes auto-generated from `src/views` directory via @elegant-router
- **UnoCSS** — Atomic CSS engine for fast, on-demand styling
- **Dark Mode** — Theme switching built in
- **Monorepo Workspace** — Shared packages (@sa/axios, @sa/hooks, @sa/utils, etc.)
- **Docker Compose Deployment** — One-command deploy with `hohu deploy`

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

## Links

| Resource   | URL                                        |
| ---------- | ------------------------------------------ |
| Demo       | https://show.hohu.org (`admin` / `123456`) |
| Website    | https://hohu.org                           |
| Backend    | https://github.com/aihohu/hohu-admin       |
| Mobile App | https://github.com/aihohu/hohu-admin-app   |
| Docs       | https://hohu.org/guide/introduction.html   |

## Backend

This frontend is designed to work with **[hohu-admin](https://github.com/aihohu/hohu-admin)** — a FastAPI backend powered by SQLAlchemy 2.0 async, PostgreSQL, Redis, and Alembic.

| Item            | Value                                      |
| --------------- | ------------------------------------------ |
| API Base URL    | `http://127.0.0.1:8000`                    |
| API Docs        | `http://127.0.0.1:8000/docs`               |
| Response Format | `{ code: number, msg: string, data: any }` |
| Auth            | Bearer JWT in `Authorization` header       |
| IDs             | Snowflake IDs serialized as **strings**    |

## Install

```bash
# Clone
git clone https://github.com/aihohu/hohu-admin-web.git
cd hohu-admin-web

# Install dependencies (requires Node.js >= 20.19.0, pnpm >= 10.5.0)
pnpm install
```

Or use the HoHu CLI:

```bash
uv tool install hohu
hohu create my-project
hohu init
```

## Run

```bash
pnpm dev          # Dev server at http://localhost:9527 (proxies API to :8000)
pnpm build        # Production build
pnpm lint         # Lint (oxlint + eslint)
pnpm typecheck    # TypeScript check
pnpm gen-route    # Regenerate routes from src/views
```

## License

[MIT](./LICENSE)
