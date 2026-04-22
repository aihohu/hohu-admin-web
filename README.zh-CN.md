# hohu-admin-web

基于 Vue 3、Vite、TypeScript、NaiveUI 和 UnoCSS 构建的现代化后台管理系统前端。属于 [HoHu](https://github.com/aihohu) 管理平台的一部分，配合 [FastAPI 后端](https://github.com/aihohu/hohu-admin) 使用。

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

## 环境要求

- **Node.js** >= 20.19.0
- **pnpm** >= 10.5.0

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/aihohu/hohu-admin-web.git
cd hohu-admin-web

# 安装依赖
pnpm install

# 启动开发服务器 (http://localhost:9527)
pnpm dev
```

开发服务器默认将 API 请求代理到 `http://127.0.0.1:8000`，请确保后端已启动。

## 常用命令

| 命令              | 说明                        |
| ----------------- | --------------------------- |
| `pnpm dev`        | 启动开发服务器（测试环境）  |
| `pnpm dev:prod`   | 启动开发服务器（生产环境）  |
| `pnpm build`      | 生产构建                    |
| `pnpm build:test` | 测试环境构建                |
| `pnpm preview`    | 预览生产构建                |
| `pnpm lint`       | 代码检查 (oxlint + eslint)  |
| `pnpm typecheck`  | TypeScript 类型检查         |
| `pnpm gen-route`  | 根据 src/views 重新生成路由 |
| `pnpm commit`     | 规范化提交（英文）          |
| `pnpm commit:zh`  | 规范化提交（中文）          |

## 项目结构

```
hohu-admin-web/
├── build/                    # Vite 构建配置和插件
├── packages/                 # Monorepo 工作区包
│   ├── @sa/axios/           # HTTP 请求封装
│   ├── @sa/hooks/           # Vue 组合式函数
│   ├── @sa/utils/           # 工具函数
│   ├── @sa/color/           # 颜色工具
│   ├── @sa/materials/       # 共享 UI 组件
│   ├── @sa/scripts/         # 构建/开发脚本
│   └── @sa/uno-preset/      # UnoCSS 预设
├── src/
│   ├── components/          # 全局 Vue 组件
│   ├── constants/           # 应用常量
│   ├── enum/                # 枚举定义
│   ├── hooks/               # 自定义 hooks（业务 & 通用）
│   ├── layouts/             # 布局组件
│   ├── locales/             # 国际化翻译 (zh-cn, en-us)
│   ├── router/              # 路由 (elegant-router + 守卫)
│   ├── service/             # API 服务层
│   │   ├── api/             # 接口定义
│   │   └── request/         # HTTP 客户端配置
│   ├── store/               # Pinia 状态管理 (auth, app, route, tab, theme)
│   ├── styles/              # 全局样式 (CSS + SCSS)
│   ├── theme/               # 主题配置
│   ├── typings/             # TypeScript 类型定义
│   │   └── api/             # API 响应/请求类型
│   ├── utils/               # 工具函数
│   └── views/               # 页面组件
│       ├── _builtin/        # 登录、403、404、500、iframe
│       ├── home/            # 仪表盘
│       └── system/          # 系统管理
├── .env.test                # 测试环境变量
└── .env.prod                # 生产环境变量
```

## 开发指南

### 新增页面

1. 创建 `src/views/<模块>/index.vue`
2. 运行 `pnpm gen-route` 注册路由
3. 按需在 `src/locales/langs/` 中添加国际化 key

### 新增 API 接口

1. 在 `src/typings/api/` 定义类型
2. 在 `src/service/api/` 创建服务函数
3. 在组件中通过类型化的 `request` 封装调用

### 路由

路由由 [@elegant-router](https://github.com/soybean-js/elegant-router) 根据 `src/views` 目录结构自动生成。新增或重命名页面后执行 `pnpm gen-route`。

### 状态管理

Pinia store 位于 `src/store/modules/`，使用组合式 API 风格（`defineStore` + setup 函数）。

### 样式

全局使用 UnoCSS 原子化类名。全局 SCSS 变量通过 `@use "@/styles/scss/global.scss" as *;` 引入。

## 后端对接

| 项目     | 值                                         |
| -------- | ------------------------------------------ |
| API 地址 | `http://127.0.0.1:8000`                    |
| API 文档 | `http://127.0.0.1:8000/docs`               |
| 响应格式 | `{ code: number, msg: string, data: any }` |
| 认证方式 | `Authorization` 请求头携带 Bearer JWT      |
| ID 格式  | Snowflake ID 序列化为**字符串**            |

后端使用 `snake_case`，前端使用 `camelCase`，由请求/响应拦截器自动转换。

## Git 提交规范

每次提交前会自动通过 `simple-git-hooks` 运行以下检查：

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm fmt`
4. `git diff --exit-code`（确保格式化后的文件已暂存）

## 许可证

[MIT](./LICENSE)
