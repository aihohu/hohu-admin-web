# HoHu Admin Web

<p align="center">
  <b>AI 驱动的现代化全栈管理平台 · Web 前端</b>
</p>

<p align="center">
  <a href="https://show.hohu.org">在线演示</a> ·
  <a href="https://github.com/aihohu/hohu-admin">后端仓库</a> ·
  <a href="https://github.com/aihohu/hohu-admin-app">移动端</a> ·
  <a href="https://hohu.org/guide/introduction.html">文档</a>
</p>

<p align="center">
  <a href="./README.md">English</a>
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

## 简介

HoHu Admin 是一个 AI 驱动的现代化全栈管理平台。本仓库为 **Web 管理后台前端**，基于 Vue 3、Vite、TypeScript、NaiveUI 和 UnoCSS 构建的清新优雅的后台管理系统。

面向 AI 优先开发：标准化的 Schema、显式类型标注、对 Prompt 友好的架构，让 AI 辅助编码事半功倍。

## 特性

- **RBAC 权限** — 动态路由 + 按钮级别权限控制
- **国际化** — 内置中英文支持（Vue I18n）
- **雪花 ID** — 所有主键使用 Snowflake 算法，序列化为字符串避免 BigInt 精度丢失
- **自动命名转换** — 请求/响应拦截器自动处理 snake_case ↔ camelCase
- **基于文件的路由** — @elegant-router 根据 `src/views` 目录自动生成路由
- **UnoCSS** — 原子化 CSS 引擎，按需生成样式
- **暗黑模式** — 内置主题切换
- **Monorepo 工作区** — 共享包（@sa/axios、@sa/hooks、@sa/utils 等）
- **Docker Compose 部署** — `hohu deploy` 一键部署

## 技术栈

| 分类      | 技术                                      | 版本 |
| --------- | ----------------------------------------- | ---- |
| 框架      | Vue 3 (Composition API, `<script setup>`) | 3.5  |
| 构建工具  | Vite                                      | 7.3  |
| 语言      | TypeScript                                | 5.9  |
| UI 组件库 | NaiveUI                                   | 2.44 |
| CSS 引擎  | UnoCSS                                    | 66.6 |
| 状态管理  | Pinia                                     | 3.0  |
| 路由      | Vue Router + @elegant-router              | 5.0  |
| 国际化    | Vue I18n                                  | 11.3 |
| 图表      | ECharts                                   | 6.0  |

## 地址

| 资源   | URL                                        |
| ------ | ------------------------------------------ |
| 演示   | https://show.hohu.org (`admin` / `123456`) |
| 官网   | https://hohu.org                           |
| 后端   | https://github.com/aihohu/hohu-admin       |
| 移动端 | https://github.com/aihohu/hohu-admin-app   |
| 文档   | https://hohu.org/guide/introduction.html   |

## 项目后端

本前端配合 **[hohu-admin](https://github.com/aihohu/hohu-admin)** 使用 — 基于 FastAPI + SQLAlchemy 2.0 async + PostgreSQL + Redis + Alembic 构建的后端。

| 项目     | 值                                         |
| -------- | ------------------------------------------ |
| API 地址 | `http://127.0.0.1:8000`                    |
| API 文档 | `http://127.0.0.1:8000/docs`               |
| 响应格式 | `{ code: number, msg: string, data: any }` |
| 认证方式 | `Authorization` 请求头携带 Bearer JWT      |
| ID 格式  | Snowflake ID 序列化为**字符串**            |

## 安装依赖

```bash
# 克隆
git clone https://github.com/aihohu/hohu-admin-web.git
cd hohu-admin-web

# 安装依赖（需要 Node.js >= 20.19.0，pnpm >= 10.5.0）
pnpm install
```

或使用 HoHu CLI：

```bash
uv tool install hohu
hohu create my-project
hohu init
```

## 运行

```bash
pnpm dev          # 开发服务器 http://localhost:9527（API 代理到 :8000）
pnpm build        # 生产构建
pnpm lint         # 代码检查（oxlint + eslint）
pnpm typecheck    # TypeScript 类型检查
pnpm gen-route    # 根据 src/views 重新生成路由
```

## 许可证

[MIT](./LICENSE)
