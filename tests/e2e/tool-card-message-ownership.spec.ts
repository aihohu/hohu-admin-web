import { expect, test, type Page } from '@playwright/test';

const conversation = {
  conversationId: '8801',
  title: 'Per-message cards',
  modelName: 'mock-model',
  systemPrompt: null,
  status: 0,
  createTime: '2026-08-12 10:00:00',
  updateTime: '2026-08-12 10:00:00'
};

function response(data: unknown) {
  return { code: 200, msg: 'success', data };
}

function assistant(messageId: string, parentMessageId: string, toolCallIds: string[], content: string) {
  return {
    messageId,
    conversationId: conversation.conversationId,
    parentMessageId,
    role: 'assistant',
    messageType: 'text',
    content,
    parts: null,
    traceId: `tr_${messageId.padStart(32, '0')}`,
    toolCalls: toolCallIds.map(toolCallId => ({
      tool: `test.${toolCallId}`,
      tool_call_id: toolCallId,
      summary: toolCallId,
      args: {},
      risk: 'low',
      ok: true,
      result: { ok: true },
      duration_ms: 4
    })),
    tokensInput: null,
    tokensOutput: null,
    createTime: '2026-08-12 10:00:01'
  };
}

const messages = [
  assistant('8811', '8802', ['tc-first'], 'first answer'),
  assistant('8812', '8803', ['tc-second', 'tc-third'], 'second answer'),
  assistant('8813', '8804', ['tc-only'], '')
];

async function mockAuthenticatedShell(page: Page) {
  await page.route('**/auth/getConstantRoutes*', route =>
    route.fulfill({
      json: response([
        {
          id: 'route-login',
          name: 'login',
          path: '/login/:module(pwd-login|code-login|register|reset-pwd|bind-wechat)?',
          component: 'layout.blank$view.login',
          props: true,
          meta: { title: 'login', constant: true, hideInMenu: true }
        }
      ])
    })
  );
  await page.route('**/auth/login', route =>
    route.fulfill({ json: response({ token: 'e2e-token', refreshToken: 'e2e-refresh-token' }) })
  );
  await page.route('**/auth/getUserInfo', route =>
    route.fulfill({
      json: response({ userId: '1', userName: 'e2e', userAvatar: '', roles: ['R_SUPER'], buttons: [] })
    })
  );
  await page.route('**/auth/getUserRoutes', route =>
    route.fulfill({
      json: response({
        home: 'home',
        routes: [
          {
            id: 'route-home',
            name: 'home',
            path: '/home',
            component: 'layout.base$view.home',
            meta: { title: 'home' }
          },
          {
            id: 'route-ai',
            name: 'ai',
            path: '/ai',
            component: 'layout.base',
            meta: { title: 'ai' },
            children: [
              {
                id: 'route-ai-chat',
                name: 'ai_chat',
                path: '/ai/chat',
                component: 'view.ai_chat',
                meta: { title: 'ai_chat' }
              }
            ]
          }
        ]
      })
    })
  );
  await page.route('**/api/v1/contributes/**', route => route.fulfill({ json: response({ menus: [], pages: [] }) }));
}

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('hohu123456');
  await page.getByRole('button', { name: '确认' }).click();
  await page.waitForURL('**/home**');
}

test('reload keeps every tool card inside its owning assistant message', async ({ page }) => {
  await mockAuthenticatedShell(page);
  await page.route('**/ai/conversation/list*', route =>
    route.fulfill({ json: response({ records: [conversation], current: 1, size: 20, total: 1 }) })
  );
  await page.route(`**/ai/conversation/${conversation.conversationId}`, route =>
    route.fulfill({ json: response({ conversation, messages, pendingActions: [] }) })
  );
  await page.route('**/ai/provider/models*', route => route.fulfill({ json: response([]) }));
  await page.route('**/ai/agents*', route => route.fulfill({ json: response([]) }));

  await login(page);
  await page.goto('/ai/chat');
  await page.getByText(conversation.title, { exact: true }).click();

  const first = page.locator('[data-message-id="8811"]');
  const second = page.locator('[data-message-id="8812"]');
  const toolOnly = page.locator('[data-message-id="8813"]');
  await expect(first.locator('.tool-card')).toHaveCount(1);
  await expect(first.locator('.tool-name')).toHaveText('test.tc-first');
  await expect(second.locator('.tool-name')).toHaveText(['test.tc-second', 'test.tc-third']);
  await expect(toolOnly.locator('.tool-card')).toHaveCount(1);
  await expect(toolOnly.locator('.msg-bubble')).toHaveCount(0);
  await expect(page.locator('.tool-call-list')).toHaveCount(0);

  await page.reload();
  await page.getByText(conversation.title, { exact: true }).click();
  await expect(page.locator('[data-message-id="8811"] .tool-name')).toHaveText('test.tc-first');
  await expect(page.locator('[data-message-id="8812"] .tool-name')).toHaveText(['test.tc-second', 'test.tc-third']);
});
