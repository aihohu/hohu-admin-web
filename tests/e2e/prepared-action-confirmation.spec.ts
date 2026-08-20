import { expect, test, type Page } from '@playwright/test';

const conversation = {
  conversationId: '7001',
  title: 'Prepared E2E',
  modelName: 'mock-model',
  systemPrompt: null,
  status: 0,
  createTime: '2026-08-11 09:00:00',
  updateTime: '2026-08-11 09:00:00'
};

const presentation = {
  title: '确认导入用户',
  summary: '将导入 2 个用户',
  fields: [
    { label: 'new', value: 2, tone: 'success' },
    { label: 'onConflict', value: 'skip' }
  ],
  warnings: []
};

const pendingAction = {
  actionId: '9001',
  confirmationId: 'cid_prepared_e2e_9001',
  sourceUserMessageId: '7101',
  traceId: 'tr_prepared_e2e_9001',
  tool: 'user.import_execute',
  toolCallId: 'tc_execute_e2e_9001',
  sourceToolCallId: 'tc_preview_e2e_9001',
  interactionFlow: 'prepared',
  presentation,
  expiresAt: '2099-08-11T09:10:00Z'
};

const exportPresentation = {
  title: '确认导出用户',
  summary: '将导出约 12 行用户数据到 xlsx 文件（30 天后过期清理）',
  fields: [
    { label: 'reason', value: '用户要求导出全部用户列表' },
    { label: 'affectedCount', value: 12 }
  ],
  warnings: []
};

const exportPendingAction = {
  ...pendingAction,
  actionId: '9002',
  confirmationId: 'cid_export_e2e_9002',
  traceId: 'tr_export_e2e_9002',
  tool: 'user.export',
  toolCallId: 'tc_export_e2e_9002',
  sourceToolCallId: null,
  interactionFlow: 'direct',
  presentation: exportPresentation
};

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

function response(data: unknown) {
  return { code: 200, msg: 'success', data };
}

function terminalMessages() {
  return [
    {
      messageId: '7201',
      conversationId: conversation.conversationId,
      parentMessageId: pendingAction.sourceUserMessageId,
      role: 'assistant',
      messageType: 'text',
      content: '',
      parts: null,
      traceId: pendingAction.traceId,
      toolCalls: [
        {
          tool: 'user.import_preview',
          tool_call_id: pendingAction.sourceToolCallId,
          summary: 'Prepare user import',
          args: { file_id: 'opaque-file-id', requested_outcome: 'execute_if_approved' },
          risk: 'low',
          trace_id: pendingAction.traceId,
          ok: true,
          result: { total: 2, summary: { new: 2 } },
          duration_ms: 3
        },
        {
          tool: pendingAction.tool,
          tool_call_id: pendingAction.toolCallId,
          summary: presentation.title,
          args: presentation,
          risk: 'high',
          trace_id: pendingAction.traceId,
          ok: true,
          result: { successCount: 2 },
          duration_ms: 12
        }
      ],
      tokensInput: null,
      tokensOutput: null,
      createTime: '2026-08-11 09:00:01'
    }
  ];
}

async function mockChatShell(page: Page, state: { pending: boolean; terminal: boolean }) {
  await page.route('**/ai/conversation/list*', route =>
    route.fulfill({
      json: response({ records: [conversation], current: 1, size: 20, total: 1 })
    })
  );
  await page.route(`**/ai/conversation/${conversation.conversationId}`, route =>
    route.fulfill({
      json: response({
        conversation,
        messages: state.terminal ? terminalMessages() : [],
        pendingActions: state.pending ? [pendingAction] : []
      })
    })
  );
  await page.route('**/ai/chat/models*', route => route.fulfill({ json: response(availableModels) }));
  await page.route('**/ai/agents*', route => route.fulfill({ json: response(availableAgents) }));
}

async function mockExportConfirmation(page: Page) {
  await page.route('**/ai/conversation/list*', route =>
    route.fulfill({
      json: response({ records: [conversation], current: 1, size: 20, total: 1 })
    })
  );
  await page.route(`**/ai/conversation/${conversation.conversationId}`, route =>
    route.fulfill({
      json: response({
        conversation,
        messages: [],
        pendingActions: [exportPendingAction]
      })
    })
  );
  await page.route('**/ai/chat/models*', route => route.fulfill({ json: response(availableModels) }));
  await page.route('**/ai/agents*', route => route.fulfill({ json: response(availableAgents) }));
}

async function openConversation(page: Page) {
  await page.goto('/ai/chat');
  await page.getByText(conversation.title, { exact: true }).click();
}

async function approveAndAssertSafeRequest(page: Page, state: { pending: boolean; terminal: boolean }) {
  let confirmBody: Record<string, unknown> | null = null;
  await page.route('**/ai/confirm', async route => {
    confirmBody = route.request().postDataJSON();
    state.pending = false;
    state.terminal = true;
    await route.fulfill({
      json: response({
        actionId: pendingAction.actionId,
        toolCallId: pendingAction.toolCallId,
        status: 'succeeded'
      })
    });
  });

  await page.getByTestId('ai-confirm-approve').click();

  await expect(page.locator('.n-message--success-type').filter({ hasText: '操作已执行成功' })).toBeVisible();
  await expect(page.locator('.n-message--warning-type')).toHaveCount(0);
  expect(confirmBody).toEqual({
    confirmationId: pendingAction.confirmationId,
    action: 'approve'
  });
  expect(JSON.stringify(confirmBody)).not.toContain('preview_token');
}

test('执行意图自动进入安全确认并由 confirm API 完成执行', async ({ page }) => {
  const state = { pending: false, terminal: false };
  await mockChatShell(page, state);
  await page.route('**/ai/chat', async route => {
    if (route.request().resourceType() === 'document') {
      await route.continue();
      return;
    }

    state.pending = true;
    const body = [
      {
        type: 'tool_call_started',
        tool: 'user.import_preview',
        toolCallId: pendingAction.sourceToolCallId,
        summary: 'Prepare user import',
        args: { file_id: 'opaque-file-id' },
        risk: 'low',
        traceId: pendingAction.traceId
      },
      {
        type: 'tool_call_result',
        tool: 'user.import_preview',
        toolCallId: pendingAction.sourceToolCallId,
        ok: true,
        durationMs: 3,
        result: { total: 2, summary: { new: 2 } }
      },
      {
        type: 'confirmation_required',
        confirmationId: pendingAction.confirmationId,
        actionId: pendingAction.actionId,
        tool: pendingAction.tool,
        toolCallId: pendingAction.toolCallId,
        sourceToolCallId: pendingAction.sourceToolCallId,
        interactionFlow: 'prepared',
        summary: presentation.summary,
        presentation,
        expiresAt: pendingAction.expiresAt
      },
      { type: 'done', traceId: pendingAction.traceId, persistence: 'committed' }
    ]
      .map(event => `data: ${JSON.stringify(event)}\n\n`)
      .join('');
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body });
  });

  await openConversation(page);
  await page.locator('.input-textarea').fill('导入用户');
  await page.locator('.input-textarea').press('Enter');

  await expect(page.locator('.n-drawer')).toBeVisible();
  await expect(page.locator('.n-drawer')).toContainText('批量导入用户');
  await expect(page.locator('.n-drawer')).toContainText('确认导入');
  await expect(page.locator('.n-drawer')).toContainText('将新增');
  await expect(page.locator('.n-drawer')).not.toContainText('preview_token');
  await approveAndAssertSafeRequest(page, state);
});

test('刷新后从 conversation detail 恢复同一 pending action', async ({ page }) => {
  const state = { pending: true, terminal: false };
  await mockChatShell(page, state);
  await openConversation(page);
  await expect(page.locator('.n-drawer')).toBeVisible();

  await page.reload();
  await page.getByText(conversation.title, { exact: true }).click();

  await expect(page.locator('.n-drawer')).toContainText('批量导入用户');
  await expect(page.locator('.n-drawer')).toContainText('确认导入');
  await expect(page.locator('.n-drawer')).not.toContainText('preview_token');
  await approveAndAssertSafeRequest(page, state);
});

test('preview_only 只展示预览且不产生确认 action', async ({ page }) => {
  const state = { pending: false, terminal: false };
  await mockChatShell(page, state);
  await page.route('**/ai/chat', async route => {
    if (route.request().resourceType() === 'document') {
      await route.continue();
      return;
    }

    const body = [
      {
        type: 'tool_call_started',
        tool: 'user.import_preview',
        toolCallId: 'tc_preview_only_e2e',
        summary: 'Prepare user import',
        args: { file_id: 'opaque-file-id', requested_outcome: 'preview_only' },
        risk: 'low',
        traceId: 'tr_preview_only_e2e'
      },
      {
        type: 'tool_call_result',
        tool: 'user.import_preview',
        toolCallId: 'tc_preview_only_e2e',
        ok: true,
        durationMs: 3,
        result: { total: 2, summary: { new: 2 } }
      },
      { type: 'done', traceId: 'tr_preview_only_e2e', persistence: 'committed' }
    ]
      .map(event => `data: ${JSON.stringify(event)}\n\n`)
      .join('');
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body });
  });

  await openConversation(page);
  await page.locator('.input-textarea').fill('只预览用户导入');
  await page.locator('.input-textarea').press('Enter');

  await expect(page.locator('.n-drawer')).toBeHidden();
  await expect(page.getByText('user.import_preview', { exact: true })).toBeVisible();
});

test('用户导出确认抽屉显示国际化工具、动态摘要和参数标签', async ({ page }) => {
  await mockExportConfirmation(page);
  await openConversation(page);

  const drawer = page.locator('.n-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('导出用户列表 (user.export)');
  await expect(drawer).toContainText('将导出约 12 行用户数据到 xlsx 文件（30 天后过期清理）');
  await expect(drawer).toContainText('业务理由');
  await expect(drawer).toContainText('用户要求导出全部用户列表');
  await expect(drawer).toContainText('预计导出行数');
});
