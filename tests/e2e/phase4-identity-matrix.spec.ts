import { expect, test, type Page } from '@playwright/test';

type Availability = 'forbidden' | 'no_agents' | 'ready';

interface IdentityCase {
  id: string;
  agents: string[];
  availability: Availability;
  canWrite: boolean;
  eastScoped: boolean;
}

const identities: IdentityCase[] = [
  {
    id: 'super-admin',
    agents: ['user_mgmt', 'dept_mgmt', 'role_mgmt'],
    availability: 'ready',
    canWrite: true,
    eastScoped: false
  },
  {
    id: 'east-delegated-role-admin',
    agents: ['user_mgmt', 'role_mgmt'],
    availability: 'ready',
    canWrite: true,
    eastScoped: true
  },
  {
    id: 'east-department-admin',
    agents: ['user_mgmt', 'dept_mgmt'],
    availability: 'ready',
    canWrite: true,
    eastScoped: true
  },
  {
    id: 'east-target-user',
    agents: ['user_mgmt'],
    availability: 'ready',
    canWrite: false,
    eastScoped: true
  },
  {
    id: 'headquarters-outside-user',
    agents: [],
    availability: 'no_agents',
    canWrite: false,
    eastScoped: false
  },
  {
    id: 'east-high-privilege-user',
    agents: ['user_mgmt', 'dept_mgmt'],
    availability: 'ready',
    canWrite: false,
    eastScoped: true
  },
  {
    id: 'read-only-auditor',
    agents: [],
    availability: 'forbidden',
    canWrite: false,
    eastScoped: false
  },
  {
    id: 'read-only-business-viewer',
    agents: ['user_mgmt'],
    availability: 'ready',
    canWrite: false,
    eastScoped: true
  },
  {
    id: 'destructive-button-operator',
    agents: [],
    availability: 'no_agents',
    canWrite: false,
    eastScoped: false
  },
  {
    id: 'user-without-agent-binding',
    agents: [],
    availability: 'no_agents',
    canWrite: false,
    eastScoped: false
  },
  {
    id: 'user-without-ai-entry',
    agents: ['user_mgmt'],
    availability: 'forbidden',
    canWrite: false,
    eastScoped: false
  }
];

const conversation = {
  conversationId: '9701',
  title: 'Identity matrix',
  modelName: 'mock-model',
  systemPrompt: null,
  status: 0,
  createTime: '2026-08-24T09:00:00Z',
  updateTime: '2026-08-24T09:00:00Z'
};

function envelope(data: unknown) {
  return { code: 200, msg: 'success', data };
}

function agent(code: string) {
  return {
    code,
    name: `E2E ${code}`,
    description: `Deterministic identity fixture for ${code}`,
    modelPreference: null,
    displayOrder: 1
  };
}

async function mockIdentity(page: Page, identity: IdentityCase) {
  await page.route('**/ai/conversation/list*', route =>
    route.fulfill({ json: envelope({ records: [conversation], current: 1, size: 20, total: 1 }) })
  );
  await page.route(`**/ai/conversation/${conversation.conversationId}`, route =>
    route.fulfill({ json: envelope({ conversation, messages: [], pendingActions: [] }) })
  );
  await page.route('**/ai/chat/models*', route => {
    if (identity.availability === 'forbidden') {
      return route.fulfill({
        status: 403,
        json: { code: 403, msg: 'forbidden', data: null, errorCode: 'AI_CHAT_PERMISSION_DENIED' }
      });
    }
    return route.fulfill({
      json: envelope([{ modelId: 'mock-model', label: 'Mock Model', providerCode: 'mock', capabilities: ['text'] }])
    });
  });
  await page.route('**/ai/agents*', route => {
    if (identity.availability === 'forbidden') {
      return route.fulfill({
        status: 403,
        json: { code: 403, msg: 'forbidden', data: null, errorCode: 'AI_CHAT_PERMISSION_DENIED' }
      });
    }
    return route.fulfill({ json: envelope(identity.agents.map(agent)) });
  });
  await page.route('**/ai/chat', route => {
    if (route.request().resourceType() === 'document') return route.continue();
    const event = identity.canWrite
      ? {
          type: 'tool_call_result',
          tool: 'user.lookup',
          toolCallId: `tc_${identity.id}`,
          ok: true,
          durationMs: 3,
          result: {
            matches: identity.eastScoped
              ? [{ userName: 'AI_MVP_E2E_EAST_VISIBLE' }]
              : [{ userName: 'AI_MVP_E2E_GLOBAL_VISIBLE' }]
          }
        }
      : {
          type: 'ai_error',
          errorCode: 'AI_TOOL_PERMISSION_DENIED',
          message: 'Write tool is not granted'
        };
    const body = [`data: ${JSON.stringify(event)}\n\n`, `data: ${JSON.stringify({ type: 'done' })}\n\n`].join('');
    return route.fulfill({ status: 200, contentType: 'text/event-stream', body });
  });
}

for (const identity of identities) {
  test(`${identity.id} exposes only its deterministic Phase 4 UI capability`, async ({ page }) => {
    await mockIdentity(page, identity);
    await page.goto('/ai/chat');

    if (identity.availability !== 'ready') {
      await expect(page.getByTestId('ai-chat-availability')).toHaveAttribute('data-state', identity.availability);
      await expect(page.getByTestId('ai-agent-selector')).toHaveCount(0);
      return;
    }

    await expect(page.getByTestId('ai-agent-selector')).toBeVisible();
    await page.getByTestId('ai-agent-selector').click();
    for (const code of identity.agents) {
      await expect(page.getByText(`E2E ${code}`, { exact: true })).toBeVisible();
    }
    for (const code of ['user_mgmt', 'dept_mgmt', 'role_mgmt'].filter(
      candidateAgentCode => !identity.agents.includes(candidateAgentCode)
    )) {
      await expect(page.getByText(`E2E ${code}`, { exact: true })).toHaveCount(0);
    }
    await page.keyboard.press('Escape');

    await page.getByText(conversation.title, { exact: true }).click();
    await page
      .locator('.input-textarea')
      .fill(identity.canWrite ? 'Run the scoped lookup fixture' : 'Attempt a write outside this read-only identity');
    await page.locator('.input-textarea').press('Enter');
    if (identity.canWrite) {
      await expect(page.locator(`.tool-card[data-tool="user.lookup"]`)).toHaveAttribute('data-status', 'success');
      await expect(page.locator('body')).not.toContainText('AI_MVP_E2E_HEADQUARTERS_HIDDEN');
    } else {
      await expect(page.locator('.n-message--error-type')).toBeVisible();
      await expect(page.locator('.tool-card')).toHaveCount(0);
    }
  });
}
