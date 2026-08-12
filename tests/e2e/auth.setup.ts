import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test as setup } from '@playwright/test';
import { adminAuthFile } from './support/auth';

setup('authenticate admin once for the E2E suite', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('请输入用户名').fill('admin');
  await page.getByPlaceholder('请输入密码').fill('hohu123456');

  const loginResponsePromise = page.waitForResponse(
    response => response.request().method() === 'POST' && response.url().endsWith('/auth/login')
  );
  await page.getByRole('button', { name: '确认' }).click();
  const loginResponse = await loginResponsePromise;
  const loginBody = await loginResponse.text();

  if (!loginResponse.ok()) {
    throw new Error(`E2E admin login failed with HTTP ${loginResponse.status()}: ${loginBody}`);
  }
  try {
    const payload = JSON.parse(loginBody) as { code?: number };
    if (payload.code !== 200) {
      throw new Error(`E2E admin login failed with business code ${String(payload.code)}: ${loginBody}`);
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`E2E admin login returned invalid JSON: ${loginBody}`, { cause: error });
    }
    throw error;
  }

  await expect(page).toHaveURL(/\/home(?:[/?#]|$)/);
  await fs.mkdir(path.dirname(adminAuthFile), { recursive: true });
  await page.context().storageState({ path: adminAuthFile });
});
