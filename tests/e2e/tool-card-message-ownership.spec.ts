import { expect, test } from '@playwright/test';

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

const availableAgents = [
  {
    code: 'user_mgmt',
    name: 'User Management',
    description: 'E2E Agent',
    modelPreference: null,
    displayOrder: 1
  }
];

const availableModels = [
  {
    modelId: 'mock-model',
    label: 'Mock Model',
    providerCode: 'mock',
    capabilities: ['text']
  }
];

test('reload keeps every tool card inside its owning assistant message', async ({ page }) => {
  await page.route('**/ai/conversation/list*', route =>
    route.fulfill({ json: response({ records: [conversation], current: 1, size: 20, total: 1 }) })
  );
  await page.route(`**/ai/conversation/${conversation.conversationId}`, route =>
    route.fulfill({ json: response({ conversation, messages, pendingActions: [] }) })
  );
  await page.route('**/ai/chat/models*', route => route.fulfill({ json: response(availableModels) }));
  await page.route('**/ai/agents*', route => route.fulfill({ json: response(availableAgents) }));

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
