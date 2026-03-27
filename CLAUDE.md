# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HoHu Admin Web** is a modern Vue 3-based admin dashboard frontend, designed to work with the FastAPI backend at `http://127.0.0.1:8000`. It follows a monorepo architecture with workspace packages for better code organization and maintainability.

**Key Technologies:**

- Vue 3.5.26 (Composition API, `<script setup>`)
- Vite 7.3.0 (build tool, dev server)
- TypeScript 5.9.3 (type safety)
- NaiveUI 2.43.2 (UI component library)
- UnoCSS 66.5.10 (atomic CSS)
- Pinia 3.0.4 (state management)
- Vue Router 4.6.4 (routing with @elegant-router)
- Vue I18n 11.2.7 (internationalization)
- ECharts 6.0.0 (data visualization)

**Backend Integration:**

- FastAPI backend at `http://127.0.0.1:8000`
- API documentation: http://127.0.0.1:8000/docs
- Response format: `{code: number, msg: string, data: any}` (success code: `0000`)
- Authentication: Bearer token in `Authorization` header
- Snowflake IDs returned as strings to prevent BigInt precision loss
- Dictionary data primary key: `dictCode` (not `dictDataId`)
- Dictionary type primary key: `dictTypeId` (use `string` type to prevent precision loss)

## Development Commands

### Environment Setup

```bash
# Install dependencies (requires pnpm >= 10.5.0, Node >= 20.19.0)
pnpm install

# Install dependencies for all workspace packages
pnpm install -F=@sa/axios
```

### Running the Application

```bash
# Development mode (test environment, connects to http://127.0.0.1:8000)
pnpm dev

# Development mode (production environment)
pnpm dev:prod

# Preview production build
pnpm preview
```

### Building

```bash
# Production build
pnpm build

# Test environment build
pnpm build:test
```

### Code Quality

```bash
# ESLint check and fix
pnpm lint

# TypeScript type checking
pnpm typecheck
```

### Development Tools

```bash
# Generate route types from pages
pnpm gen-route

# Cleanup build artifacts
pnpm cleanup

# Update package versions
pnpm update-pkg
```

## Project Structure

```
hohu-admin-web/
├── build/                    # Build configuration
│   ├── config/              # Environment variables, proxy setup
│   │   ├── index.ts
│   │   ├── proxy.ts        # Vite proxy configuration
│   │   └── time.ts
│   └── plugins/            # Vite plugins configuration
├── packages/                # Monorepo workspace packages
│   ├── @sa/axios/         # HTTP request wrapper
│   ├── @sa/color/         # Color utilities
│   ├── @sa/hooks/        # Vue composition hooks
│   ├── @sa/materials/     # UI components
│   ├── @sa/uno-preset/   # UnoCSS preset
│   ├── @sa/utils/        # Utility functions
│   ├── @sa/scripts/      # Build/development scripts
│   └── @sa/alova/       # HTTP client (alternative to axios)
├── public/                # Static assets
├── src/
│   ├── assets/           # Static assets (images, fonts)
│   ├── components/       # Global Vue components
│   ├── constants/       # Application constants
│   ├── enum/           # Enum definitions
│   ├── hooks/          # Custom Vue composition hooks
│   │   ├── business/   # Business-specific hooks
│   │   └── common/     # Generic hooks
│   ├── layouts/        # Layout components (header, sidebar, etc.)
│   ├── locales/        # i18n translations
│   │   ├── langs/     # Language files (zh-cn, en-us)
│   │   └── *.ts       # Locale configuration
│   ├── plugins/        # Vue plugins registration
│   ├── router/         # Vue Router configuration
│   │   ├── elegant/   # @elegant-router generated routes
│   │   ├── guard/     # Route guards (auth, title, progress)
│   │   └── routes/    # Manual routes
│   ├── service/        # API service layer
│   │   ├── api/       # API endpoints definitions
│   │   └── request/   # HTTP client configuration
│   ├── store/          # Pinia state management
│   │   └── modules/    # Store modules (auth, app, route, tab, theme)
│   ├── styles/         # Global styles
│   │   ├── css/       # Plain CSS
│   │   └── scss/      # SCSS styles
│   ├── theme/          # Theme configuration
│   ├── typings/        # TypeScript type definitions
│   │   ├── api/       # API response types
│   │   └── *.d.ts    # Global type declarations
│   ├── utils/          # Utility functions
│   └── views/         # Page components
│       ├── _builtin/   # Built-in pages (login, 404, 403, 500, iframe)
│       ├── home/       # Home/dashboard pages
│       └── system/     # System management pages
├── .env.test          # Test environment variables
├── .env.prod         # Production environment variables
├── package.json       # Project dependencies and scripts
├── tsconfig.json     # TypeScript configuration
├── vite.config.ts    # Vite build configuration
└── uno.config.ts     # UnoCSS configuration
```

## Frontend Development Guide

### Component Development

**File-based Components with `<script setup>`:**

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Ref } from 'vue';

// Reactive state
const count = ref(0);
const name: Ref<string> = ref('Claude');

// Computed properties
const doubled = computed(() => count.value * 2);

// Methods
const increment = () => {
  count.value++;
};

// Lifecycle hooks
onMounted(() => {
  console.log('Component mounted');
});
</script>

<template>
  <div class="container">
    <p>{{ name }}: {{ count }} (doubled: {{ doubled }})</p>
    <button @click="increment">Increment</button>
  </div>
</template>

<style scoped>
.container {
  padding: 20px;
}
</style>
```

### API Service Integration

**Using the HTTP request wrapper:**

```typescript
// src/service/api/system.ts
import { request } from '@/service/request';

// GET request with query parameters
export function fetchUserList(params: Api.System.UserSearchParams) {
  return request<Api.System.UserList>({
    url: '/system/user/list',
    method: 'get',
    params
  });
}

// POST request with body
export function createUser(data: Api.System.UserCreate) {
  return request<boolean>({
    url: '/system/user/add',
    method: 'post',
    data
  });
}

// PUT request with path parameter
export function updateUser(userId: number, data: Api.System.UserUpdate) {
  return request<boolean>({
    url: `/system/user/${userId}`,
    method: 'put',
    data
  });
}

// DELETE request
export function deleteUser(userId: number) {
  return request<boolean>({
    url: `/system/user/${userId}`,
    method: 'delete'
  });
}
```

**Response handling:**

```typescript
// All responses are automatically transformed
const response = await fetchUserList({ current: 1, size: 10 });
// response.data contains the actual data (ResponseModel.data)
```

### State Management with Pinia

**Store module structure:**

```typescript
// src/store/modules/example/index.ts
import { defineStore } from 'pinia';

export const useExampleStore = defineStore('example', () => {
  // State
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

**Using store in components:**

```vue
<script setup lang="ts">
import { useExampleStore } from '@/store/modules/example';

const exampleStore = useExampleStore();

// Access state
console.log(exampleStore.items);

// Call actions
await exampleStore.fetchItems();
</script>
```

### Routing with @elegant-router

**Automatic route generation:**

- Routes are generated from the `src/views` directory structure
- File path: `src/views/system/user/index.vue` → Route: `/system/user`
- Use `pnpm gen-route` to regenerate route types after adding new pages

**Route meta information:**

```typescript
// src/router/elegant/routes.ts (auto-generated)
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

### Styling with UnoCSS

**Utility-first CSS:**

```vue
<template>
  <div class="flex items-center justify-between p-4 bg-white rounded-lg shadow">
    <h1 class="text-xl font-bold text-gray-800">Title</h1>
    <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Button</button>
  </div>
</template>
```

**Custom theme configuration:**

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

### i18n Integration

**Adding translations:**

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

**Using translations in components:**

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <h1>{{ t('system.user.title') }}</h1>
</template>
```

### Custom Hooks

**Business-specific hooks:**

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

## Backend API Integration

### API Response Format

**Standard response structure:**

```typescript
{
  code: number,      // 0000 = success, others = error
  msg: string,       // Success/error message
  data: any          // Response payload
}
```

**Success response:**

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

**Error response:**

```json
{
  "code": 1001,
  "msg": "User not found",
  "data": null
}
```

### Authentication

**Login flow:**

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

**Token management:**

```typescript
// src/store/modules/auth/index.ts
import { useAuthStore } from '@/store/modules/auth';

const authStore = useAuthStore();

// Login
await authStore.login({ username, password });

// Logout
await authStore.logout();

// Check authentication status
const isLogin = authStore.isLogin;

// Get current user info
const userInfo = authStore.userInfo;
```

### Type Definitions

**API namespace structure:**

```typescript
// src/typings/api/
declare namespace Api {
  namespace System {
    interface User {
      userId: string; // Snowflake ID as string
      userName: string;
      nickname: string;
      userEmail: string;
      userPhone: string;
      userGender: '0' | '1' | '2'; // 0-unknown, 1-male, 2-female
      status: '1' | '2'; // 1-enabled, 2-disabled
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
      roles: string[]; // Role codes, not IDs
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

### Common Patterns

**Pagination handling:**

```typescript
// Query parameters
const query = ref({
  current: 1,
  size: 10,
  userName: '' // Optional filter
});

// Response structure
interface PageResult<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
}

// Fetch paginated data
const { data, loading } = await fetchUserList(query.value);
```

**Error handling:**

```typescript
try {
  await createUser(userData);
  window.$message?.success('创建成功');
} catch (error) {
  // Error is automatically handled by request interceptor
  // Error messages are displayed via window.$message
  console.error('Create user failed:', error);
}
```

## Environment Configuration

### Environment Variables

**.env.test (Development):**

```bash
# Backend API base URL
VITE_SERVICE_BASE_URL=http://127.0.0.1:8000

# Success code for API responses
VITE_SERVICE_SUCCESS_CODE=0000

# Token refresh error codes
VITE_SERVICE_EXPIRED_TOKEN_CODES=1002

# Logout error codes
VITE_SERVICE_LOGOUT_CODES=1003

# Modal logout error codes
VITE_SERVICE_MODAL_LOGOUT_CODES=1004

# HTTP proxy (Y = enable, N = disable)
VITE_HTTP_PROXY=N
```

**.env.prod (Production):**

```bash
VITE_SERVICE_BASE_URL=https://api.yourdomain.com
# ... other production-specific variables
```

### Vite Configuration

**Build settings:**

```typescript
// vite.config.ts
{
  base: '/your-base-path/',           // Base URL for deployment
  resolve: {
    alias: {
      '@': '/src',                  // @ alias for src directory
      '~': '/'                       // ~ alias for root directory
    }
  },
  server: {
    port: 9527,                    // Dev server port
    host: '0.0.0.0',            // Listen on all interfaces
    proxy: { ... }                  // API proxy configuration
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',       // Use modern SCSS compiler
        additionalData: '@use "@/styles/scss/global.scss" as *;'
      }
    }
  }
}
```

## Common Tasks

### Adding a Dictionary Module

1. **Create page component** (e.g., `src/views/system/dict/index.vue`)

   ```bash
   mkdir -p src/views/system/dict
   touch src/views/system/dict/index.vue
   ```

2. **Add route meta** (optional):

   ```typescript
   defineOptions({
     name: 'SystemDict',
     meta: {
       title: '字典管理',
       i18nKey: 'route.system_dict',
       icon: 'mdi:book-multiple'
     }
   });
   ```

3. **Regenerate route types**:

   ```bash
   pnpm gen-route
   ```

4. **Define types in `src/typings/api/`**:

   ```typescript
   declare namespace Api {
     namespace SystemManage {
       type DictType = Common.CommonRecord<{
         dictTypeId: string; // Use string for Snowflake IDs
         dictName: string;
         dictType: string;
         status: Api.Common.EnableStatus;
         remark: string | null;
       }>;

       type DictData = Common.CommonRecord<{
         dictCode: string; // Primary key (not dictDataId)
         dictType: string;
         dictLabel: string;
         dictValue: string;
         dictSort: number;
         cssClass: string | null;
         listClass: string | null;
         isDefault: 'Y' | 'N'; // Yes/No values
         status: Api.Common.EnableStatus;
       }>;
     }
   }
   ```

5. **Create API service in `src/service/api/`**:

   ```typescript
   export function fetchGetDictTypeList(params?: Api.SystemManage.DictTypeSearchParams) {
     return request<Api.SystemManage.DictTypeList>({
       url: '/system/dict-type/list',
       method: 'get',
       params
     });
   }

   export function fetchBatchDeleteDictType(data: string[]) {
     // Use string[]
     return request({
       url: '/system/dict-type/batch-delete',
       method: 'post',
       data
     });
   }
   ```

6. **Use in components**:

   ```vue
   <script setup lang="tsx">
   import { fetchBatchDeleteDictType } from '@/service/api';

   async function handleBatchDelete() {
     // ❌ Wrong: causes precision loss
     const { error } = await fetchBatchDeleteDictType(checkedRowKeys.value.map(Number));

     // ✅ Correct: preserves precision
     const { error } = await fetchBatchDeleteDictType(checkedRowKeys.value);
   }
   </script>
   ```

### Adding a New Page

1. **Create the page component:**

   ```bash
   mkdir -p src/views/example/module
   touch src/views/example/module/index.vue
   ```

2. **Add route meta (optional):**

   ```typescript
   // In the component's script setup
   defineOptions({
     name: 'ExampleModule',
     meta: {
       title: '示例模块',
       i18nKey: 'route.example_module',
       icon: 'mdi:example'
     }
   });
   ```

3. **Regenerate route types:**
   ```bash
   pnpm gen-route
   ```

### Adding a New API Endpoint

1. **Define types in `src/typings/api/`:**

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

2. **Create API service in `src/service/api/`:**

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

3. **Use in components:**

   ```vue
   <script setup lang="ts">
   import { fetchExampleList } from '@/service/api/example';

   const loadData = async () => {
     const data = await fetchExampleList({ current: 1, size: 10 });
     console.log(data);
   };
   </script>
   ```

### Adding a New Store Module

1. **Create store in `src/store/modules/`:**

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

2. **Use in components:**
   ```vue
   <script setup lang="ts">
   import { useExampleStore } from '@/store/modules/example';
   const exampleStore = useExampleStore();
   </script>
   ```

## Best Practices

### Code Organization

- **Component structure**: Use `<script setup>` with TypeScript
- **API services**: Separate API calls from business logic
- **State management**: Use Pinia stores for shared state
- **Type safety**: Always define types for API requests/responses
- **File naming**: Use kebab-case for files, PascalCase for components

### Dictionary Module Development

- **Follow role module pattern**: Use role/index.vue as a reference for consistent code style
- **Use ref over reactive**: Follow the pattern used in role-operate-drawer.vue for form models
- **Use NTag for status display**: Use success/warning/error theme colors to indicate status
- **Form validation**: Add minimum length validation where required (e.g., `min: 2` for dictName and dictType)
- **Internationalization**: Always use `$t()` for all user-facing text, including validation messages

### Performance

- **Lazy loading**: Routes are lazy-loaded by default
- **Code splitting**: Use dynamic imports for large libraries
- **Image optimization**: Use WebP format where possible
- **Bundle analysis**: Check bundle size before deployment

### Accessibility

- **Semantic HTML**: Use proper HTML5 semantic elements
- **ARIA attributes**: Add ARIA labels for screen readers
- **Keyboard navigation**: Ensure all interactive elements are keyboard accessible
- **Color contrast**: Meet WCAG AA standards (4.5:1)

### Security

- **XSS prevention**: Vue automatically escapes content in templates
- **CSRF protection**: Tokens are sent in Authorization header
- **Input validation**: Validate all user inputs
- **Sensitive data**: Never log passwords or tokens

### Code Organization

- **Component structure**: Use `<script setup>` with TypeScript
- **API services**: Separate API calls from business logic
- **State management**: Use Pinia stores for shared state
- **Type safety**: Always define types for API requests/responses
- **File naming**: Use kebab-case for files, PascalCase for components

### Performance

- **Lazy loading**: Routes are lazy-loaded by default
- **Code splitting**: Use dynamic imports for large libraries
- **Image optimization**: Use WebP format where possible
- **Bundle analysis**: Check bundle size before deployment

### Accessibility

- **Semantic HTML**: Use proper HTML5 semantic elements
- **ARIA attributes**: Add ARIA labels for screen readers
- **Keyboard navigation**: Ensure all interactive elements are keyboard accessible
- **Color contrast**: Meet WCAG AA standards (4.5:1)

### Security

- **XSS prevention**: Vue automatically escapes content in templates
- **CSRF protection**: Tokens are sent in Authorization header
- **Input validation**: Validate all user inputs
- **Sensitive data**: Never log passwords or tokens

## Common Pitfalls

1. **ID precision loss**: Snowflake IDs are returned as strings to prevent BigInt precision loss in JavaScript
2. **Dictionary data primary key**: Use `dictCode` (not `dictDataId`) - this is the actual primary key used by the backend
3. **Dictionary type primary key**: `dictTypeId` should be `string` type (not `number`) to prevent precision loss in batch operations
4. **isDefault field values**: Dictionary data `isDefault` field uses `'Y'` | `'N'` (not `0` | `1`)
5. **yesNoOptions**: Dictionary operations use yes/no values `'N'` | `'Y'` (not numeric values)
6. **Route parameters**: Use `query` parameters for navigation when route doesn't support dynamic params (e.g., `/system/dict/data?dictType=xxx` instead of `/system/dict/data/:dictType`)
7. **Validation messages**: Always use `$t()` for internationalization in form rules
8. **Batch delete data types**: Always pass `string[]` for Snowflake IDs, never use `.map(Number)` which causes precision loss
9. **Default values**: Set sensible defaults (e.g., `status: '1'` for enabled, `isDefault: 'N'` for not default)
10. **ID precision loss**: Snowflake IDs are returned as strings to prevent BigInt precision loss in JavaScript
11. **Case conversion**: Backend uses `snake_case`, frontend uses `camelCase` - handled automatically by request/response interceptors
12. **Token expiry**: Token refresh is handled automatically by the request interceptor
13. **Type safety**: Always define TypeScript types for API contracts
14. **Async operations**: Always use `await` for async operations and handle errors properly
15. **Component naming**: Use multi-word component names to avoid conflicts with HTML elements
16. **State mutation**: Only mutate state within the component that owns it; use props/events for parent-child communication
17. **CSS isolation**: Use scoped styles or CSS modules to avoid style conflicts

## Git Workflow

### Commit Message Format

```bash
# Conventional Commits format
pnpm commit          # English commit messages
pnpm commit:zh       # Chinese commit messages
```

### Pre-commit Hooks

```bash
# Pre-commit checks (run automatically)
pnpm typecheck        # TypeScript type checking
pnpm lint             # ESLint checking and fixing
git diff --exit-code  # Ensure files are committed
```

### Branch Strategy

- `main`: Production branch
- Feature branches: `feature/description`
- Bugfix branches: `fix/description`
- Release branches: `release/version`

## Troubleshooting

### Common Issues

**1. Port already in use:**

```bash
# Kill process using port 9527
lsof -ti:9527 | xargs kill -9

# Or use a different port in vite.config.ts
```

**2. API connection failed:**

```bash
# Check if backend is running
curl http://127.0.0.1:8000/docs

# Check environment variables
cat .env.test | grep VITE_SERVICE_BASE_URL
```

**3. Type errors:**

```bash
# Regenerate route types
pnpm gen-route

# Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P -> "TypeScript: Restart TS Server"
```

**4. Build fails:**

```bash
# Clear cache and reinstall
rm -rf node_modules dist .vite
pnpm install
pnpm build
```

## Additional Resources

- **NaiveUI Documentation**: https://www.naiveui.com/
- **Vue 3 Documentation**: https://vuejs.org/
- **Vite Documentation**: https://vitejs.dev/
- **TypeScript Documentation**: https://www.typescriptlang.org/
- **UnoCSS Documentation**: https://unocss.dev/
- **Backend API Docs**: http://127.0.0.1:8000/docs
- **Backend Source**: ../hohu-admin/
