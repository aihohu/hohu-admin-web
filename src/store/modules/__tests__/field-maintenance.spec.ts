import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useFieldMaintenance } from '../field-maintenance';

const client = vi.hoisted(() => ({
  repository: {},
  login: vi.fn(),
  logout: vi.fn(),
  finish: vi.fn(),
  dispose: vi.fn()
}));
vi.mock('@/service/request/policy-preparation', () => ({ createPreparationClient: () => client }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  setActivePinia(createPinia());
  client.login.mockResolvedValue({ actorId: '12', tenantId: '71', expiresIn: 2 });
});
afterEach(() => {
  document.head.querySelector('meta[name="hohu-admission"]')?.remove();
  vi.useRealTimers();
});
function maintenance() {
  const meta = document.createElement('meta');
  meta.name = 'hohu-admission';
  meta.content = 'field-management/2';
  document.head.append(meta);
  return useFieldMaintenance();
}

it('uses maintenance identity only when the controller serves the console', async () => {
  await expect(useFieldMaintenance().login('operator', 'test')).rejects.toThrow();
  expect(client.login).not.toHaveBeenCalled();
});
it('clears the tenant identity and transport when the short session expires', async () => {
  const session = maintenance();
  await session.login('operator', 'test', 'second');
  expect(client.login).toHaveBeenCalledWith({ userName: 'operator', password: 'test', tenantCode: 'second' });
  expect(session.identity).toMatch(/^71\/12\//);
  vi.advanceTimersByTime(2000);
  expect(session.identity).toBe('');
  expect(client.dispose).toHaveBeenCalledTimes(2);
});
it('clears the session on logout even when the connection closes', async () => {
  const session = maintenance();
  await session.login('operator', 'test');
  client.logout.mockRejectedValue(new Error('closed'));
  await expect(session.logout()).rejects.toThrow();
  expect(session.identity).toBe('');
});
it('keeps the session on refused finish and prevents re-entry after confirmed completion', async () => {
  const session = maintenance();
  await session.login('operator', 'test');
  client.finish.mockRejectedValueOnce(new Error('tenants pending'));
  await expect(session.finish()).rejects.toThrow();
  expect(session.identity).toBeTruthy();
  await session.finish();
  expect(session.ended).toBe(true);
  expect(session.identity).toBe('');
  await expect(session.login('operator', 'test')).rejects.toThrow();
});
