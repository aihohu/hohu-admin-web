import { expect, test, type Page } from '@playwright/test';

interface BackendResponse<T> {
  code: number;
  msg: string;
  data: T;
}

interface AgentListItem {
  agentId: string;
  code: string;
}

interface AgentDetail extends AgentListItem {
  name: string;
  description: string;
  enabled: boolean;
  displayOrder: number;
  systemPrompt: string;
  modelPreference: string | null;
  dailyQuotaPerUser: number | null;
  riskAppetite: 'conservative' | 'balanced' | 'aggressive';
}

interface RoleRecord {
  roleId: string;
  roleCode: string;
}

interface RoleList {
  records: RoleRecord[];
}

interface AgentRow extends AgentListItem {
  isShared: boolean;
}

interface RoleAgentBinding {
  roleId: string;
  allAgents: AgentRow[];
  boundAgentIds: string[];
}

type AgentUpdate = Pick<
  AgentDetail,
  | 'name'
  | 'description'
  | 'enabled'
  | 'displayOrder'
  | 'systemPrompt'
  | 'modelPreference'
  | 'dailyQuotaPerUser'
  | 'riskAppetite'
>;

function agentUpdate(detail: AgentDetail): AgentUpdate {
  return {
    name: detail.name,
    description: detail.description,
    enabled: detail.enabled,
    displayOrder: detail.displayOrder,
    systemPrompt: detail.systemPrompt,
    modelPreference: detail.modelPreference,
    dailyQuotaPerUser: detail.dailyQuotaPerUser,
    riskAppetite: detail.riskAppetite
  };
}

function sorted(values: string[]) {
  return [...values].sort();
}

async function adminToken(page: Page) {
  const token = await page.evaluate(() => {
    const value = window.localStorage.getItem('SOY_token');
    return value ? (JSON.parse(value) as string) : null;
  });
  if (!token) throw new Error('Shared E2E admin authentication state is missing');
  return token;
}

async function api<T>(page: Page, token: string, method: 'GET' | 'PUT', path: string, data?: unknown): Promise<T> {
  const response = await page.request.fetch(`/proxy-default${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    data
  });
  const rawBody = await response.text();
  let body: BackendResponse<T>;
  try {
    body = JSON.parse(rawBody) as BackendResponse<T>;
  } catch {
    throw new Error(`${method} ${path} returned invalid JSON: ${rawBody}`);
  }
  if (!response.ok() || body.code !== 200) {
    throw new Error(`${method} ${path} failed with HTTP ${response.status()} / code ${body.code}: ${rawBody}`);
  }
  return body.data;
}

async function getAgentByCode(page: Page, token: string, code: string) {
  const agents = await api<AgentListItem[]>(page, token, 'GET', '/ai/admin/agents');
  const target = agents.find(agent => agent.code === code);
  if (!target) throw new Error(`E2E requires AI Agent ${code}`);
  return api<AgentDetail>(page, token, 'GET', `/ai/admin/agents/${target.agentId}`);
}

async function restoreAgent(page: Page, token: string, snapshot: AgentDetail) {
  await api<AgentDetail>(page, token, 'PUT', `/ai/admin/agents/${snapshot.agentId}`, agentUpdate(snapshot));
  const restored = await api<AgentDetail>(page, token, 'GET', `/ai/admin/agents/${snapshot.agentId}`);
  expect(agentUpdate(restored)).toEqual(agentUpdate(snapshot));
}

async function getRoleByCode(page: Page, token: string, roleCode: string) {
  const roles = await api<RoleList>(
    page,
    token,
    'GET',
    `/system/role/list?current=1&size=100&roleCode=${encodeURIComponent(roleCode)}`
  );
  const target = roles.records.find(role => role.roleCode === roleCode);
  if (!target) throw new Error(`E2E requires role ${roleCode}`);
  return target;
}

async function getRoleBinding(page: Page, token: string, roleId: string) {
  return api<RoleAgentBinding>(page, token, 'GET', `/ai/role-agent/${roleId}`);
}

async function restoreRoleBinding(page: Page, token: string, snapshot: RoleAgentBinding) {
  await api<null>(page, token, 'PUT', `/ai/role-agent/${snapshot.roleId}`, {
    agentIds: snapshot.boundAgentIds
  });
  const restored = await getRoleBinding(page, token, snapshot.roleId);
  expect(sorted(restored.boundAgentIds)).toEqual(sorted(snapshot.boundAgentIds));
}

test('管理员编辑 Agent description 后恢复原配置', async ({ page }) => {
  await page.goto('/ai/agent');
  const token = await adminToken(page);
  const snapshot = await getAgentByCode(page, token, 'user_mgmt');
  const changedDescription = `E2E description restore check ${'A'.repeat(60)}`;

  try {
    await page.getByTestId('ai-agent-edit-user_mgmt').click();
    const drawer = page.getByTestId('ai-agent-drawer');
    await expect(drawer).toBeVisible();
    await drawer.getByTestId('ai-agent-description').locator('textarea').fill(changedDescription);
    await drawer.getByTestId('ai-agent-submit').click();

    await expect(page.locator('.n-message--success-type').filter({ hasText: '修改成功' })).toBeVisible();
    const updated = await getAgentByCode(page, token, 'user_mgmt');
    expect(updated.description).toBe(changedDescription);
  } finally {
    await restoreAgent(page, token, snapshot);
  }
});

test('管理员切换 Agent enabled 后恢复原配置', async ({ page }) => {
  await page.goto('/ai/agent');
  const token = await adminToken(page);
  const snapshot = await getAgentByCode(page, token, 'config_mgmt');

  try {
    await page.getByTestId('ai-agent-edit-config_mgmt').click();
    const drawer = page.getByTestId('ai-agent-drawer');
    await expect(drawer).toBeVisible();
    await drawer.getByTestId('ai-agent-enabled').click();
    await drawer.getByTestId('ai-agent-submit').click();

    await expect(page.locator('.n-message--success-type').filter({ hasText: '修改成功' })).toBeVisible();
    const updated = await getAgentByCode(page, token, 'config_mgmt');
    expect(updated.enabled).toBe(!snapshot.enabled);
  } finally {
    await restoreAgent(page, token, snapshot);
  }
});

test('管理员修改 Role → Agent 绑定后恢复原绑定', async ({ page }) => {
  await page.goto('/system/role');
  const token = await adminToken(page);
  const role = await getRoleByCode(page, token, 'R_USER');
  const snapshot = await getRoleBinding(page, token, role.roleId);
  const targetAgent = snapshot.allAgents.find(agent => agent.code === 'user_mgmt');
  if (!targetAgent || targetAgent.isShared) throw new Error('E2E requires a non-shared user_mgmt Agent');
  const originallyBound = snapshot.boundAgentIds.includes(targetAgent.agentId);

  await page.getByTestId('role-code-search').locator('input').fill(role.roleCode);
  await page.getByTestId('role-search-actions').getByRole('button', { name: '搜索' }).click();

  try {
    await page.getByTestId(`role-ai-agent-auth-${role.roleCode}`).click();
    const modal = page.getByTestId('role-ai-agent-modal');
    await expect(modal).toBeVisible();
    await modal.getByTestId('role-agent-checkbox-user_mgmt').click();
    await modal.getByTestId('role-agent-submit').click();

    await expect(page.locator('.n-message--success-type').filter({ hasText: '修改成功' })).toBeVisible();
    const updated = await getRoleBinding(page, token, role.roleId);
    expect(updated.boundAgentIds.includes(targetAgent.agentId)).toBe(!originallyBound);
  } finally {
    await restoreRoleBinding(page, token, snapshot);
  }
});

test('反馈仪表盘切换 7/30 天', async ({ page }) => {
  await page.goto('/ai/routing-feedback');
  await expect(page.getByTestId('routing-feedback-summary')).toBeVisible();

  await page.getByTestId('routing-feedback-days-30').click();
  await expect(page.getByTestId('routing-feedback-summary')).toBeVisible();

  await page.getByTestId('routing-feedback-days-7').click();
  await expect(page.getByTestId('routing-feedback-summary')).toBeVisible();
});
