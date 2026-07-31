import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:9527/login');
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('hohu123456');
  await page.getByRole('button', { name: '确认' }).click();
  await page.waitForURL('**/home**');
});

test('管理员编辑 Agent description', async ({ page }) => {
  await page.goto('/ai/agent');
  await page.getByRole('button', { name: '编辑' }).nth(1).click();
  await page.locator('.n-drawer').waitFor();

  const descTextarea = page.locator('.n-drawer textarea').first();
  await descTextarea.fill('A'.repeat(80));
  await page.locator('.n-drawer button', { hasText: '确认' }).click();

  await expect(page.locator('.n-message')).toContainText('修改成功');
});

test('管理员切换 Agent enabled', async ({ page }) => {
  await page.goto('/ai/agent');

  await page.getByRole('button', { name: '编辑' }).first().click();
  await page.locator('.n-drawer').waitFor();

  const drawerSwitch = page.locator('.n-drawer .n-switch').first();
  const beforeChecked = await drawerSwitch.evaluate(el => el.classList.contains('n-switch--active'));
  await drawerSwitch.click();
  await page.locator('.n-drawer button', { hasText: '确认' }).click();
  await expect(page.locator('.n-message')).toContainText('修改成功');
  await page.locator('.n-drawer').waitFor({ state: 'detached' });

  await page.getByRole('button', { name: '编辑' }).first().click();
  await page.locator('.n-drawer').waitFor();
  const afterChecked = await page
    .locator('.n-drawer .n-switch')
    .first()
    .evaluate(el => el.classList.contains('n-switch--active'));
  expect(afterChecked).toBe(!beforeChecked);
});

test('管理员绑定 Role → Agent', async ({ page }) => {
  await page.goto('/system/role');

  await page.getByRole('button', { name: 'AI Agent 授权' }).first().click();
  await page.locator('.n-modal').waitFor();

  const checkboxes = page.locator('.n-modal .n-checkbox');
  // shared 行 disabled，不能勾选；user_mgmt / config_mgmt 可勾
  await checkboxes.nth(1).click();
  await checkboxes.nth(3).click();

  await page.locator('.n-modal button', { hasText: '确认' }).click();
  await expect(page.locator('.n-message')).toContainText('修改成功');
});

test('反馈仪表盘切换 7/30 天', async ({ page }) => {
  await page.goto('/ai/routing-feedback');
  await page.locator('.n-statistic').first().waitFor();

  const radios = page.locator('.n-radio');
  await radios.nth(1).click();
  await expect(page.locator('.n-statistic').first()).toBeVisible();

  await radios.nth(0).click();
  await expect(page.locator('.n-statistic').first()).toBeVisible();
});
