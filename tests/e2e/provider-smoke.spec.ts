import { expect, test, type Page } from '@playwright/test';

interface Envelope<T> {
  code: number;
  msg: string;
  data: T;
  errorCode?: string;
}

interface AgentOption {
  code: string;
  name: string;
}

interface ModelOption {
  modelId: string;
  label: string;
  providerCode: string;
}

interface ListRecord {
  userId?: string;
  userName?: string;
  deptId?: string;
  deptName?: string;
  roleId?: string;
  roleCode?: string;
  children?: ListRecord[];
}

interface PageData {
  records: ListRecord[];
}

interface TraceDetail {
  operations: Array<{
    agentCode: string;
    toolName: string;
  }>;
}

type Method = 'DELETE' | 'GET';

const requiredEnvironment = [
  'AI_E2E_ADMIN_USERNAME',
  'AI_E2E_ADMIN_PASSWORD',
  'AI_E2E_PROVIDER_CODE',
  'AI_E2E_PROVIDER_MODEL_ID',
  'AI_E2E_PRIMARY_DEPT_ID',
  'AI_E2E_PARENT_DEPT_ID'
] as const;

function environment() {
  const missing = requiredEnvironment.filter(name => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Provider E2E credentials are required: ${missing.join(', ')}`);
  }
  return Object.fromEntries(requiredEnvironment.map(name => [name, process.env[name] as string])) as Record<
    (typeof requiredEnvironment)[number],
    string
  >;
}

async function accessToken(page: Page) {
  const token = await page.evaluate(() => {
    const raw = localStorage.getItem('SOY_token');
    return raw ? (JSON.parse(raw) as string) : null;
  });
  if (!token) throw new Error('Provider E2E login did not persist an access token');
  return token;
}

async function api<T>(page: Page, token: string, method: Method, path: string): Promise<T> {
  const response = await page.request.fetch(`/proxy-default${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` }
  });
  const raw = await response.text();
  const envelope = JSON.parse(raw) as Envelope<T>;
  if (!response.ok() || envelope.code !== 200) {
    throw new Error(`${method} ${path} failed: ${response.status()} ${String(envelope.errorCode)} ${raw}`);
  }
  return envelope.data;
}

async function login(page: Page, userName: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder('请输入用户名').fill(userName);
  await page.getByPlaceholder('请输入密码').fill(password);
  await page.getByRole('button', { name: '确认' }).click();
  await expect(page).toHaveURL(/\/home(?:[/?#]|$)/);
}

async function selectModel(page: Page, modelLabel: string) {
  await page.getByTestId('ai-model-selector').click();
  await page.getByText(modelLabel, { exact: true }).last().click();
  await expect(page.getByTestId('ai-model-selector')).toContainText(modelLabel);
}

async function selectAgent(page: Page, agentName: string) {
  await page.getByTestId('ai-agent-selector').click();
  await page.getByText(agentName, { exact: true }).last().click();
  await expect(page.getByTestId('ai-agent-selector')).toContainText(agentName);
}

async function invokeTool(page: Page, prompt: string, tool: string, approve: boolean) {
  await expect(page.locator('.input-action-btn--stop')).toHaveCount(0, { timeout: 60_000 });
  const prior = await page.locator(`.tool-card[data-tool="${tool}"]`).count();
  await page.locator('.input-textarea').fill(prompt);
  await page.locator('.input-textarea').press('Enter');
  const card = page.locator(`.tool-card[data-tool="${tool}"]`).nth(prior);
  await expect(card).toBeVisible({ timeout: 60_000 });
  if (approve) {
    await expect(page.getByTestId('ai-confirmation-drawer')).toBeVisible();
    await page.getByTestId('ai-confirm-approve').click();
  }
  await expect(card).toHaveAttribute('data-status', 'success', { timeout: 60_000 });
  await expect(page.locator('.input-action-btn--stop')).toHaveCount(0, { timeout: 60_000 });
  const traceId = await card.getAttribute('data-trace-id');
  if (!traceId) throw new Error(`${tool} did not expose its actual trace ID`);
  return traceId;
}

async function findRecord(page: Page, token: string, path: string, predicate: (record: ListRecord) => boolean) {
  const result = await api<PageData>(page, token, 'GET', path);
  return result.records.find(predicate);
}

async function actualTraceAgent(page: Page, token: string, traceId: string, toolName: string) {
  const trace = await api<TraceDetail>(page, token, 'GET', `/ai/operation-log/traces/${encodeURIComponent(traceId)}`);
  const operation = trace.operations.find(item => item.toolName === toolName);
  if (!operation) throw new Error(`Trace ${traceId} does not contain ${toolName}`);
  return operation.agentCode;
}

function findTreeRecord(records: ListRecord[], predicate: (record: ListRecord) => boolean): ListRecord | undefined {
  for (const record of records) {
    if (predicate(record)) return record;
    const nested = findTreeRecord(record.children || [], predicate);
    if (nested) return nested;
  }
  return undefined;
}

test('real provider routes read and controlled writes through all three management Agents', async ({ page }) => {
  test.setTimeout(360_000);
  const env = environment();
  const runId = Date.now().toString(36).slice(-8);
  const marker = `AI_MVP_E2E_${runId}`;
  const userName = `p4e2e${runId}`;
  const nickname = `p4${runId}`;
  const deptName = `${marker}_DEPT`;
  const roleCode = `R_${marker}_ROLE`;
  const evidence: Array<Record<string, string>> = [];
  let token = '';
  let createdUserId: string | undefined;
  let createdDeptId: string | undefined;
  let createdRoleId: string | undefined;
  let createdConversationId: string | undefined;
  let conversationCreated: Promise<void> | undefined;

  try {
    await login(page, env.AI_E2E_ADMIN_USERNAME, env.AI_E2E_ADMIN_PASSWORD);
    token = await accessToken(page);
    await page.goto('/ai/chat');
    const [agents, models] = await Promise.all([
      api<AgentOption[]>(page, token, 'GET', '/ai/agents'),
      api<ModelOption[]>(page, token, 'GET', '/ai/chat/models')
    ]);
    const departmentTree = await api<ListRecord[]>(page, token, 'GET', '/system/dept/tree');
    const parentDepartment = findTreeRecord(departmentTree, record => record.deptId === env.AI_E2E_PARENT_DEPT_ID);
    const primaryDepartment = findTreeRecord(departmentTree, record => record.deptId === env.AI_E2E_PRIMARY_DEPT_ID);
    if (!parentDepartment?.deptName) throw new Error('Configured provider parent department does not exist');
    if (!primaryDepartment?.deptName) throw new Error('Configured provider primary department does not exist');
    const model = models.find(
      item => item.modelId === env.AI_E2E_PROVIDER_MODEL_ID && item.providerCode === env.AI_E2E_PROVIDER_CODE
    );
    if (!model) throw new Error('Configured provider/model is not chat-safe for this identity');
    await selectModel(page, model.label);
    conversationCreated = page
      .waitForResponse(
        response => response.request().method() === 'POST' && response.url().endsWith('/ai/conversation'),
        { timeout: 60_000 }
      )
      .then(async response => {
        const envelope = (await response.json()) as Envelope<{ conversationId: string }>;
        if (response.ok() && envelope.code === 200) createdConversationId = envelope.data.conversationId;
      });

    for (const item of [
      {
        agent: 'user_mgmt',
        readTool: 'user.lookup',
        readPrompt: `Find the exact user ${env.AI_E2E_ADMIN_USERNAME}. Use user.lookup.`,
        writeTool: 'user.create',
        writePrompt: `Create active user ${userName} with nickname ${nickname} in primary department ${primaryDepartment.deptName} with ID ${env.AI_E2E_PRIMARY_DEPT_ID}. Use user.create and request confirmation.`
      },
      {
        agent: 'dept_mgmt',
        readTool: 'dept.lookup',
        readPrompt: `Find the exact department named ${parentDepartment.deptName}. Use dept.lookup.`,
        writeTool: 'dept.create',
        writePrompt: `Create active department ${deptName} under parent department ${parentDepartment.deptName} with ID ${env.AI_E2E_PARENT_DEPT_ID}. Use dept.create and request confirmation.`
      },
      {
        agent: 'role_mgmt',
        readTool: 'role.lookup',
        readPrompt: 'Find the exact role code R_USER. Use role.lookup.',
        writeTool: 'role.create',
        writePrompt: `Create active role ${marker} with code ${roleCode}, data scope code 1 (ALL), and an empty department ID list. Use role.create and request confirmation.`
      }
    ]) {
      const agent = agents.find(candidate => candidate.code === item.agent);
      if (!agent) throw new Error(`Required Agent is not available: ${item.agent}`);
      await selectAgent(page, agent.name);
      const readTrace = await invokeTool(page, item.readPrompt, item.readTool, false);
      if (!createdConversationId) await conversationCreated;
      const writeTrace = await invokeTool(page, item.writePrompt, item.writeTool, true);
      const readAgent = await actualTraceAgent(page, token, readTrace, item.readTool);
      const writeAgent = await actualTraceAgent(page, token, writeTrace, item.writeTool);
      expect(readAgent).toBe(item.agent);
      expect(writeAgent).toBe(item.agent);
      evidence.push(
        {
          providerCode: env.AI_E2E_PROVIDER_CODE,
          modelId: env.AI_E2E_PROVIDER_MODEL_ID,
          expectedAgent: item.agent,
          actualAgent: readAgent,
          actualTool: item.readTool,
          traceId: readTrace
        },
        {
          providerCode: env.AI_E2E_PROVIDER_CODE,
          modelId: env.AI_E2E_PROVIDER_MODEL_ID,
          expectedAgent: item.agent,
          actualAgent: writeAgent,
          actualTool: item.writeTool,
          traceId: writeTrace
        }
      );
    }

    const user = await findRecord(
      page,
      token,
      `/system/user/list?current=1&size=20&userName=${encodeURIComponent(userName)}`,
      record => record.userName === userName
    );
    const createdDeptTree = await api<ListRecord[]>(
      page,
      token,
      'GET',
      `/system/dept/tree?deptName=${encodeURIComponent(deptName)}`
    );
    const dept = findTreeRecord(createdDeptTree, record => record.deptName === deptName);
    const role = await findRecord(
      page,
      token,
      `/system/role/list?current=1&size=20&roleCode=${encodeURIComponent(roleCode)}`,
      record => record.roleCode === roleCode
    );
    createdUserId = user?.userId;
    createdDeptId = dept?.deptId;
    createdRoleId = role?.roleId;
    expect(createdUserId).toBeTruthy();
    expect(createdDeptId).toBeTruthy();
    expect(createdRoleId).toBeTruthy();
    await test.info().attach('provider-smoke-evidence.json', {
      body: JSON.stringify(evidence, null, 2),
      contentType: 'application/json'
    });
  } finally {
    if (conversationCreated) await conversationCreated.catch(() => undefined);
    if (token && createdConversationId) {
      await api<null>(page, token, 'DELETE', `/ai/conversation/${createdConversationId}`);
    }
    if (token && !createdUserId) {
      createdUserId = (
        await findRecord(
          page,
          token,
          `/system/user/list?current=1&size=20&userName=${encodeURIComponent(userName)}`,
          record => record.userName === userName
        )
      )?.userId;
    }
    if (token && !createdRoleId) {
      createdRoleId = (
        await findRecord(
          page,
          token,
          `/system/role/list?current=1&size=20&roleCode=${encodeURIComponent(roleCode)}`,
          record => record.roleCode === roleCode
        )
      )?.roleId;
    }
    if (token && !createdDeptId) {
      const deptTree = await api<ListRecord[]>(
        page,
        token,
        'GET',
        `/system/dept/tree?deptName=${encodeURIComponent(deptName)}`
      );
      createdDeptId = findTreeRecord(deptTree, record => record.deptName === deptName)?.deptId;
    }
    if (token && createdUserId) await api<null>(page, token, 'DELETE', `/system/user/${createdUserId}`);
    if (token && createdRoleId) await api<null>(page, token, 'DELETE', `/system/role/${createdRoleId}`);
    if (token && createdDeptId) await api<null>(page, token, 'DELETE', `/system/dept/${createdDeptId}`);
  }
});
