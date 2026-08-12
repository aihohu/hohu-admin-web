import { expect, test } from '@playwright/test';

test('导入按钮打开 3 步弹窗', async ({ page }) => {
  await page.goto('/system/user');
  await page
    .getByRole('button', { name: /导入/ })
    .first()
    .click();
  await page.locator('.n-modal').waitFor();
  await expect(page.locator('.n-modal')).toContainText('批量导入用户');
  await expect(page.locator('.n-steps')).toBeVisible();
});

test('导出按钮打开确认弹窗并校验空 reason', async ({ page }) => {
  await page.goto('/system/user');
  await page
    .getByRole('button', { name: /^导出$/ })
    .first()
    .click();
  await page.locator('.n-modal').waitFor();
  await expect(page.locator('.n-modal')).toContainText('导出用户列表');

  // reason 为空时确认按钮 disabled
  const confirmBtn = page.locator('.n-modal button', { hasText: '确认导出' });
  await expect(confirmBtn).toBeDisabled();
});

test('导入历史抽屉打开 + 默认显示批次列表', async ({ page }) => {
  await page.goto('/system/user');
  await page.getByRole('button', { name: /导入历史/ }).click();
  await page.locator('.n-drawer').waitFor();
  await expect(page.locator('.n-drawer')).toContainText('导入历史');
  // 表头存在（即使空数据也应渲染表头）
  await expect(page.locator('.n-drawer .n-data-table')).toBeVisible();
});
