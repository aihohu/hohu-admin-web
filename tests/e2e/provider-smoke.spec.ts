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
  roleName?: string;
  dataScope?: string;
  children?: ListRecord[];
}

interface PageData {
  records: ListRecord[];
  total: number;
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
  const response = await page.evaluate(
    async input => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 30_000);
      try {
        const result = await fetch(`/proxy-default${input.path}`, {
          method: input.method,
          headers: { Authorization: `Bearer ${input.token}` },
          signal: controller.signal
        });
        return { ok: result.ok, status: result.status, raw: await result.text() };
      } finally {
        window.clearTimeout(timer);
      }
    },
    { token, method, path }
  );
  const raw = response.raw;
  const envelope = JSON.parse(raw) as Envelope<T>;
  if (!response.ok || envelope.code !== 200) {
    throw new Error(`${method} ${path} failed: ${response.status} ${String(envelope.errorCode)} ${raw}`);
  }
  return envelope.data;
}

async function bounded<T>(operation: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} exceeded ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function login(page: Page, userName: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder('请输入用户名').fill(userName);
  await page.getByPlaceholder('请输入密码').fill(password);
  await page.getByRole('button', { name: '确认' }).click();
  await expect(page).toHaveURL(/\/home(?:[/?#]|$)/);
}

async function selectModel(page: Page, modelLabel: string) {
  await page.getByTestId('ai-model-selector').click({ timeout: 15_000 });
  await page.getByText(modelLabel, { exact: true }).last().click({ timeout: 15_000 });
  await expect(page.getByTestId('ai-model-selector')).toContainText(modelLabel, { timeout: 15_000 });
}

async function selectAgent(page: Page, agentName: string) {
  await page.getByTestId('ai-agent-selector').click({ timeout: 15_000 });
  await page.getByText(agentName, { exact: true }).last().click({ timeout: 15_000 });
  await expect(page.getByTestId('ai-agent-selector')).toContainText(agentName, { timeout: 15_000 });
}

async function invokeTool(page: Page, prompt: string, tool: string, approve: boolean) {
  await expect(page.locator('.input-action-btn--stop')).toHaveCount(0, { timeout: 60_000 });
  const prior = await page.locator(`.tool-card[data-tool="${tool}"]`).count();
  await page.locator('.input-textarea').fill(prompt);
  await page.locator('.input-textarea').press('Enter');
  const card = page.locator(`.tool-card[data-tool="${tool}"]`).nth(prior);
  await expect(card).toBeVisible({ timeout: 60_000 });
  if (approve) {
    await expect(page.getByTestId('ai-confirmation-drawer')).toBeVisible({ timeout: 60_000 });
    await page.getByTestId('ai-confirm-approve').click();
  }
  await expect(card).toHaveAttribute('data-status', 'success', { timeout: 60_000 });
  if (approve) {
    await expect(page.getByTestId('ai-confirmation-drawer')).toBeHidden({ timeout: 60_000 });
  }
  await expect(page.locator('.input-action-btn--stop')).toHaveCount(0, { timeout: 60_000 });
  const traceId = await card.getAttribute('data-trace-id');
  if (!traceId) throw new Error(`${tool} did not expose its actual trace ID`);
  return traceId;
}

async function invokeLookupThenWrite(page: Page, prompt: string, readTool: string, writeTool: string) {
  await expect(page.locator('.input-action-btn--stop')).toHaveCount(0, { timeout: 60_000 });
  const priorRead = await page.locator(`.tool-card[data-tool="${readTool}"]`).count();
  const priorWrite = await page.locator(`.tool-card[data-tool="${writeTool}"]`).count();
  await page.locator('.input-textarea').fill(prompt);
  await page.locator('.input-textarea').press('Enter');

  const readCard = page.locator(`.tool-card[data-tool="${readTool}"]`).nth(priorRead);
  const writeCard = page.locator(`.tool-card[data-tool="${writeTool}"]`).nth(priorWrite);
  await expect(readCard).toHaveAttribute('data-status', 'success', { timeout: 60_000 });
  await expect(writeCard).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('ai-confirmation-drawer')).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('ai-confirm-approve').click();
  await expect(writeCard).toHaveAttribute('data-status', 'success', { timeout: 60_000 });
  await expect(page.getByTestId('ai-confirmation-drawer')).toBeHidden({ timeout: 60_000 });
  await expect(page.locator('.input-action-btn--stop')).toHaveCount(0, { timeout: 60_000 });

  const readTrace = await readCard.getAttribute('data-trace-id');
  const writeTrace = await writeCard.getAttribute('data-trace-id');
  if (!readTrace || !writeTrace) throw new Error('Combined lookup/write did not expose trace IDs');
  expect(writeTrace).toBe(readTrace);
  return writeTrace;
}

async function rejectExportBeforeSideEffects(page: Page, token: string, prompt: string) {
  const before = await api<PageData>(page, token, 'GET', '/system/user/export?current=1&size=1');
  const prior = await page.locator('.tool-card[data-tool="user.export"]').count();
  await page.locator('.input-textarea').fill(prompt);
  await page.locator('.input-textarea').press('Enter');

  const card = page.locator('.tool-card[data-tool="user.export"]').nth(prior);
  await expect(card).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('ai-confirmation-drawer')).toBeVisible({ timeout: 60_000 });
  const pending = await api<PageData>(page, token, 'GET', '/system/user/export?current=1&size=1');
  expect(pending.total).toBe(before.total);
  const traceId = await card.getAttribute('data-trace-id');
  if (!traceId) throw new Error('user.export did not expose its trace ID');

  await page.getByTestId('ai-confirm-reject').click();
  await expect(page.getByTestId('ai-confirmation-drawer')).toBeHidden();
  await expect(page.locator('.input-action-btn--stop')).toHaveCount(0, { timeout: 60_000 });
  const after = await api<PageData>(page, token, 'GET', '/system/user/export?current=1&size=1');
  expect(after.total).toBe(before.total);
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

test('real provider routes read and controlled writes through all three management Agents', async ({
  page
}, testInfo) => {
  test.setTimeout(600_000);
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
  let bodyError: unknown;
  const cleanupErrors: string[] = [];
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
        writePrompt: `Call role.create now with role_name="${marker}", role_code="${roleCode}", data_scope="SELF", status="1", and dept_ids=[]. Request confirmation. Do not claim success unless the role.create tool result reports execution.`
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

    const createdRole = await findRecord(
      page,
      token,
      `/system/role/list?current=1&size=20&roleCode=${encodeURIComponent(roleCode)}`,
      record => record.roleCode === roleCode
    );
    createdRoleId = createdRole?.roleId;
    expect(createdRoleId).toBeTruthy();
    expect(createdRole?.dataScope).toBe('5');

    const roleAgent = agents.find(candidate => candidate.code === 'role_mgmt');
    if (!roleAgent) throw new Error('Required Agent is not available: role_mgmt');
    await selectAgent(page, roleAgent.name);
    const updatedRoleName = `${marker}_UPDATED`;
    const combinedTrace = await invokeLookupThenWrite(
      page,
      `First use role.lookup to resolve exact role code ${roleCode}. Then use role.update with that role ID to change only role_name to ${updatedRoleName}, and request confirmation. Both tools must run in this one response.`,
      'role.lookup',
      'role.update'
    );
    expect(await actualTraceAgent(page, token, combinedTrace, 'role.lookup')).toBe('role_mgmt');
    expect(await actualTraceAgent(page, token, combinedTrace, 'role.update')).toBe('role_mgmt');
    evidence.push(
      {
        providerCode: env.AI_E2E_PROVIDER_CODE,
        modelId: env.AI_E2E_PROVIDER_MODEL_ID,
        expectedAgent: 'role_mgmt',
        actualAgent: 'role_mgmt',
        actualTool: 'role.lookup',
        traceId: combinedTrace
      },
      {
        providerCode: env.AI_E2E_PROVIDER_CODE,
        modelId: env.AI_E2E_PROVIDER_MODEL_ID,
        expectedAgent: 'role_mgmt',
        actualAgent: 'role_mgmt',
        actualTool: 'role.update',
        traceId: combinedTrace
      }
    );
    const updatedRole = await findRecord(
      page,
      token,
      `/system/role/list?current=1&size=20&roleCode=${encodeURIComponent(roleCode)}`,
      record => record.roleCode === roleCode
    );
    expect(updatedRole?.roleName).toBe(updatedRoleName);

    const userAgent = agents.find(candidate => candidate.code === 'user_mgmt');
    if (!userAgent) throw new Error('Required Agent is not available: user_mgmt');
    await selectAgent(page, userAgent.name);
    const exportTrace = await rejectExportBeforeSideEffects(
      page,
      token,
      `Export only the exact user_name ${userName} to xlsx for reason ${marker}_EXPORT. Use user.export and request confirmation.`
    );
    expect(await actualTraceAgent(page, token, exportTrace, 'user.export')).toBe('user_mgmt');
    evidence.push({
      providerCode: env.AI_E2E_PROVIDER_CODE,
      modelId: env.AI_E2E_PROVIDER_MODEL_ID,
      expectedAgent: 'user_mgmt',
      actualAgent: 'user_mgmt',
      actualTool: 'user.export (rejected before side effects)',
      traceId: exportTrace
    });

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
    createdRoleId = role?.roleId || createdRoleId;
    expect(createdUserId).toBeTruthy();
    expect(createdDeptId).toBeTruthy();
    expect(createdRoleId).toBeTruthy();
    await test.info().attach('provider-smoke-evidence.json', {
      body: JSON.stringify(evidence, null, 2),
      contentType: 'application/json'
    });
  } catch (error) {
    bodyError = error;
  } finally {
    const cleanupStep = async (label: string, operation: () => Promise<unknown>) => {
      try {
        await bounded(operation(), 5_000, label);
      } catch (error) {
        cleanupErrors.push(`${label}: ${String(error)}`);
      }
    };
    if (conversationCreated) {
      await cleanupStep('await conversation create', () => conversationCreated!.catch(() => undefined));
    }
    if (token && !createdUserId) {
      await cleanupStep('resolve created user', async () => {
        createdUserId = (
          await findRecord(
            page,
            token,
            `/system/user/list?current=1&size=20&userName=${encodeURIComponent(userName)}`,
            record => record.userName === userName
          )
        )?.userId;
      });
    }
    if (token && !createdRoleId) {
      await cleanupStep('resolve created role', async () => {
        createdRoleId = (
          await findRecord(
            page,
            token,
            `/system/role/list?current=1&size=20&roleCode=${encodeURIComponent(roleCode)}`,
            record => record.roleCode === roleCode
          )
        )?.roleId;
      });
    }
    if (token && !createdDeptId) {
      await cleanupStep('resolve created department', async () => {
        const deptTree = await api<ListRecord[]>(
          page,
          token,
          'GET',
          `/system/dept/tree?deptName=${encodeURIComponent(deptName)}`
        );
        createdDeptId = findTreeRecord(deptTree, record => record.deptName === deptName)?.deptId;
      });
    }
    if (token && createdUserId) {
      await cleanupStep('delete created user', () => api<null>(page, token, 'DELETE', `/system/user/${createdUserId}`));
    }
    if (token && createdRoleId) {
      await cleanupStep('delete created role', () => api<null>(page, token, 'DELETE', `/system/role/${createdRoleId}`));
    }
    if (token && createdDeptId) {
      await cleanupStep('delete created department', () =>
        api<null>(page, token, 'DELETE', `/system/dept/${createdDeptId}`)
      );
    }
    if (!bodyError && token && createdConversationId) {
      await cleanupStep('delete conversation', () =>
        api<null>(page, token, 'DELETE', `/ai/conversation/${createdConversationId}`)
      );
    }
  }

  if (cleanupErrors.length > 0) {
    await testInfo.attach('provider-smoke-cleanup-errors.txt', {
      body: cleanupErrors.join('\n'),
      contentType: 'text/plain'
    });
  }
  if (bodyError) throw bodyError;
  if (cleanupErrors.length > 0) throw new Error(cleanupErrors.join('\n'));
});
