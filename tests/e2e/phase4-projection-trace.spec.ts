import { expect, test, type Page } from '@playwright/test';

const conversation = {
  conversationId: '9401',
  title: 'Phase 4 projection',
  modelName: 'mock-model',
  systemPrompt: null,
  status: 0,
  createTime: '2026-08-24T08:00:00Z',
  updateTime: '2026-08-24T08:00:00Z'
};

const traceId = 'tr_phase4_projection_e2e';
const resultSentinel = 'PHASE4_REVOKED_RESULT_SENTINEL';
const rawSentinel = 'PHASE4_RAW_AUDIT_SENTINEL';

function response(data: unknown) {
  return { code: 200, msg: 'success', data };
}

function authorizedMessage() {
  return {
    messageId: '9411',
    conversationId: conversation.conversationId,
    parentMessageId: '9410',
    role: 'assistant',
    messageType: 'text',
    content: resultSentinel,
    parts: null,
    traceId,
    toolCalls: [
      {
        tool: 'user.export',
        tool_call_id: 'tc_phase4_export',
        summary: 'Export users',
        args: { safe: 'metadata' },
        risk: 'high',
        trace_id: traceId,
        ok: true,
        result: { exported: 2 },
        duration_ms: 12,
        ui: {
          viewType: 'detail_card',
          viewData: {
            title: 'Export ready',
            fields: [{ label: 'rows', value: 2 }],
            downloadUrl: '/ai/tool-result/download/phase4-token',
            downloadFilename: 'phase4.xlsx'
          }
        }
      }
    ],
    tokensInput: null,
    tokensOutput: null,
    createTime: '2026-08-24T08:00:01Z'
  };
}

function tombstone() {
  return {
    messageId: '9411',
    role: 'assistant',
    status: 'redacted',
    errorCode: 'AI_RESULT_PROJECTION_FORBIDDEN'
  };
}

async function mockChat(page: Page, state: { revoked: boolean }) {
  await page.route('**/ai/conversation/list*', route =>
    route.fulfill({ json: response({ records: [conversation], current: 1, size: 20, total: 1 }) })
  );
  await page.route(`**/ai/conversation/${conversation.conversationId}`, route =>
    route.fulfill({
      json: response({
        conversation,
        messages: [state.revoked ? tombstone() : authorizedMessage()],
        pendingActions: state.revoked
          ? [
              {
                confirmationId: 'cid_phase4_redacted',
                status: 'expired',
                errorCode: 'AI_RESULT_PROJECTION_FORBIDDEN',
                finishedAt: '2026-08-24T08:00:02Z'
              }
            ]
          : []
      })
    })
  );
  await page.route('**/ai/chat/models*', route =>
    route.fulfill({
      json: response([{ modelId: 'mock-model', label: 'Mock Model', providerCode: 'mock', capabilities: ['text'] }])
    })
  );
  await page.route('**/ai/agents*', route =>
    route.fulfill({
      json: response([
        { code: 'user_mgmt', name: 'User Management', description: 'Phase 4', modelPreference: null, displayOrder: 1 }
      ])
    })
  );
}

async function openConversation(page: Page) {
  await page.goto('/ai/chat');
  await page.getByText(conversation.title, { exact: true }).click();
}

test('reload replaces cached result, download, and pending presentation with tombstones after revocation', async ({
  page
}) => {
  const state = { revoked: false };
  let downloads = 0;
  await mockChat(page, state);
  await page.route('**/ai/tool-result/download/phase4-token', route => {
    downloads += 1;
    return route.fulfill({ status: 200, contentType: 'application/octet-stream', body: 'phase4' });
  });

  await openConversation(page);
  await expect(page.getByText(resultSentinel, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /下载文件/ }).click();
  await expect.poll(() => downloads).toBe(1);

  state.revoked = true;
  await page.reload();
  await page.getByText(conversation.title, { exact: true }).click();

  await expect(page.getByTestId('ai-message-tombstone')).toBeVisible();
  await expect(page.getByTestId('ai-pending-action-redacted')).toBeVisible();
  await expect(page.getByText(resultSentinel, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /下载文件/ })).toHaveCount(0);
});

test('owner can reject a recovered action after execution permission is revoked', async ({ page }) => {
  let confirmBody: Record<string, string> | null = null;
  await mockChat(page, { revoked: false });
  await page.route(`**/ai/conversation/${conversation.conversationId}`, route =>
    route.fulfill({
      json: response({
        conversation,
        messages: [],
        pendingActions: [
          {
            actionId: '9451',
            confirmationId: 'cid_phase4_reject',
            sourceUserMessageId: '9450',
            traceId,
            tool: 'user.update',
            toolCallId: 'tc_phase4_reject',
            sourceToolCallId: null,
            interactionFlow: 'direct',
            presentation: { title: 'Update user', summary: 'Safe summary', fields: [], warnings: [] },
            expiresAt: '2099-08-24T08:05:00Z'
          }
        ]
      })
    })
  );
  await page.route('**/ai/confirm', async route => {
    confirmBody = route.request().postDataJSON() as Record<string, string>;
    await route.fulfill({
      json: response({ actionId: '9451', toolCallId: 'tc_phase4_reject', status: 'rejected' })
    });
  });
  await page.route('**/ai/agents*', route =>
    route.fulfill({
      status: 403,
      json: { code: 403, msg: 'forbidden', data: null, errorCode: 'AI_CHAT_PERMISSION_DENIED' }
    })
  );

  await openConversation(page);
  await expect(page.getByTestId('ai-confirmation-drawer')).toBeVisible();
  await page.getByTestId('ai-confirm-reject').click();

  await expect.poll(() => confirmBody).toEqual({ confirmationId: 'cid_phase4_reject', action: 'reject' });
});

test('auditor opens a safe Trace detail and never sees raw message or arguments', async ({ page }) => {
  await page.route('**/ai/operation-log/traces?*', route =>
    route.fulfill({
      json: response({
        records: [
          {
            traceId,
            actorId: '7',
            actorName: 'audited-user',
            agentCodes: ['user_mgmt'],
            toolNames: ['user.lookup'],
            statuses: ['success'],
            operationCount: 1,
            queuedAt: '2026-08-24T08:00:00Z',
            finishedAt: '2026-08-24T08:00:01Z'
          }
        ],
        total: 1,
        current: 1,
        size: 20
      })
    })
  );
  await page.route(`**/ai/operation-log/traces/${traceId}`, route =>
    route.fulfill({
      json: response({
        traceId,
        conversationId: '9401',
        operations: [
          {
            logId: '9461',
            toolCallId: 'tc_trace_phase4',
            toolName: 'user.lookup',
            agentCode: 'user_mgmt',
            actorId: '7',
            actorName: 'audited-user',
            sourceMessageId: '9450',
            sourceMessageRole: 'user',
            sourceMessageAt: '2026-08-24T08:00:00Z',
            targetSummary: [{ type: 'user', id: '42' }],
            executionMode: 'autonomous',
            riskLevel: 'low',
            status: 'success',
            errorCode: null,
            confirmationId: null,
            approvedBy: null,
            queuedAt: '2026-08-24T08:00:00Z',
            startedAt: '2026-08-24T08:00:00Z',
            finishedAt: '2026-08-24T08:00:01Z',
            durationMs: 10,
            hitlWaitMs: 0,
            content: rawSentinel,
            rawArgs: rawSentinel
          }
        ]
      })
    })
  );

  await page.goto(`/ai/trace?traceId=${traceId}`);
  await expect(page.getByTestId('ai-trace-list')).toContainText(traceId);
  await page.getByRole('button', { name: '详情' }).click();
  await expect(page.getByTestId('ai-trace-detail')).toContainText('user:42');
  await expect(page.getByText(rawSentinel)).toHaveCount(0);
});
