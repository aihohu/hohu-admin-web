# AGENTS.md

本文件适用于 `hohu-admin-web/` 目录及其所有子目录。仓库根目录的 `../AGENTS.md` 仍然生效；如有冲突，以本文件中更具体的 Web 前端规则为准。

## 项目定位

`hohu-admin-web` 是 hohu 管理平台的 Vue 3 管理后台，使用 TypeScript、Vite、Naive UI、UnoCSS、Pinia、Vue Router、Vue I18n 和 `@elegant-router`。Node.js 要求 >= 20，包管理器使用 pnpm >= 10.5。

主要目录：

```text
src/
├── assets/       # 静态资源
├── components/   # 通用组件
├── hooks/        # 组合式逻辑
├── layouts/      # 页面布局
├── locales/      # 国际化资源
├── plugins/      # Vue 插件注册
├── router/       # 路由实例、守卫和生成结果
├── service/      # 请求客户端与类型化 API
├── store/        # Pinia stores
├── styles/       # 全局样式和 SCSS
├── theme/        # 主题配置
├── typings/      # 全局与 API 类型
├── utils/        # 通用工具
└── views/        # 路由页面
tests/e2e/        # 端到端测试
```

应用入口是 `src/main.ts`，路由入口是 `src/router/index.ts`。开发服务器默认运行在 `http://127.0.0.1:9527`，并代理后端 `http://127.0.0.1:8000`。

## 开始工作前

1. 先定位对应页面、API 服务、类型定义和 store，确认改动是否跨越前后端契约。
2. 新功能、重构或重要交互变化必须先创建或更新后端仓库中的 `../hohu-admin/docs/<feature>.md`；跨项目使用同一份 spec，不在前端另建冲突版本。
3. API 路径、请求/响应字段、错误码、权限或状态机变化必须先更新 spec，并与后端实现同步。
4. 遵循现有 Naive UI、UnoCSS、主题变量、布局和组件模式，不为局部需求引入第二套设计体系。
5. 不要顺手修改任务无关文件，不要覆盖用户已有改动。

纯文案、样式小修和测试补充可直接实现；新增页面、业务流程或 API 契约变化必须遵循 spec-first 和 TDD。

## 开发命令

在本目录执行：

```bash
pnpm install
pnpm dev
pnpm build
pnpm build:test
pnpm lint
pnpm fmt
pnpm typecheck
pnpm gen-route
pnpm exec vitest run
```

不要混用 npm、yarn 或其他 lockfile。不得手工修改依赖目录或构建产物。

## TDD 与交付流程

每个行为变化遵循：

1. 先添加失败的组件、store、工具或交互测试。
2. 运行最小测试范围确认测试因目标行为失败。
3. 实现最小改动，不混入无关重构。
4. 运行 `pnpm lint && pnpm fmt && pnpm typecheck`。
5. 运行相关测试和前端全量测试；涉及构建配置或路由时再运行 `pnpm build`。
6. 覆盖率不得低于 70%。
7. 回写 `../hohu-admin/docs/<feature>.md` 中的 Plan 状态、决策和回归测试路径。

单元测试由 Vitest + jsdom 执行，文件放在 `src/**/__tests__/**/*.spec.ts`。端到端测试放在 `tests/e2e/`，遵循目录中已有测试工具和 fixture。

## 页面、路由和权限

- 页面放在 `src/views/<module>/index.vue` 或符合现有路由约定的子目录。
- `@elegant-router` 在 dev server 运行时监听 `src/views/` 并自动生成路由；新增页面后通常不需要手动执行 `pnpm gen-route`。
- 只有 dev server 未运行、CI/脚本需要预生成结果或路由未同步时才手动执行 `pnpm gen-route`。
- 不要把生成路由当作主要手写扩展点；业务路由元数据按项目现有约定维护。
- 页面访问权限、按钮权限和后端权限码必须一致，权限码格式为 `<module>:<resource>:<action>`。
- 不要仅在前端隐藏按钮来代替后端鉴权。

当前业务页面主要位于 `ai`、`app`、`home`、`marketplace*` 和 `system` 模块。新增功能优先归入既有业务边界，不创建语义重叠模块。

## API 与类型

前端调用链保持为 `View/Component -> service/api -> request client`：

- API 封装放在 `src/service/api/<module>.ts`，页面组件中不要直接创建 axios/fetch 客户端。
- 对外导出统一从 `src/service/api/index.ts` 组织，避免页面依赖深层实现路径。
- API 类型放在 `src/typings/api/`，使用 `declare namespace Api { namespace Module { ... } }` 组织。
- 后端 FastAPI OpenAPI `/docs` 是接口契约事实源；禁止靠页面实际返回值猜测类型。
- 不使用 `any` 绕过契约问题；未知数据先用 `unknown` 并在边界收窄。
- 请求取消、错误提示、token 刷新和字段转换复用现有请求层，不在每个页面重复实现。

必须保持跨项目契约：

- 响应为 `{code, msg, data}`，成功业务码为 `200`。
- 分页为 `{records, total, current, size}`。
- 使用 `Authorization: Bearer <jwt>`。
- 前端字段使用 `camelCase`，后端字段使用 `snake_case`，依赖既有转换链路。
- Snowflake ID 始终按字符串处理，不能转为 `number`，不能进行会丢精度的算术。
- 时间按 ISO 8601 UTC 接收，展示时再转换为用户本地时区。
- 业务错误优先按稳定 `errorCode` 映射 i18n 文案，不依赖后端临时中文消息做逻辑判断。

## 状态与组件边界

- 跨页面、跨布局或需要持久化的状态放在 `src/store/modules/` 的 Pinia store。
- 页面局部、生命周期短的状态保留在组件或 composable 中，不要全部提升到全局 store。
- 可复用业务逻辑抽到 `src/hooks/`；无 Vue 状态依赖的纯函数放到 `src/utils/`。
- 通用 UI 放在 `src/components/`，业务专用组件与对应 view 就近组织。
- 保持 props/emits 类型明确，避免组件通过隐式全局变量或直接修改父状态通信。
- 异步操作必须处理 loading、空数据、失败和重复提交状态。

## TypeScript、Vue 与样式

- TypeScript 使用 strict 模式；保持导入、文件名和路径大小写一致。
- 路径别名：`@/` 指向 `src/`，`~/` 指向项目根目录。
- Vue 组件使用项目现有 Composition API 和 `<script setup lang="ts">` 风格。
- 组件名在模板中使用 PascalCase；`icon-*` 是现有 ESLint 例外。
- 用户可见文本接入 Vue I18n，不在组件中散落不可翻译的业务文案。
- 优先使用 Naive UI 组件、UnoCSS utilities、主题 token 和全局 SCSS 能力。
- 颜色、间距、字号和圆角优先复用设计 token，避免局部硬编码造成主题不一致。
- 页面需要同时适配桌面和移动宽度，至少处理表格溢出、表单列数和操作区换行。
- 动画应服务于状态变化和层级表达，避免无意义的持续动画。

## 安全与可访问性

- 默认使用 Vue 文本插值；未经净化的用户内容禁止传给 `v-html`。
- 必须渲染富文本时使用项目认可的 sanitizer，并测试脚本、事件属性和危险 URL。
- 不把 token、密钥、完整 PII 或敏感响应写入日志、localStorage 或错误提示。
- 上传前端校验只用于体验，不能替代后端的类型、大小和权限校验。
- 外部链接和下载地址按现有安全工具校验，避免 `javascript:`、开放重定向和不可信 iframe。
- 表单控件应有可识别 label，图标按钮应有 tooltip 或可访问名称，键盘焦点不能被隐藏。
- 破坏性操作使用明确确认，并在请求进行中防止重复提交。

## 测试约定

- 测试用户可观察行为，不依赖 Vue 内部实现细节。
- 组件测试覆盖 loading、成功、空状态、失败、权限和关键交互。
- API/store 测试 mock 网络边界，不 mock 被测模块本身。
- 修复 bug 时添加能在修复前失败的回归测试。
- 测试必须独立，不依赖执行顺序、真实后端或开发者本地状态。
- 对时间、随机值和 Snowflake ID 使用稳定 fixture，不把 ID 转成 number。
- 路由或权限变化至少覆盖可访问与拒绝路径。

## 禁止事项

- 页面中直接调用裸 axios/fetch，绕过统一 request client。
- 使用 `any`、`@ts-ignore` 或关闭 lint 规则掩盖类型问题。
- 手工编辑自动生成路由文件来实现业务需求。
- 把 Snowflake ID 转为 JavaScript number。
- 仅靠前端隐藏实现权限控制。
- 未净化的 `v-html`。
- 重复实现 token、错误处理或字段转换逻辑。
- 硬编码敏感配置、生产 API 地址或不可翻译业务文案。
- 通过更新 snapshot、删除断言或跳过测试掩盖回归。

## Commit

只有用户明确要求时才提交。提交时：

- 按文件名精确 stage，不使用 `git add -A`。
- commit message 使用一句英文。
- 使用 `git commit -s` 添加 DCO `Signed-off-by`。
- 不添加 `Co-Authored-By`，不使用 `--no-verify`。
- 不 amend 已 push 的 commit。
