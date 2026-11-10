import { expect, test } from '@playwright/test';

test('real stopped installation: credentials, role drawer, candidate, manifest and logout', async ({
  page
}, testInfo) => {
  test.skip(
    !process.env.POLICY_PREPARATION_URL || !process.env.POLICY_PREPARATION_PASSWORD,
    'Requires an owned, stopped installation fixture.'
  );
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.name));
  await page.goto('/');
  await page.locator('input[autocomplete="username"]').fill('admin');
  await page.locator('input[autocomplete="current-password"]').fill(process.env.POLICY_PREPARATION_PASSWORD!);
  await page.getByRole('button', { name: '登录准备会话', exact: true }).click();
  await expect(page.getByRole('button', { name: '退出准备会话' })).toBeVisible();
  await page.getByRole('button', { name: '字段权限', exact: true }).first().click();
  await expect(page.getByRole('button', { name: '默认推荐配置', exact: true })).toBeEnabled();
  await expect(page.locator('.n-spin-body')).toHaveCount(0);
  await expect(page.getByText('fieldPolicy.system.user', { exact: true })).toHaveCount(0);
  for (const object of ['字典类型', '字典项', '数据范围演示', '用户']) {
    await page.locator('.n-drawer .n-select').first().click();
    await page.locator('.n-base-select-option').filter({ hasText: object }).click();
    await expect(page.locator('.n-spin-body')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '默认推荐配置', exact: true })).toBeEnabled();
    await expect(page.getByText(/fieldPolicy\./)).toHaveCount(0);
    if (object !== '用户') {
      await page.screenshot({
        path: testInfo.outputPath(`object-${object}.png`),
        fullPage: true,
        animations: 'disabled'
      });
    }
  }
  await page.screenshot({ path: testInfo.outputPath('drawer-desktop.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: '默认推荐配置', exact: true }).click();
  await page.getByRole('button', { name: '全部拒绝', exact: true }).click();
  await page.getByRole('button', { name: '确认', exact: true }).click();
  await expect(page.locator('.n-dialog')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.n-dialog')).toBeVisible();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('button', { name: '撤回上次草稿修改', exact: true }).click();
  await page.getByPlaceholder('搜索字段').fill('nickname');
  await page.getByRole('button', { name: '全部允许', exact: true }).click();
  await page.getByRole('button', { name: '确认', exact: true }).click();
  await expect(page.locator('.n-dialog')).toHaveCount(0);
  await page.getByPlaceholder('搜索字段').fill('');
  await page.getByRole('button', { name: '预览变更', exact: true }).click();
  await expect(page.getByText('以下仅显示权限规则差异', { exact: false })).toBeVisible();
  await page.locator('textarea').fill('Browser candidate acceptance');
  const published = page.waitForResponse(
    response => response.url().endsWith('/revisions') && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: '保存候选', exact: true }).click();
  const saved = await published;
  expect(saved.status()).toBe(200);
  const submitted = saved.request().postDataJSON();
  expect(typeof submitted.expectedVersion).toBe('string');
  expect(
    submitted.rules.some(
      (rule: { fieldId: string; level: string }) => rule.fieldId === 'user_phone' && rule.level === 'masked'
    )
  ).toBe(true);
  expect((await saved.json()).data.activeManifestDigest).toBeNull();
  await expect(page.getByText('候选已保存，当前生效策略未改变。')).toBeVisible();
  await page.getByRole('button', { name: '预览租户清单', exact: true }).click();
  await page.locator('textarea').fill('Browser complete manifest acceptance');
  await page.getByRole('button', { name: '封存租户候选', exact: true }).click();
  const sealed = page.waitForResponse(
    response => response.url().endsWith('/manifests') && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: '确认', exact: true }).click();
  const response = await sealed;
  expect(response.status()).toBe(200);
  expect((await response.json()).data.activeManifestDigest).toBeNull();
  await expect(page.getByText('租户候选已封存，尚未激活。')).toBeVisible();
  await expect(page.locator('.n-dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '激活策略', exact: true })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '默认推荐配置', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('drawer-mobile.png'), fullPage: true, animations: 'disabled' });
  const buttons = await Promise.all(
    ['默认推荐配置', '全部允许', '全部拒绝'].map(name => page.getByRole('button', { name, exact: true }).boundingBox())
  );
  expect(buttons.every(Boolean)).toBe(true);
  expect(Math.max(...buttons.map(box => box!.y)) - Math.min(...buttons.map(box => box!.y))).toBeLessThan(4);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '退出准备会话', exact: true }).click();
  await expect(page.getByRole('button', { name: '登录准备会话', exact: true })).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } })
  );
  expect(stored).not.toContain('Browser candidate');
  expect(stored).not.toContain(process.env.POLICY_PREPARATION_PASSWORD!);
  expect(errors).toEqual([]);
});
