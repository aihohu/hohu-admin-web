import { beforeEach, expect, it, vi } from 'vitest';
import {
  clearRuntimeSettings,
  refreshRuntimeSettings,
  runtimeSettings,
  uploadScenario,
  validateUploadPolicy
} from '../runtime-settings';

const fetchRuntime = vi.hoisted(() => vi.fn());
vi.mock('@/service/api/settings', () => ({ fetchRuntimeSettings: fetchRuntime, fetchPublicSettings: vi.fn() }));

beforeEach(() => clearRuntimeSettings());

it('uses the server limit and allowlist including exact boundaries', () => {
  const policy = { maxBytes: 2000, extensions: ['.xlsx'] };
  expect(validateUploadPolicy({ name: 'USERS.XLSX', size: 2000 }, policy)).toBeNull();
  expect(validateUploadPolicy({ name: 'users.xlsx', size: 2001 }, policy)).toBe('FILE_TOO_LARGE');
  expect(validateUploadPolicy({ name: 'users.exe', size: 1 }, policy)).toBe('INVALID_MIME');
  expect(validateUploadPolicy({ name: 'users.xlsx', size: 2001 })).toBeNull();
  expect(uploadScenario({ name: 'photo.png' }, 'ai-chat')).toBe('image');
  expect(uploadScenario({ name: 'users.xlsx' }, 'user-import')).toBe('import');
  expect(uploadScenario({ name: 'notes.txt' }, 'ai-chat')).toBe('ai_file');
});

it('does not restore a previous tenant policy after logout', async () => {
  let resolve!: (result: { data: { defaultLocale: string }; error: null }) => void;
  fetchRuntime.mockReturnValue(
    new Promise(done => {
      resolve = done;
    })
  );
  const pending = refreshRuntimeSettings();
  clearRuntimeSettings();
  resolve({ data: { defaultLocale: 'en-US' }, error: null });
  expect(await pending).toBeNull();
  expect(runtimeSettings.value).toBeNull();
});
