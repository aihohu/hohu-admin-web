import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DeptUsersModal from '../dept-users-modal.vue';

const pages = vi.hoisted(() => ({
  first: {
    authorizationEpoch: '7',
    current: 1,
    size: 100,
    total: 101,
    records: [
      ...Array.from({ length: 99 }, (_, i) => ({
        userId: String(1000 + i),
        userName: `user${i}`,
        nickname: null,
        status: '1',
        fieldAccess: {
          departments: { read: 'plain', replace: true },
          userName: { read: 'plain' },
          nickname: { read: 'plain' }
        },
        isMember: false,
        isPrimary: false
      })),
      {
        userId: '10',
        userName: 'primary',
        nickname: 'Primary',
        status: '1',
        fieldAccess: {
          departments: { read: 'plain', replace: true },
          userName: { read: 'plain' },
          nickname: { read: 'plain' }
        },
        isMember: true,
        isPrimary: true
      }
    ]
  },
  second: {
    authorizationEpoch: '7',
    current: 2,
    size: 100,
    total: 101,
    records: [
      {
        userId: '11',
        userName: 'candidate',
        nickname: null,
        status: '1',
        fieldAccess: {
          departments: { read: 'plain', replace: true },
          userName: { read: 'plain' },
          nickname: { read: 'plain' }
        },
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
  it('refuses full replacement when a projected membership is missing', async () => {
    serviceMocks.fetchGetDeptUsers.mockResolvedValue({
      error: null,
      data: {
        current: 1,
        size: 100,
        total: 1,
        records: [
          { userId: '10', userName: 'hidden', fieldAccess: { departments: { read: 'hidden', replace: false } } }
        ]
      }
    });
    const wrapper = mount(DeptUsersModal, {
      props: { visible: false, deptId: '500', deptName: 'Test' },
      global: { stubs }
    });
    await wrapper.setProps({ visible: true });
    await flushPromises();
    const vm = wrapper.vm as unknown as { handleSubmit: () => Promise<void> };
    await vm.handleSubmit();
    expect(serviceMocks.fetchUpdateDeptUsers).not.toHaveBeenCalled();
    wrapper.unmount();
  });
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

  it.each(['epoch', 'duplicate', 'total', 'short', 'label', 'size'])(
    'refuses an inconsistent %s across pages',
    async kind => {
      const second = structuredClone(pages.second);
      if (kind === 'epoch') second.authorizationEpoch = '8';
      if (kind === 'duplicate') second.records[0].userId = '10';
      if (kind === 'total') second.total = 102;
      if (kind === 'short') second.records = [];
      if (kind === 'label') delete (second.records[0] as Partial<(typeof second.records)[0]>).userName;
      if (kind === 'size') second.size = 20;
      serviceMocks.fetchGetDeptUsers
        .mockResolvedValueOnce({ data: pages.first })
        .mockResolvedValueOnce({ data: second });
      const wrapper = mount(DeptUsersModal, {
        props: { visible: false, deptId: '500', deptName: 'Test' },
        global: { stubs }
      });
      await wrapper.setProps({ visible: true });
      await flushPromises();
      await (wrapper.vm as unknown as { handleSubmit: () => Promise<void> }).handleSubmit();
      expect(serviceMocks.fetchUpdateDeptUsers).not.toHaveBeenCalled();
      wrapper.unmount();
    }
  );
});
