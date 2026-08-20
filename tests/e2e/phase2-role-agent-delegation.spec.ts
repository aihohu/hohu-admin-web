import { expect, test, type Browser, type Page } from '@playwright/test';

interface BackendResponse<T> {
  code: number;
  msg: string;
  data: T;
  errorCode?: string;
}

interface AgentListItem {
  agentId: string;
  code: string;
}

interface MenuNode {
  menuId: string;
  parentId: string | null;
  menuName: string;
  menuType: string;
  routeName: string | null;
  children?: MenuNode[];
}

interface RoleRecord {
  roleId: string;
  roleCode: string;
}

interface RoleList {
  records: RoleRecord[];
}

interface UserRecord {
  userId: string;
  userName: string;
}

interface UserList {
  records: UserRecord[];
}

type ApiMethod = 'DELETE' | 'GET' | 'POST' | 'PUT';

async function adminToken(page: Page) {
  await page.goto('/home');
  const token = await page.evaluate(() => {
    const value = window.localStorage.getItem('SOY_token');
    return value ? (JSON.parse(value) as string) : null;
  });
  if (!token) throw new Error('Task 14 requires the shared admin authentication state');
  return token;
}

async function api<T>(page: Page, token: string, method: ApiMethod, path: string, data?: unknown): Promise<T> {
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
    throw new Error(
      `${method} ${path} failed with HTTP ${response.status()} / code ${body.code} / error ${String(body.errorCode)}: ${rawBody}`
    );
  }
  return body.data;
}

function flattenMenus(nodes: MenuNode[]): MenuNode[] {
  return nodes.flatMap(node => [node, ...flattenMenus(node.children ?? [])]);
}

function rolePageMenuIds(tree: MenuNode[]) {
  const nodes = flattenMenus(tree);
  const byId = new Map(nodes.map(node => [node.menuId, node]));
  const rolePage = nodes.find(node => node.routeName === 'system_role');
  if (!rolePage) throw new Error('Task 14 requires the system role route');
  const roleButtons = rolePage.children ?? [];
  const selected = [
    rolePage,
    ...roleButtons.filter(node => node.menuType === 'F' && ['查询', 'AI Agent 授权'].includes(node.menuName))
  ];
  if (!selected.some(node => node.menuName === '查询')) {
    throw new Error('Task 14 requires the system:role:list menu node');
  }
  if (!selected.some(node => node.menuName === 'AI Agent 授权')) {
    throw new Error('Task 14 requires the system:role:ai-agent-auth menu node');
  }
  const result = new Set<string>();
  for (const node of selected) {
    let current: MenuNode | undefined = node;
    while (current) {
      result.add(current.menuId);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
  }
  return [...result];
}

async function roleByCode(page: Page, token: string, roleCode: string) {
  const roles = await api<RoleList>(
    page,
    token,
    'GET',
    `/system/role/list?current=1&size=100&roleCode=${encodeURIComponent(roleCode)}`
  );
  const role = roles.records.find(item => item.roleCode === roleCode);
  if (!role) throw new Error(`Task 14 fixture role was not created: ${roleCode}`);
  return role;
}

async function userByName(page: Page, token: string, userName: string) {
  const users = await api<UserList>(
    page,
    token,
    'GET',
    `/system/user/list?current=1&size=100&userName=${encodeURIComponent(userName)}`
  );
  const user = users.records.find(item => item.userName === userName);
  if (!user) throw new Error(`Task 14 fixture user was not created: ${userName}`);
  return user;
}

async function loginAsDelegatedAdmin(browser: Browser, userName: string, password: string) {
  const context = await browser.newContext({
    baseURL: 'http://localhost:9527',
    storageState: { cookies: [], origins: [] }
  });
  try {
    const page = await context.newPage();
    await page.goto('/login');
    await page.getByPlaceholder('请输入用户名').fill(userName);
    await page.getByPlaceholder('请输入密码').fill(password);
    const loginResponse = page.waitForResponse(
      response => response.request().method() === 'POST' && response.url().endsWith('/auth/login')
    );
    await page.getByRole('button', { name: '确认' }).click();
    expect((await loginResponse).ok()).toBe(true);
    await expect(page).toHaveURL(/\/home(?:[/?#]|$)/);
    return { context, page };
  } catch (error) {
    await context.close();
    throw error;
  }
}

test('multi-role delegated admin can bind only Agents inside the combined authority ceiling', async ({
  browser,
  page
}) => {
  test.setTimeout(90_000);
  const token = await adminToken(page);
  const runId = Date.now().toString(36).slice(-8);
  const marker = `AI_MVP_E2E_${runId}`;
  const userName = `e2e14${runId}`.slice(0, 16);
  const password = 'Hohu123456!';
  const roleCodes = {
    auth: `R_${marker}_AUTH`,
    grant: `R_${marker}_GRANT`,
    target: `R_${marker}_TARGET`
  };
  const createdRoleIds: string[] = [];
  let createdUserId: string | null = null;
  let delegatedContext: Awaited<ReturnType<typeof loginAsDelegatedAdmin>>['context'] | null = null;

  try {
    const agents = await api<AgentListItem[]>(page, token, 'GET', '/ai/admin/agents');
    const delegatedAgent = agents.find(agent => agent.code === 'user_mgmt');
    const blockedAgent = agents.find(agent => agent.code === 'dept_mgmt');
    if (!delegatedAgent || !blockedAgent) {
      throw new Error('Task 14 requires user_mgmt and dept_mgmt Agents');
    }
    const menuTree = await api<MenuNode[]>(page, token, 'GET', '/system/menu/tree');
    const menuIds = rolePageMenuIds(menuTree);

    for (const [kind, roleCode] of Object.entries(roleCodes)) {
      await api<null>(page, token, 'POST', '/system/role/add', {
        roleName: `${marker} ${kind}`,
        roleCode,
        roleDesc: `Task 14 ${kind} fixture`,
        dataScope: kind === 'grant' ? '1' : '5',
        status: '1',
        deptIds: []
      });
      const role = await roleByCode(page, token, roleCode);
      createdRoleIds.push(role.roleId);
    }

    const [authRoleId, grantRoleId] = createdRoleIds;
    await api<null>(page, token, 'PUT', `/system/role/menu/${authRoleId}`, menuIds);
    await api<null>(page, token, 'PUT', `/ai/role-agent/${grantRoleId}`, {
      agentIds: [delegatedAgent.agentId]
    });
    await api<null>(page, token, 'POST', '/system/user/add', {
      userName,
      nickname: userName,
      password,
      userEmail: null,
      userPhone: null,
      userGender: '0',
      status: '1',
      roleIds: [authRoleId, grantRoleId],
      deptIds: []
    });
    createdUserId = (await userByName(page, token, userName)).userId;

    const delegated = await loginAsDelegatedAdmin(browser, userName, password);
    delegatedContext = delegated.context;
    const delegatedPage = delegated.page;
    await delegatedPage.goto('/system/role');
    await expect(delegatedPage).toHaveURL(/\/system\/role(?:[/?#]|$)/);
    await delegatedPage.getByTestId('role-code-search').locator('input').fill(roleCodes.target);
    await delegatedPage.getByTestId('role-search-actions').getByRole('button', { name: '搜索' }).click();

    const openTargetBinding = delegatedPage.getByTestId(`role-ai-agent-auth-${roleCodes.target}`);
    await expect(openTargetBinding).toBeVisible();
    await openTargetBinding.click();
    let modal = delegatedPage.getByTestId('role-ai-agent-modal');
    await expect(modal).toBeVisible();
    await modal.getByTestId('role-agent-checkbox-user_mgmt').click();
    await modal.getByTestId('role-agent-submit').click();
    await expect(delegatedPage.locator('.n-message--success-type').filter({ hasText: '修改成功' })).toBeVisible();

    await openTargetBinding.click();
    modal = delegatedPage.getByTestId('role-ai-agent-modal');
    await expect(modal).toBeVisible();
    await modal.getByTestId('role-agent-checkbox-dept_mgmt').click();
    await modal.getByTestId('role-agent-submit').click();
    await expect(
      delegatedPage.locator('.n-message--error-type').filter({ hasText: '超出当前操作者的委派上界' })
    ).toBeVisible();
    await modal.getByRole('button', { name: '取消' }).click();

    await openTargetBinding.click();
    modal = delegatedPage.getByTestId('role-ai-agent-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('checkbox', { name: /user_mgmt/ })).toBeChecked();
    await expect(modal.getByRole('checkbox', { name: /dept_mgmt/ })).not.toBeChecked();
  } finally {
    await delegatedContext?.close();
    if (createdUserId) {
      await api<null>(page, token, 'DELETE', `/system/user/${createdUserId}`);
    }
    for (const roleId of [...createdRoleIds].reverse()) {
      await api<null>(page, token, 'PUT', `/ai/role-agent/${roleId}`, { agentIds: [] });
      await api<null>(page, token, 'DELETE', `/system/role/${roleId}`);
    }
  }
});
