import { beforeEach, describe, expect, it, vi } from 'vitest';

const uploadMock = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock('@/service/api', () => ({
  fetchUploadFile: (...args: unknown[]) => uploadMock(...args)
}));

import { uploadChatFile } from '../chat-upload';

describe('chat upload business type', () => {
  beforeEach(() => {
    uploadMock.mockClear();
  });

  it.each(['users.csv', 'users.XLSX'])('marks supported import file %s as user-import', async fileName => {
    const file = new File(['content'], fileName, { type: 'application/octet-stream' });

    await uploadChatFile(file);

    expect(uploadMock).toHaveBeenCalledWith(file, 'user-import');
  });

  it('quarantines legacy xls privately even when a caller bypasses the UI allowlist', async () => {
    const file = new File(['legacy'], 'users.XLS', { type: 'application/vnd.ms-excel' });

    await uploadChatFile(file);

    expect(uploadMock).toHaveBeenCalledWith(file, 'user-import');
  });

  it.each([
    ['avatar.png', 'image/png'],
    ['notes.txt', 'text/plain'],
    ['users.csv.exe', 'application/octet-stream']
  ])('keeps non-import file %s in ai-chat', async (fileName, mimeType) => {
    const file = new File(['content'], fileName, { type: mimeType });

    await uploadChatFile(file);

    expect(uploadMock).toHaveBeenCalledWith(file, 'ai-chat');
  });
});
