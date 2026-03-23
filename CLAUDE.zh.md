# CLAUDE.md (中文版)

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

**HoHu Admin Web** 是一个现代化的 Vue 3 管理后台前端，设计用于对接 FastAPI 后端（地址：`http://127.0.0.1:8000`）。项目采用 Monorepo 架构，使用 workspace 包管理，以更好地组织和维护代码。

**核心技术:**
- Vue 3.5.26（组合式 API、`<script setup>`）
- Vite 7.3.0（构建工具、开发服务器）
- TypeScript 5.9.3（类型安全）
- NaiveUI 2.43.2（UI 组件库）
- UnoCSS 66.5.10（原子化 CSS）
- Pinia 3.0.4（状态管理）
- Vue Router 4.6.4（路由，使用 @elegant-router）
- Vue I18n 11.2.7（国际化）
- ECharts 6.0.0（数据可视化）

**后端集成:**
- FastAPI 后端地址：`http://127.0.0.1:8000`
- API 文档：http://127.0.0.1:8000/docs
- 响应格式：`{code: number, msg: string, data: any}`（成功代码：`0000`）
- 认证方式：Bearer Token（通过 `Authorization` 请求头）
- Snowflake ID 以字符串形式返回，防止 JavaScript BigInt 精度丢失

## 开发命令

### 环境搭建
```bash
# 安装依赖（需要 pnpm >= 10.5.0，Node >= 20.19.0）
pnpm install

# 安装所有 workspace 包的依赖
pnpm install -F=@sa/axios
```

### 运行应用
```bash
# 开发模式（测试环境，连接到 http://127.0.0.1:8000）
pnpm dev

# 开发模式（生产环境）
pnpm dev:prod

# 预览生产构建
pnpm preview
```

### 构建项目
```bash
# 生产构建
pnpm build

# 测试环境构建
pnpm build:test
```

### 代码质量
```bash
# ESLint 检查并修复
pnpm lint

# TypeScript 类型检查
pnpm typecheck
```

### 开发工具
```bash
# 从页面生成路由类型
pnpm gen-route

# 清理构建产物
pnpm cleanup

# 更新包版本
pnpm update-pkg
```

## 项目结构

```
hohu-admin-web/
├── build/                    # 构建配置
│   ├── config/              # 环境变量、代理设置
│   │   ├── index.ts
│   │   ├── proxy.ts        # Vite 代理配置
│   │   └── time.ts
│   └── plugins/            # Vite 插件配置
├── packages/                # Monorepo workspace 包
│   ├── @sa/axios/         # HTTP 请求封装
│   ├── @sa/color/         # 颜色工具
│   ├── @sa/hooks/        # Vue 组合式 hooks
│   ├── @sa/materials/     # UI 组件
│   ├── @sa/uno-preset/   # UnoCSS 预设
│   ├── @sa/utils/        # 工具函数
│   ├── @sa/scripts/      # 构建/开发脚本
│   └── @sa/alova/       # HTTP 客户端（axios 替代方案）
├── public/                # 静态资源
├── src/
│   ├── assets/           # 静态资源（图片、字体）
│   ├── components/       # 全局 Vue 组件
│   ├── constants/       # 应用常量
│   ├── enum/           # 枚举定义
│   ├── hooks/          # 自定义 Vue 组合式 hooks
│   │   ├── business/   # 业务相关 hooks
│   │   └── common/     # 通用 hooks
│   ├── layouts/        # 布局组件（头部、侧边栏等）
│   ├── locales/        # i18n 翻译
│   │   ├── langs/     # 语言文件（zh-cn, en-us）
│   │   └── *.ts       # 本地化配置
│   ├── plugins/        # Vue 插件注册
│   ├── router/         # Vue Router 配置
│   │   ├── elegant/   # @elegant-router 生成的路由
│   │   ├── guard/     # 路由守卫（认证、标题、进度）
│   │   └── routes/    # 手动路由
│   ├── service/        # API 服务层
│   │   ├── api/       # API 端点定义
│   │   └── request/   # HTTP 客户端配置
│   ├── store/          # Pinia 状态管理
│   │   └── modules/    # Store 模块（auth、app、route、tab、theme）
│   ├── styles/         # 全局样式
│   │   ├── css/       # 纯 CSS
│   │   └── scss/      # SCSS 样式
│   ├── theme/          # 主题配置
│   ├── typings/        # TypeScript 类型定义
│   │   ├── api/       # API 响应类型
│   │   └── *.d.ts    # 全局类型声明
│   ├── utils/          # 工具函数
│   └── views/         # 页面组件
│       ├── _builtin/   # 内置页面（登录、404、403、500、iframe）
│       ├── home/       # 首页/仪表板页面
│       └── system/     # 系统管理页面
├── .env.test          # 测试环境变量
├── .env.prod         # 生产环境变量
├── package.json       # 项目依赖和脚本
├── tsconfig.json     # TypeScript 配置
├── vite.config.ts    # Vite 构建配置
└── uno.config.ts     # UnoCSS 配置
```

## 前端开发指南

### 组件开发

**使用 `<script setup>` 的组件：**
```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Ref } from 'vue';

// 响应式状态
const count = ref(0);
const name: Ref<string> = ref('Claude');

// 计算属性
const doubled = computed(() => count.value * 2);

// 方法
const increment = () => {
  count.value++;
};

// 生命周期钩子
onMounted(() => {
  console.log('组件已挂载');
});
</script>

<template>
  <div class="container">
    <p>{{ name }}: {{ count }} (双倍: {{ doubled }})</p>
    <button @click="increment">增加</button>
  </div>
</template>

<style scoped>
.container {
  padding: 20px;
}
</style>
```

### API 服务集成

**使用 HTTP 请求封装：**
```typescript
// src/service/api/system.ts
import { request } from '@/service/request';

// GET 请求（带查询参数）
export function fetchUserList(params: Api.System.UserSearchParams) {
  return request<Api.System.UserList>({
    url: '/system/user/list',
    method: 'get',
    params
  });
}

// POST 请求（带请求体）
export function createUser(data: Api.System.UserCreate) {
  return request<boolean>({
    url: '/system/user/add',
    method: 'post',
    data
  });
}

// PUT 请求（带路径参数）
export function updateUser(userId: number, data: Api.System.UserUpdate) {
  return request<boolean>({
    url: `/system/user/${userId}`,
    method: 'put',
    data
  });
}

// DELETE 请求
export function deleteUser(userId: number) {
  return request<boolean>({
    url: `/system/user/${userId}`,
    method: 'delete'
  });
}
```

**响应处理：**
```typescript
// 所有响应会自动转换
const response = await fetchUserList({ current: 1, size: 10 });
// response.data 包含实际数据（ResponseModel.data）
```

### Pinia 状态管理

**Store 模块结构：**
```typescript
// src/store/modules/example/index.ts
import { defineStore } from 'pinia';

export const useExampleStore = defineStore('example', () => {
  // 状态
  const items = ref<Api.Example.Item[]>([]);

  // Getters
  const itemCount = computed(() => items.value.length);

  // Actions
  function setItems(newItems: Api.Example.Item[]) {
    items.value = newItems;
  }

  async function fetchItems() {
    const data = await fetchExampleList();
    setItems(data);
  }

  return {
    items,
    itemCount,
    setItems,
    fetchItems
  };
});
```

**在组件中使用 store：**
```vue
<script setup lang="ts">
import { useExampleStore } from '@/store/modules/example';

const exampleStore = useExampleStore();

// 访问状态
console.log(exampleStore.items);

// 调用 actions
await exampleStore.fetchItems();
</script>
```

### 使用 @elegant-router 路由

**自动路由生成：**
- 路由从 `src/views` 目录结构自动生成
- 文件路径：`src/views/system/user/index.vue` → 路由：`/system/user`
- 添加新页面后使用 `pnpm gen-route` 重新生成路由类型

**路由元信息：**
```typescript
// src/router/elegant/routes.ts (自动生成)
export default [
  {
    path: '/system/user',
    name: 'system_user',
    component: () => import('@/views/system/user/index.vue'),
    meta: {
      title: '用户管理',
      i18nKey: 'route.system_user',
      icon: 'mdi:user',
      order: 1
    }
  }
];
```

### 使用 UnoCSS 样式

**实用优先的 CSS：**
```vue
<template>
  <div class="flex items-center justify-between p-4 bg-white rounded-lg shadow">
    <h1 class="text-xl font-bold text-gray-800">标题</h1>
    <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
      按钮
    </button>
  </div>
</template>
```

**自定义主题配置：**
```typescript
// src/theme/vars.ts
export const themeVars = {
  colors: {
    primary: '#1890ff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#f5222d'
  }
};
```

### 国际化集成

**添加翻译：**
```typescript
// src/locales/langs/zh-cn.ts
export default {
  system: {
    user: {
      title: '用户管理',
      add: '添加用户',
      edit: '编辑用户',
      delete: '删除用户'
    }
  }
};
```

```typescript
// src/locales/langs/en-us.ts
export default {
  system: {
    user: {
      title: 'User Management',
      add: 'Add User',
      edit: 'Edit User',
      delete: 'Delete User'
    }
  }
};
```

**在组件中使用翻译：**
```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <h1>{{ t('system.user.title') }}</h1>
</template>
```

### 自定义 Hooks

**业务相关 hooks：**
```typescript
// src/hooks/business/example.ts
import { ref } from 'vue';

export function useExample() {
  const loading = ref(false);
  const data = ref<Api.Example.Item[]>([]);

  const fetchData = async () => {
    loading.value = true;
    try {
      data.value = await fetchExampleList();
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    data,
    fetchData
  };
}
```

## 后端 API 集成

### API 响应格式

**标准响应结构：**
```typescript
{
  code: number,      // 0000 = 成功，其他 = 错误
  msg: string,       // 成功/错误消息
  data: any          // 响应数据
}
```

**成功响应：**
```json
{
  "code": 0000,
  "msg": "success",
  "data": {
    "userId": "1234567890123456789",
    "userName": "admin",
    "nickname": "Administrator"
  }
}
```

**错误响应：**
```json
{
  "code": 1001,
  "msg": "用户不存在",
  "data": null
}
```

### 认证

**登录流程：**
```typescript
// src/service/api/auth.ts
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userInfo: Api.Auth.UserInfo;
}

export function login(data: LoginRequest) {
  return request<LoginResponse>({
    url: '/auth/login',
    method: 'post',
    data
  });
}
```

**Token 管理：**
```typescript
// src/store/modules/auth/index.ts
import { useAuthStore } from '@/store/modules/auth';

const authStore = useAuthStore();

// 登录
await authStore.login({ username, password });

// 登出
await authStore.logout();

// 检查认证状态
const isLogin = authStore.isLogin;

// 获取当前用户信息
const userInfo = authStore.userInfo;
```

### 类型定义

**API 命名空间结构：**
```typescript
// src/typings/api/
declare namespace Api {
  namespace System {
    interface User {
      userId: string;         // Snowflake ID（字符串形式）
      userName: string;
      nickname: string;
      userEmail: string;
      userPhone: string;
      userGender: '0' | '1' | '2';  // 0-未知，1-男，2-女
      status: '1' | '2';              // 1-启用，2-禁用
      createTime: string;
      updateTime: string;
    }

    interface UserQuery {
      current: number;
      size: number;
      userName?: string;
      nickname?: string;
      userPhone?: string;
      userEmail?: string;
      userGender?: string;
      status?: string;
    }

    interface UserCreate {
      userName: string;
      nickname?: string;
      userEmail: string;
      userPhone: string;
      userGender: string;
      status: string;
      password: string;
      roles: string[];  // 角色代码，不是 ID
    }
  }

  namespace Auth {
    interface UserInfo {
      userId: string;
      userName: string;
      roles: string[];
      permissions: string[];
    }
  }
}
```

### 常用模式

**分页处理：**
```typescript
// 查询参数
const query = ref({
  current: 1,
  size: 10,
  userName: ''  // 可选筛选条件
});

// 响应结构
interface PageResult<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
}

// 获取分页数据
const { data, loading } = await fetchUserList(query.value);
```

**错误处理：**
```typescript
try {
  await createUser(userData);
  window.$message?.success('创建成功');
} catch (error) {
  // 错误会自动由请求拦截器处理
  // 错误消息通过 window.$message 显示
  console.error('创建用户失败:', error);
}
```

## 环境配置

### 环境变量

**.env.test（开发环境）：**
```bash
# 后端 API 基础 URL
VITE_SERVICE_BASE_URL=http://127.0.0.1:8000

# API 响应成功代码
VITE_SERVICE_SUCCESS_CODE=0000

# Token 刷新错误代码
VITE_SERVICE_EXPIRED_TOKEN_CODES=1002

# 登出错误代码
VITE_SERVICE_LOGOUT_CODES=1003

# 模态框登出错误代码
VITE_SERVICE_MODAL_LOGOUT_CODES=1004

# HTTP 代理（Y=启用，N=禁用）
VITE_HTTP_PROXY=N
```

**.env.prod（生产环境）：**
```bash
VITE_SERVICE_BASE_URL=https://api.yourdomain.com
# ... 其他生产环境特定变量
```

### Vite 配置

**构建设置：**
```typescript
// vite.config.ts
{
  base: '/your-base-path/',           // 部署的基础路径
  resolve: {
    alias: {
      '@': '/src',                  // @ 别名指向 src 目录
      '~': '/'                       // ~ 别名指向根目录
    }
  },
  server: {
    port: 9527,                    // 开发服务器端口
    host: '0.0.0.0',            // 监听所有接口
    proxy: { ... }                  // API 代理配置
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',       // 使用现代 SCSS 编译器
        additionalData: '@use "@/styles/scss/global.scss" as *;'
      }
    }
  }
}
```

## 常见任务

### 添加新页面

1. **创建页面组件：**
   ```bash
   mkdir -p src/views/example/module
   touch src/views/example/module/index.vue
   ```

2. **添加路由元信息（可选）：**
   ```typescript
   // 在组件的 script setup 中
   defineOptions({
     name: 'ExampleModule',
     meta: {
       title: '示例模块',
       i18nKey: 'route.example_module',
       icon: 'mdi:example'
     }
   });
   ```

3. **重新生成路由类型：**
   ```bash
   pnpm gen-route
   ```

### 添加新 API 端点

1. **在 `src/typings/api/` 中定义类型：**
   ```typescript
   declare namespace Api {
     namespace Example {
       interface Item {
         exampleId: string;
         name: string;
       }

       interface Query {
         current: number;
         size: number;
       }

       interface Create {
         name: string;
       }
     }
   }
   ```

2. **在 `src/service/api/` 中创建 API 服务：**
   ```typescript
   import { request } from '@/service/request';

   export function fetchExampleList(params: Api.Example.Query) {
     return request<Api.Example.Item[]>({
       url: '/example/list',
       method: 'get',
       params
     });
   }

   export function createExample(data: Api.Example.Create) {
     return request<boolean>({
       url: '/example/add',
       method: 'post',
       data
     });
   }
   ```

3. **在组件中使用：**
   ```vue
   <script setup lang="ts">
   import { fetchExampleList } from '@/service/api/example';

   const loadData = async () => {
     const data = await fetchExampleList({ current: 1, size: 10 });
     console.log(data);
   };
   </script>
   ```

### 添加新 Store 模块

1. **在 `src/store/modules/` 中创建 store：**
   ```typescript
   // src/store/modules/example/index.ts
   import { defineStore } from 'pinia';

   export const useExampleStore = defineStore('example', () => {
     const state = ref({});

     const getter = computed(() => /* ... */);

     function action() {
       // ...
     }

     return { state, getter, action };
   });
   ```

2. **在组件中使用：**
   ```vue
   <script setup lang="ts">
   import { useExampleStore } from '@/store/modules/example';
   const exampleStore = useExampleStore();
   </script>
   ```

## 最佳实践

### 代码组织
- **组件结构**：使用带有 TypeScript 的 `<script setup>`
- **API 服务**：将 API 调用与业务逻辑分离
- **状态管理**：使用 Pinia store 管理共享状态
- **类型安全**：始终为 API 请求/响应定义类型
- **文件命名**：文件使用 kebab-case，组件使用 PascalCase

### 性能优化
- **懒加载**：路由默认懒加载
- **代码分割**：对大型库使用动态导入
- **图片优化**：尽可能使用 WebP 格式
- **包分析**：部署前检查包大小

### 可访问性
- **语义化 HTML**：使用正确的 HTML5 语义元素
- **ARIA 属性**：为屏幕阅读器添加 ARIA 标签
- **键盘导航**：确保所有交互元素可通过键盘访问
- **颜色对比度**：满足 WCAG AA 标准（4.5:1）

### 安全性
- **XSS 防护**：Vue 自动转义模板中的内容
- **CSRF 防护**：Token 通过 Authorization 请求头发送
- **输入验证**：验证所有用户输入
- **敏感数据**：永远不要记录密码或 token

## 常见陷阱

1. **ID 精度丢失**：Snowflake ID 以字符串形式返回，防止 JavaScript BigInt 精度丢失
2. **大小写转换**：后端使用 `snake_case`，前端使用 `camelCase` - 由请求/响应拦截器自动处理
3. **Token 过期**：Token 刷新由请求拦截器自动处理
4. **类型安全**：始终为 API 契约定义 TypeScript 类型
5. **异步操作**：始终对异步操作使用 `await` 并正确处理错误
6. **组件命名**：使用多词组件名称以避免与 HTML 元素冲突
7. **状态变更**：只在拥有状态的组件中变更状态；使用 props/events 进行父子通信
8. **CSS 隔离**：使用 scoped 样式或 CSS modules 避免样式冲突

## Git 工作流

### 提交消息格式

```bash
# Conventional Commits 格式
pnpm commit          # 英文提交消息
pnpm commit:zh       # 中文提交消息
```

### Pre-commit 钩子

```bash
# Pre-commit 检查（自动运行）
pnpm typecheck        # TypeScript 类型检查
pnpm lint             # ESLint 检查和修复
git diff --exit-code  # 确保文件已提交
```

### 分支策略

- `main`：生产分支
- 功能分支：`feature/描述`
- 修复分支：`fix/描述`
- 发布分支：`release/版本`

## 故障排除

### 常见问题

**1. 端口已被占用：**
```bash
# 终止使用端口 9527 的进程
lsof -ti:9527 | xargs kill -9

# 或在 vite.config.ts 中使用不同的端口
```

**2. API 连接失败：**
```bash
# 检查后端是否运行
curl http://127.0.0.1:8000/docs

# 检查环境变量
cat .env.test | grep VITE_SERVICE_BASE_URL
```

**3. 类型错误：**
```bash
# 重新生成路由类型
pnpm gen-route

# 在 VS Code 中重启 TypeScript 服务器
# Cmd/Ctrl + Shift + P -> "TypeScript: Restart TS Server"
```

**4. 构建失败：**
```bash
# 清除缓存并重新安装
rm -rf node_modules dist .vite
pnpm install
pnpm build
```

## 相关资源

- **NaiveUI 文档**：https://www.naiveui.com/
- **Vue 3 文档**：https://vuejs.org/
- **Vite 文档**：https://vitejs.dev/
- **TypeScript 文档**：https://www.typescriptlang.org/
- **UnoCSS 文档**：https://unocss.dev/
- **后端 API 文档**：http://127.0.0.1:8000/docs
- **后端源码**：../hohu-admin/
