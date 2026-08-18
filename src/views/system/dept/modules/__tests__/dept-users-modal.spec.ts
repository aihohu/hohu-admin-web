import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DeptUsersModal from '../dept-users-modal.vue';

const pages = vi.hoisted(() => ({
  first: {
    current: 1,
    size: 100,
    total: 101,
    records: [
      {
        userId: '10',
        userName: 'primary',
        nickname: 'Primary',
        status: '1',
        isMember: true,
        isPrimary: true
      }
    ]
  },
  second: {
    current: 2,
    size: 100,
    total: 101,
    records: [
      {
        userId: '11',
        userName: 'candidate',
        nickname: null,
        status: '1',
        isMember: false,
        isPrimary: false
      }
    ]
  }
}));

const serviceMocks = vi.hoisted(() => ({
  fetchGetDeptUsers: vi.fn(),
  fetchUpdateDeptUsers: vi.fn()
}));

vi.mock('@/service/api', () => ({
  fetchGetDeptUsers: serviceMocks.fetchGetDeptUsers,
  fetchUpdateDeptUsers: serviceMocks.fetchUpdateDeptUsers
}));

vi.mock('@/locales', () => ({
  $t: (key: string) => key
}));

const stubs = {
  NModal: { template: '<div><slot /><slot name="footer" /></div>' },
  NSpin: { template: '<div><slot /></div>' },
  NTransfer: true,
  NButton: true,
  NSpace: { template: '<div><slot /></div>' }
};

describe('dept-users-modal', () => {
  beforeEach(() => {
    serviceMocks.fetchGetDeptUsers.mockReset();
    serviceMocks.fetchUpdateDeptUsers.mockReset();
    serviceMocks.fetchUpdateDeptUsers.mockResolvedValue({
      error: null,
      response: { data: { msg: 'updated' } }
    });
  });

  it('loads every page and submits a complete canonical member set', async () => {
    serviceMocks.fetchGetDeptUsers
      .mockResolvedValueOnce({ error: null, data: pages.first })
      .mockResolvedValueOnce({ error: null, data: pages.second });
    const { fetchGetDeptUsers, fetchUpdateDeptUsers } = await import('@/service/api');
    const wrapper = mount(DeptUsersModal, {
      props: { visible: false, deptId: '500', deptName: 'Engineering' },
      global: { stubs }
    });

    await wrapper.setProps({ visible: true });
    await flushPromises();

    expect(fetchGetDeptUsers).toHaveBeenNthCalledWith(1, '500', { current: 1, size: 100 });
    expect(fetchGetDeptUsers).toHaveBeenNthCalledWith(2, '500', { current: 2, size: 100 });

    const vm = wrapper.vm as unknown as {
      memberIds: string[];
      transferOptions: Array<{ value: string; disabled?: boolean }>;
      handleSubmit: () => Promise<void>;
    };
    expect(vm.memberIds).toEqual(['10']);
    expect(vm.transferOptions.find(option => option.value === '10')?.disabled).toBe(true);
    vm.memberIds.push('11');

    await vm.handleSubmit();

    expect(fetchUpdateDeptUsers).toHaveBeenCalledWith('500', { userIds: ['10', '11'] });
  });

  it('keeps submission disabled when a later candidate page fails', async () => {
    serviceMocks.fetchGetDeptUsers
      .mockResolvedValueOnce({ error: null, data: pages.first })
      .mockResolvedValueOnce({ error: new Error('page failed'), data: null });
    const wrapper = mount(DeptUsersModal, {
      props: { visible: false, deptId: '500', deptName: 'Engineering' },
      global: { stubs }
    });

    await wrapper.setProps({ visible: true });
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      loadedSuccessfully: boolean;
      handleSubmit: () => Promise<void>;
    };
    expect(vm.loadedSuccessfully).toBe(false);
    await vm.handleSubmit();
    expect(serviceMocks.fetchUpdateDeptUsers).not.toHaveBeenCalled();
  });

  it('keeps submission disabled when the first candidate page fails', async () => {
    serviceMocks.fetchGetDeptUsers.mockResolvedValueOnce({ error: new Error('page failed'), data: null });
    const wrapper = mount(DeptUsersModal, {
      props: { visible: false, deptId: '500', deptName: 'Engineering' },
      global: { stubs }
    });

    await wrapper.setProps({ visible: true });
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      loadedSuccessfully: boolean;
      handleSubmit: () => Promise<void>;
    };
    expect(vm.loadedSuccessfully).toBe(false);
    await vm.handleSubmit();
    expect(serviceMocks.fetchUpdateDeptUsers).not.toHaveBeenCalled();
  });
});
