import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';

const uploadMock = vi.fn();
const store = reactive({
  attachedImages: [] as Array<{ fileUrl: string; mediaType: string; fileName: string }>,
  attachedFiles: [] as Array<{ fileId: string; fileName: string; mimeType: string; fileSize: number }>,
  availableModels: [
    { modelId: 'model-1', label: 'Provider / Model One', providerCode: 'provider', capabilities: ['text'] },
    { modelId: 'model-2', label: 'Provider / Model Two', providerCode: 'provider', capabilities: ['text'] }
  ],
  selectedModelId: 'model-1',
  availableAgents: [
    { code: 'user_mgmt', name: 'User Agent', description: 'Manage users', modelPreference: null, displayOrder: 1 }
  ],
  selectedAgentCode: 'auto',
  addImage: vi.fn((fileUrl: string, mediaType: string, fileName: string) =>
    store.attachedImages.push({ fileUrl, mediaType, fileName })
  ),
  removeImage: vi.fn((index: number) => store.attachedImages.splice(index, 1)),
  addFile: vi.fn((fileId: string, fileName: string, mimeType: string, fileSize: number) =>
    store.attachedFiles.push({ fileId, fileName, mimeType, fileSize })
  ),
  removeFile: vi.fn((index: number) => store.attachedFiles.splice(index, 1))
});

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('@/store/modules/ai', () => ({ useAiStore: () => store }));
vi.mock('../chat-upload', () => ({ uploadChatFile: (...args: unknown[]) => uploadMock(...args) }));

import ChatInput from '../chat-input.vue';

const NDropdown = {
  props: ['options', 'value', 'renderLabel'],
  emits: ['select'],
  template:
    '<div class="dropdown-stub"><slot/><button class="dropdown-select" @click="$emit(\'select\', options[0].children ? options[0].children[1].key : options[1].key)"/></div>'
};

function render(props: Record<string, unknown> = {}) {
  return mount(ChatInput, {
    props: { modelValue: '', ...props },
    global: {
      stubs: {
        NDropdown,
        IconIcRoundInsertDriveFile: true,
        IconIcRoundAttachFile: true,
        IconIcRoundSmartToy: true,
        IconIcRoundArrowDropDown: true,
        IconIcRoundMemory: true
      }
    }
  });
}

describe('chat input behavior', () => {
  beforeEach(() => {
    store.attachedImages = [];
    store.attachedFiles = [];
    store.selectedAgentCode = 'auto';
    store.selectedModelId = 'model-1';
    store.addImage.mockClear();
    store.removeImage.mockClear();
    store.addFile.mockClear();
    store.removeFile.mockClear();
    uploadMock.mockReset();
    (window as any).$message = { error: vi.fn(), warning: vi.fn() };
  });

  it('sends on Enter or button click and stops an active stream', async () => {
    const wrapper = render({ modelValue: 'find alice' });
    await wrapper.get('textarea').trigger('keydown', { key: 'Enter' });
    await wrapper.get('.input-action-btn').trigger('click');
    expect(wrapper.emitted('send')).toHaveLength(2);

    await wrapper.setProps({ isStreaming: true });
    await wrapper.get('textarea').trigger('keydown', { key: 'Enter' });
    await wrapper.get('.input-action-btn').trigger('click');
    expect(wrapper.emitted('stop')).toHaveLength(2);
  });

  it('renders the current explicit Agent and grouped model selection', async () => {
    const wrapper = render();
    store.selectedAgentCode = 'user_mgmt';
    store.selectedModelId = 'model-2';
    await wrapper.vm.$nextTick();

    expect(store.selectedAgentCode).toBe('user_mgmt');
    expect(store.selectedModelId).toBe('model-2');
    expect(wrapper.text()).toContain('User Agent');
    expect(wrapper.text()).toContain('Provider / Model Two');
  });

  it('uploads supported images and spreadsheets and rejects unknown files', async () => {
    uploadMock
      .mockResolvedValueOnce({ data: { fileUrl: '/files/image', fileId: 'image-1' }, error: null })
      .mockResolvedValueOnce({
        data: { fileId: 'file-1', originalName: 'users.csv', mimeType: 'text/csv' },
        error: null
      })
      .mockResolvedValueOnce({ data: null, error: new Error('upload failed') });
    const wrapper = render();
    const input = wrapper.get('input[type="file"]');
    const image = new File(['image'], 'avatar.png', { type: 'image/png' });
    const csv = new File(['name'], 'users.csv', { type: 'text/csv' });
    const unknown = new File(['x'], 'payload.exe', { type: 'application/octet-stream' });
    Object.defineProperty(input.element, 'files', { configurable: true, value: [image, csv, unknown] });

    await input.trigger('change');
    await flushPromises();

    expect(store.addImage).toHaveBeenCalledWith('/files/image', 'image/png', 'avatar.png');
    expect(store.addFile).toHaveBeenCalledWith('file-1', 'users.csv', 'text/csv', csv.size);
    expect((window as any).$message.warning).toHaveBeenCalledWith('page.ai.chat.fileTypeUnsupported');

    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [
        new File(['x'], 'failed.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      ]
    });
    await input.trigger('change');
    await flushPromises();
    expect((window as any).$message.error).toHaveBeenCalledWith('page.ai.chat.fileUploadFailed');
  });

  it('handles pasted and dropped files and renders removable size previews', async () => {
    uploadMock.mockResolvedValue({
      data: { fileUrl: '/files/pasted', fileId: 'file-2', originalName: 'sheet.xlsx', mimeType: 'text/csv' },
      error: null
    });
    store.attachedFiles.push(
      { fileId: 'small', fileName: 'small.csv', mimeType: 'text/csv', fileSize: 512 },
      { fileId: 'medium', fileName: 'medium.csv', mimeType: 'text/csv', fileSize: 2048 },
      { fileId: 'large', fileName: 'large.csv', mimeType: 'text/csv', fileSize: 2 * 1024 * 1024 }
    );
    const wrapper = render();
    expect(wrapper.text()).toContain('512 B');
    expect(wrapper.text()).toContain('2.0 KB');
    expect(wrapper.text()).toContain('2.0 MB');

    const pastedImage = new File(['image'], 'paste.png', { type: 'image/png' });
    await wrapper.get('textarea').trigger('paste', {
      clipboardData: {
        items: [{ type: 'image/png', kind: 'file', getAsFile: () => pastedImage }]
      }
    });
    const droppedCsv = new File(['name'], 'drop.csv', { type: '' });
    await wrapper.get('.input-wrapper').trigger('drop', {
      dataTransfer: { files: [droppedCsv] }
    });
    await flushPromises();

    expect(store.addImage).toHaveBeenCalledWith('/files/pasted', 'image/png', 'pasted-image');
    expect(store.addFile).toHaveBeenCalled();
    await wrapper.findAll('.attach-remove--file')[0].trigger('click');
    expect(store.removeFile).toHaveBeenCalledWith(0);
  });

  it('resizes the textarea and ignores empty file and clipboard collections', async () => {
    const wrapper = render();
    const textarea = wrapper.get('textarea');
    Object.defineProperty(textarea.element, 'scrollHeight', { configurable: true, value: 240 });
    await textarea.trigger('input');
    expect((textarea.element as HTMLTextAreaElement).style.height).toBe('200px');
    await textarea.trigger('paste', { clipboardData: undefined });
    await wrapper.get('.input-wrapper').trigger('drop', { dataTransfer: undefined });
  });
});
