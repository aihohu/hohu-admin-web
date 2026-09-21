import { expect, test, type Page } from '@playwright/test';

const conversation = {
  conversationId: '9901',
  title: 'Automatic routing continuity',
  modelName: 'mock-model',
  systemPrompt: null,
  status: 0,
  createTime: '2026-09-15 10:00:00',
  updateTime: '2026-09-15 10:00:00'
};

function envelope(data: unknown) {
  return { code: 200, msg: 'success', data };
}

interface ChatRequestBody {
  traceId: string;
  agentCode?: string;
  messages: Array<{ parts?: Array<{ type: string; text?: string }> }>;
}

function message(messageId: string, role: 'user' | 'assistant', content: string, traceId: string): Api.Ai.Message {
  return {
    messageId,
    conversationId: conversation.conversationId,
    parentMessageId: null,
    role,
    messageType: 'text',
    content,
    parts: null,
    traceId,
    tokensInput: null,
    tokensOutput: null,
    createTime: '2026-09-15 10:00:00'
  };
}

async function mockAutomaticConversation(page: Page) {
  const requestBodies: ChatRequestBody[] = [];
  const persistedMessages: Api.Ai.Message[] = [];

  await page.route('**/ai/conversation/list*', route =>
    route.fulfill({ json: envelope({ records: [conversation], current: 1, size: 20, total: 1 }) })
  );
  await page.route(`**/ai/conversation/${conversation.conversationId}`, route =>
    route.fulfill({ json: envelope({ conversation, messages: persistedMessages, pendingActions: [] }) })
  );
  await page.route('**/ai/chat/models*', route =>
    route.fulfill({
      json: envelope([{ modelId: 'mock-model', label: 'Mock Model', providerCode: 'mock', capabilities: ['text'] }])
    })
  );
  await page.route('**/ai/agents*', route =>
    route.fulfill({
      json: envelope([
        {
          code: 'user_mgmt',
          name: 'User Management',
          description: 'E2E Agent',
          modelPreference: null,
          displayOrder: 1
        }
      ])
    })
  );
  await page.route('**/ai/chat', async route => {
    if (route.request().resourceType() === 'document') return route.continue();
    const body = route.request().postDataJSON() as ChatRequestBody;
    requestBodies.push(body);
    const traceId = String(body.traceId);
    const turn = requestBodies.length;
    const source = body.messages.at(-1);
    const userMessageId = `user-${turn}`;
    const assistantMessageId = `assistant-${turn}`;
    const userContent = source?.parts?.find(part => part.type === 'text')?.text || '';
    persistedMessages.push(
      message(userMessageId, 'user', userContent, traceId),
      message(assistantMessageId, 'assistant', `answer-${turn}`, traceId)
    );
    const done = {
      type: 'done',
      traceId,
      messageId: assistantMessageId,
      persistence: 'committed',
      projection: 'updated'
    };
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body: `data: ${JSON.stringify(done)}\n\n` });
  });

  return requestBodies;
}

test('automatic mode reroutes after a greeting and supplies every turn to the contextual router', async ({ page }) => {
  const requestBodies = await mockAutomaticConversation(page);
  await page.goto('/ai/chat');
  await page.getByText(conversation.title, { exact: true }).click();

  const input = page.locator('.input-textarea');
  await input.fill('你好');
  await input.press('Enter');
  await expect.poll(() => requestBodies.length).toBe(1);
  await expect(page.getByText('answer-1', { exact: true })).toBeVisible();

  await input.fill('当前有多少用户');
  await input.press('Enter');
  await expect.poll(() => requestBodies.length).toBe(2);
  await expect(page.getByText('answer-2', { exact: true })).toBeVisible();

  expect(requestBodies[0].agentCode).toBe('auto');
  expect(requestBodies[1].agentCode).toBe('auto');

  await input.fill('都是哪些');
  await input.press('Enter');
  await expect(page.getByText('answer-3', { exact: true })).toBeVisible();
  expect(requestBodies[2].agentCode).toBe('auto');

  await page.reload();
  await page.getByText(conversation.title, { exact: true }).click();
  await input.fill('当前有多少角色');
  await input.press('Enter');
  await expect(page.getByText('answer-4', { exact: true })).toBeVisible();
  expect(requestBodies[3].agentCode).toBe('auto');
});
