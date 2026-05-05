# CLAUDE.zh.md

## 项目概述

Vue 3 管理后台前端（组合式 API、`<script setup>`）。Monorepo 架构，workspace 包在 `packages/` 下。

**技术栈：** Vue 3.5 / Vite 7 / TypeScript 5.9 / NaiveUI / UnoCSS / Pinia / Vue Router + @elegant-router / Vue I18n / ECharts

**环境要求：** pnpm >= 10.5, Node >= 20.19

## 命令

```bash
pnpm install              # 安装依赖
pnpm dev                  # 开发服务器 (端口 9527, 代理到后端 :8000)
pnpm build                # 生产构建
pnpm lint                 # oxlint + ESLint 检查并修复
pnpm fmt                  # oxfmt 格式化
pnpm typecheck            # TypeScript 类型检查
pnpm gen-route            # 根据 src/views 目录结构重新生成路由
pnpm commit / pnpm commit:zh  # Conventional commits
```

**写完代码后必须执行 `pnpm lint && pnpm fmt`**，确保通过所有检查（与 git pre-commit 一致）。

## 项目结构

```
src/
├── views/<module>/index.vue   # 页面 → 通过 @elegant-router 自动生成路由
├── service/api/<module>.ts    # API 请求封装
├── typings/api/               # TypeScript 类型：declare namespace Api { namespace Module { ... } }
├── store/modules/             # Pinia stores
├── hooks/business/            # 业务 hooks
├── hooks/common/table.ts     # useNaivePaginatedTable, useTableOperate
├── hooks/common/form.ts      # useFormRules, useNaiveForm
├── locales/langs/             # i18n 翻译 (zh-cn, en-us)
├── router/elegant/            # 自动生成的路由（禁止手动编辑）
├── router/guard/              # 路由守卫
├── theme/                     # 主题配置
├── layouts/                   # 布局组件
└── styles/                    # 全局 CSS/SCSS

packages/                      # Monorepo workspace 包
├── @sa/axios/                 # HTTP 请求封装
├── @sa/hooks/                 # 共享 Vue hooks
├── @sa/utils/                 # 共享工具函数
├── @sa/color/                 # 颜色工具
├── @sa/materials/             # 共享 UI 组件
├── @sa/uno-preset/            # UnoCSS 预设
├── @sa/scripts/               # 构建/开发脚本
└── @sa/alova/                 # HTTP 客户端（axios 替代方案）
```

## 后端集成

- **API 地址：** `http://127.0.0.1:8000`（文档在 `/docs`）
- **响应格式：** `{code: number, msg: string, data: any}` — 成功码 `0000`
- **认证：** `Authorization` header 携带 JWT Bearer token
- **Snowflake ID：** 前端统一使用 `string` 类型 — 禁止转为 `number`
- **大小写转换：** 后端 `snake_case` ↔ 前端 `camelCase` — 由请求/响应拦截器自动处理

## 关键模式

### 添加新页面

1. 创建 `src/views/<module>/index.vue`
2. 添加 `defineOptions({ name, meta: { title, i18nKey, icon } })`（可选）
3. 执行 `pnpm gen-route` 重新生成路由类型

### 添加 API 端点

1. 在 `src/typings/api/` 定义类型 — 使用 `declare namespace Api { namespace Module { ... } }`
2. 在 `src/service/api/<module>.ts` 创建服务 — 从 `@/service/request` 导入 `request`
3. 在组件中导入使用

### i18n 约定

- 页面文案：`page.<module>.xxx` 命名空间（如 `page.ai.chat.title`）
- 通用操作：复用 `common.*`（`common.edit`, `common.delete`, `common.confirm`, `common.cancel`）
- 状态标签：复用 `page.system.common.status.enable/disable`
- 后端错误码：通过 `errorCode.*` 映射（如 `AI_PROVIDER_NOT_FOUND`），前端 `$t('errorCode.XXX')`，无映射时回退到后端 `msg`
- Schema 类型定义在 `src/typings/app.d.ts` 的 `Schema` interface 中

### 表格 CRUD 模式

- 参考模块：`views/system/role/index.vue` — TSX columns + `useNaivePaginatedTable` + `useTableOperate`
- Drawer 表单：参考 `role/modules/role-operate-drawer.vue`

### API 服务示例

```typescript
import { request } from '@/service/request';

export function fetchList(params: Api.Module.Query) {
  return request<Api.Module.List>({ url: '/module/list', method: 'get', params });
}

export function createItem(data: Api.Module.Create) {
  return request<boolean>({ url: '/module/add', method: 'post', data });
}
```

## 常见陷阱

1. **Snowflake ID 精度：** ID 为 string — 禁止使用 `.map(Number)` 或定义为 `number`
2. **字典数据主键：** 用 `dictCode`（不是 `dictDataId`）
3. **字典类型主键：** `dictTypeId` 必须为 `string` 类型
4. **isDefault 值：** `'Y'` | `'N'`（不是 `0` | `1`）
5. **批量删除：** 始终传 `string[]` 给 Snowflake ID
6. **路由参数：** 用 query 参数导航（如 `/dict/data?dictType=xxx`）
7. **表单验证：** 验证消息始终用 `$t()` 国际化
8. **默认值：** `status: '1'` 表示启用，`isDefault: 'N'` 表示非默认
9. **参考模块：** 用 role 模块 (`src/views/system/role/`) 作为模式参考
10. **API Key 编辑：** 编辑时 `apiKey` 字段留空（不发脱敏值）；编辑模式下非必填
11. **AI 流式对话：** 使用原生 `fetch` + `ReadableStream`（不走 axios request wrapper）
12. **暗黑主题：** 自定义组件用 `var(--n-*)` CSS 变量 + `html.dark` 覆盖

## AI 模块

```
src/views/ai/chat/          # 对话页面 (sidebar, main, message, input)
src/views/ai/provider/      # 提供商管理 (表格 + drawer)
src/store/modules/ai/       # Pinia store (会话、消息、流式、模型)
src/service/api/ai.ts       # API 封装
src/typings/api/ai.d.ts     # Api.Ai 命名空间
```

- **SSE 流式对话：** 原生 `fetch` + `ReadableStream`（非 axios），POST `/ai/chat`
- **模型选择：** `GET /ai/provider/models` 返回 `{providerId, providerCode, providerName, model, modelId}`，按 provider 分组
- **Model ID 格式：** `{providerCode}:{modelName}`（如 `openai:gpt-4o`）
- **API Key：** 后端 Fernet 加密存储；列表/编辑返回脱敏值；编辑表单留空表示不修改
- **Provider 测试：** `POST /ai/provider/test-model`，支持已保存和未保存的提供商

## 环境变量

```bash
# .env.test
VITE_SERVICE_BASE_URL=http://127.0.0.1:8000
VITE_SERVICE_SUCCESS_CODE=0000
VITE_SERVICE_EXPIRED_TOKEN_CODES=1002
VITE_SERVICE_LOGOUT_CODES=1003
VITE_SERVICE_MODAL_LOGOUT_CODES=1004
VITE_HTTP_PROXY=N
```

## Git 工作流

- **提交：** `pnpm commit`（英文）/ `pnpm commit:zh`（中文）— conventional commits
- **Pre-commit：** typecheck + lint 自动运行
- **分支：** `feature/*`、`fix/*`、`release/*`
