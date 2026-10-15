# HoHu Admin Web

<p align="center">
  <b>企业 AI 原生应用平台 · Web 前端</b>
</p>

<p align="center">
  <a href="https://hohu.org/zh/">官网</a> ·
  <a href="https://show.hohu.org">在线体验</a> ·
  <a href="https://hohu.org/zh/guide/user/">使用文档</a> ·
  <a href="https://hohu.org/zh/guide/development/">开发指南</a>
</p>

<p align="center">
  简体中文 · <a href="./README.md">English</a>
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

**HoHu 是企业 AI 原生应用平台，帮助开发者构建业务应用，让用户通过业务界面与 AI 助手完成工作。**

本仓库提供 HoHu 的 Vue 3 Web 前端，包含应用内 AI 助手、业务页面、成员与权限管理、系统设置，以及主题和语言切换。配合 [hohu-admin 后端](https://github.com/aihohu/hohu-admin)使用，业务数据、身份认证、权限校验和模型调用由后端处理。

## 核心能力

- **应用内 AI 助手**：流式回答、会话历史、工具结果展示和操作确认，配合后端授权与模型配置使用。
- **AI 辅助开发**：通过 HoHu Skills，让编程助手按项目约定开发页面、接口、权限和业务模块。
- **权限与管理界面**：动态菜单、路由与按钮权限，以及用户、角色、部门、字典、设置和任务管理页面；后端继续校验操作与数据范围。
- **主题与国际化**：明暗主题、布局配置和中英文界面，页面开发复用 Naive UI、UnoCSS 与现有主题变量。
- **类型化业务接入**：统一请求、认证与错误处理，集中维护 API 类型；Snowflake ID 以字符串接收和传递。
- **开发工具**：基于目录生成路由、Pinia 状态管理、共享 workspace 包，以及类型检查、单元测试和端到端测试入口。

## 快速开始

开发完整应用需要 Git、Python 3.12+、uv、Node.js、pnpm，以及可连接的 PostgreSQL 和 Redis。按[开发环境指南](https://hohu.org/zh/guide/quick-start.html)准备环境；Skills 安装器的 Node.js 要求见[安装 Skills](https://hohu.org/zh/guide/cli/skills.html)。

先安装 HoHu CLI：

```bash
uv tool install hohu
hohu --version
```

### 通过 AI 创建与开发

在准备创建项目的父工作区执行：

```bash
npx skills@latest add aihohu/hohu-skills
```

选择 `hohu-project`、`hohu-business-module` 和你的编程助手，例如 Claude Code、Cursor 或 Codex。重新打开助手并确认 Skills 可用，再提出：

> 使用 hohu-project 创建 my-project，只需要 Backend 和 Web。检查开发环境与数据库配置，初始化并启动项目，给出访问地址和验证结果。

已有项目时，在 Backend/Web 的共同根目录安装并使用 Skills。项目运行后，可以继续提出业务需求：

> 使用 hohu-business-module 开发设备借用模块，包含列表、筛选、借用和归还。普通用户只能查看和归还自己的记录，同一设备不能重复借用。同步后端接口、权限、Web 页面和 AI 查询及确认后借用，验证加载、空数据、失败、明暗主题和中英文界面。

设备借用是需要实现的开发示例。Skills 提供工作流，不代替依赖安装和服务配置；应用内 AI 与编程助手的模型分别配置。完整流程见 [AI 辅助开发](https://hohu.org/zh/guide/ai-coding.html)。

### 通过 CLI 创建项目

按创建向导选择 **Backend** 和 **Frontend**：

```bash
hohu create my-project
cd my-project
hohu init
hohu dev
```

`hohu init` 安装所选组件依赖、准备后端配置并执行迁移与基础数据同步。首次运行若连接失败，修改后端 `.env` 中的 PostgreSQL、Redis 连接，再运行 `hohu init`，保留已有密钥与密码。

默认 Web 地址为 <http://localhost:9527>，后端为 <http://127.0.0.1:8000>；端口变化时以终端输出为准。首次登录使用 `admin` 和后端 `.env` 中的 `HOHU_ADMIN_PASSWORD`；已有账号使用当前密码。应用内 AI 的提供商、模型和授权见 [AI 配置与运维](https://hohu.org/zh/guide/operations/ai.html)。

### 单独运行 Web

已有可用后端，只需开发前端时，可单独克隆本仓库。使用兼容当前依赖的 Node.js 和 pnpm，版本约束见 [package.json](./package.json)，容器构建环境见 [Dockerfile](./Dockerfile)；本仓库使用 pnpm workspace，不混用 npm 或 Yarn 安装依赖。

```bash
git clone https://github.com/aihohu/hohu-admin-web.git
cd hohu-admin-web
pnpm install --frozen-lockfile
pnpm dev
```

这条路径只启动 Web，不创建后端数据库或账号。`pnpm dev` 使用 `test` 模式，读取 `.env` 和 `.env.test`；本机配置可写入不提交的 `.env.test.local`：

```dotenv
VITE_SERVICE_BASE_URL=http://127.0.0.1:8000
VITE_HTTP_PROXY=Y
```

修改后重启开发服务。启用代理时，浏览器的 `/proxy-default` 请求由 Vite 转发到后端，属于正常路径。登录页能打开不代表后端连接成功，还需验证登录和受权限保护的数据请求。

## 构建与部署

```bash
pnpm build
```

生产构建使用 `prod` 模式，产物位于 `dist/`。当前 `.env.prod` 的 API 基地址为 `/api`，部署时需要反向代理到后端；`VITE_HTTP_PROXY` 只控制开发代理。`VITE_*` 是客户端公开配置，不放模型密钥、数据库密码或其他服务端凭据。修改构建变量后需要重新构建。

| 场景            | 说明                                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 全栈部署        | 使用 HoHu CLI 与 Docker Compose，按[部署指南](https://hohu.org/zh/guide/deploy.html)配置版本、访问端口、存储和 HTTPS    |
| 自定义 Web 镜像 | 参考 Dockerfile；运行时 Nginx 使用 API_URL 转发后端，地址需以 `/` 结尾，见 [nginx.conf.template](./nginx.conf.template) |
| 托管 dist       | 将 dist 内容放到静态服务器，配置 `/api/` 代理；默认 history 路由需要回退到 `/index.html`                                |
| 本地预览        | `pnpm preview` 默认端口 9725，仅预览静态产物，不提供开发环境 API 代理                                                   |

上线前验证深层路由刷新、登录、文件操作和 AI 流式响应。完整升级步骤见[升级、备份与恢复](https://hohu.org/zh/guide/operations/upgrade.html)。

## 技术栈与相关项目

| 层级         | 技术                                               |
| ------------ | -------------------------------------------------- |
| 页面与语言   | Vue 3 Composition API、TypeScript                  |
| 构建         | Vite、pnpm workspace                               |
| 组件与样式   | Naive UI、UnoCSS、SCSS                             |
| 状态与路由   | Pinia、Vue Router、@elegant-router                 |
| 国际化与图表 | Vue I18n、ECharts                                  |
| 检查与测试   | Oxlint、ESLint、Oxfmt、vue-tsc、Vitest、Playwright |

精确依赖版本见 [package.json](./package.json) 与 [pnpm-lock.yaml](./pnpm-lock.yaml)。相关组件分别维护：

| 项目                                                               | 用途                          |
| ------------------------------------------------------------------ | ----------------------------- |
| [hohu-admin](https://github.com/aihohu/hohu-admin)                 | FastAPI 后端与业务服务        |
| [hohu-admin-app](https://github.com/aihohu/hohu-admin-app)         | uni-app 移动端与小程序        |
| [hohu-admin-desktop](https://github.com/aihohu/hohu-admin-desktop) | Electron 桌面客户端           |
| [hohu-cli](https://github.com/aihohu/hohu-cli)                     | 项目创建、初始化、开发与部署  |
| [hohu-skills](https://github.com/aihohu/hohu-skills)               | 项目创建与业务模块开发 Skills |
| [hohu-admin-docs](https://github.com/aihohu/hohu-admin-docs)       | 官网与中英文帮助文档          |

## 开发与参与贡献

组件使用 Composition API 与 `<script setup lang="ts">`。页面放在 `src/views/`，请求放在 `src/service/api/`，API 类型放在 `src/typings/api/`，界面文案接入 `src/locales/`。复用统一请求层处理认证、刷新和错误，不在页面另建请求客户端。

运行 dev server 时，`@elegant-router` 自动生成路由；只有未运行服务、需要预生成或路由未同步时才使用 `pnpm gen-route`。生成前端路由不会自动创建后端菜单或授予权限。接入步骤见 [Web 页面与请求](https://hohu.org/zh/guide/development/web.html)和[新增业务模块](https://hohu.org/zh/guide/development/module.html)。

| 命令                 | 用途                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`     | TypeScript 与 Vue 类型检查                                                                        |
| `pnpm lint`          | Oxlint 与 ESLint 检查，包含自动修复                                                               |
| `pnpm fmt`           | 格式化文件                                                                                        |
| `pnpm test`          | Vitest 单元测试                                                                                   |
| `pnpm test:coverage` | 单元测试与覆盖率                                                                                  |
| `pnpm e2e`           | Playwright 端到端测试，先按[验证指南](https://hohu.org/zh/guide/development/testing.html)准备环境 |

提交前阅读[贡献指南](./CONTRIBUTING.md)，检查格式化与自动修复产生的差异。报告问题请提供版本、复现步骤和脱敏信息，避免上传 token 或真实业务数据。

## 许可证

[Apache License 2.0](./LICENSE) &copy; HoHu，另有声明的代码除外。

本项目包含源自 SoybeanAdmin 的代码，其适用 MIT 许可与版权声明予以保留。历史授权与第三方范围见 [NOTICE](./NOTICE) 和 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
