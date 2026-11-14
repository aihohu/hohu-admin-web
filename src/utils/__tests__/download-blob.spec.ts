import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from '../download-blob';

afterEach(() => vi.restoreAllMocks());
describe('authenticated file download', () => {
  it.each([
    null,
    '/uploads/raw',
    new Blob([]),
    new Blob(['{"code":403}'], { type: 'application/json' }),
    new Blob(['<html>denied</html>'], { type: 'text/html' })
  ])('does not turn a denial or URL into a file', value => {
    const create = vi.spyOn(URL, 'createObjectURL');
    expect(downloadBlob(value, 'file.xlsx')).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });
  it('downloads authenticated bytes and retires the object URL', () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:owned');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    expect(downloadBlob(new Blob(['file bytes']), '../file.txt')).toBe(true);
    expect(click).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith('blob:owned');
    expect(document.querySelector('a[href="blob:owned"]')).toBeNull();
  });
});
