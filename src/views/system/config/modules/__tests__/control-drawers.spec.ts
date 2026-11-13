import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ConfigDrawer from '../config-operate-drawer.vue';
import JobDrawer from '../../../job/modules/job-operate-drawer.vue';

const mocks = vi.hoisted(() => ({
  configForm: vi.fn(),
  jobForm: vi.fn(),
  configSave: vi.fn(),
  configUpdate: vi.fn(),
  jobSave: vi.fn(),
  jobUpdate: vi.fn(),
  schedule: vi.fn(),
  registered: vi.fn(),
  publish: vi.fn(),
  revoke: vi.fn(),
  validate: vi.fn()
}));
vi.mock('@/service/api', () => ({
  fetchConfigForm: mocks.configForm,
  fetchJobForm: mocks.jobForm,
  fetchSaveConfig: mocks.configSave,
  fetchUpdateConfig: mocks.configUpdate,
  fetchSaveJob: mocks.jobSave,
  fetchUpdateJob: mocks.jobUpdate,
  updateJobSchedule: mocks.schedule,
  fetchGetRegisteredTasks: mocks.registered,
  publishConfig: mocks.publish,
  revokeConfigPublication: mocks.revoke
}));
vi.mock('@/locales', () => ({ $t: (key: string) => key }));
vi.mock('@/hooks/common/form', () => ({
  useFormRules: () => ({ defaultRequiredRule: {} }),
  useNaiveForm: () => ({ formRef: { value: null }, validate: mocks.validate, restoreValidation: vi.fn() })
}));
vi.mock('@/hooks/common/server-field-errors', () => ({
  getServerErrorMessage: () => '',
  useServerFieldErrors: () => ({
    fieldProps: () => ({}),
    applyServerFieldErrors: () => false,
    clearServerFieldErrors: vi.fn()
  })
}));

const container = { template: '<div><slot /></div>' };
const stubs = {
  NDrawer: container,
  NDrawerContent: { template: '<div><slot /><footer><slot name="footer" /></footer></div>' },
  NForm: container,
  NFormItem: { props: ['path'], template: '<label :data-path="path"><slot /></label>' },
  NSpin: container,
  NAlert: container,
  NEmpty: true,
  NSpace: container,
  NInput: {
    props: ['value', 'disabled'],
    template: '<input :disabled="disabled" :value="value" @input="$emit(\'update:value\', $event.target.value)" />'
  },
  NSelect: true,
  NRadioGroup: true,
  NRadio: true,
  NInputNumber: true,
  NSwitch: true,
  NPopconfirm: {
    emits: ['positive-click'],
    template:
      '<div><slot name="trigger" /><button data-confirm @click="$emit(\'positive-click\')">confirm</button></div>'
  },
  NButton: { props: ['disabled', 'loading'], template: '<button :disabled="disabled || loading"><slot /></button>' }
};
const policy = {
  read: ['remark'],
  readLevels: { remark: 'plain' },
  update: ['config_value'],
  create: [],
  specialCreate: [],
  specialUpdate: [],
  query: [],
  canCreate: false,
  complete: {}
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.validate.mockResolvedValue(undefined);
  mocks.configForm.mockResolvedValue({
    data: { record: { remark: null }, fieldPolicy: policy, formReceipt: 'receipt' },
    error: null
  });
  mocks.configUpdate.mockResolvedValue({ data: null, error: null });
  mocks.jobForm.mockResolvedValue({
    data: {
      record: { remark: null },
      fieldPolicy: { ...policy, update: ['job_name', 'remark'], specialUpdate: ['cron_expression'] },
      formReceipt: 'job-receipt'
    },
    error: null
  });
  mocks.jobUpdate.mockResolvedValue({ data: null, error: null });
  mocks.schedule.mockResolvedValue({ data: null, error: null });
});

describe('real control drawer requests', () => {
  it('requires a new snapshot after a rejected configuration save', async () => {
    mocks.configUpdate.mockResolvedValueOnce({ error: new Error('stale receipt') });
    const wrapper = mount(ConfigDrawer, {
      props: { visible: true, operateType: 'edit', rowData: { configId: '1' } },
      global: { stubs }
    });
    await flushPromises();
    await wrapper.get('[data-path="configValue"] input').setValue('Replacement');
    await wrapper.get('footer button:last-child').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('fieldPolicy.loadFailed');
    expect(wrapper.findAll('footer button')).toHaveLength(1);
    expect(mocks.configForm).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
  it('blocks duplicate submissions while asynchronous validation is still pending', async () => {
    let finish!: () => void;
    mocks.validate.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          finish = resolve;
        })
    );
    const wrapper = mount(ConfigDrawer, {
      props: { visible: true, operateType: 'edit', rowData: { configId: '1' } },
      global: { stubs }
    });
    await flushPromises();
    await wrapper.get('[data-path="configValue"] input').setValue('Once');
    await wrapper.get('footer button:last-child').trigger('click');
    await wrapper.get('footer button:last-child').trigger('click');
    expect(mocks.validate).toHaveBeenCalledOnce();
    finish();
    await flushPromises();
    expect(mocks.configUpdate).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
  it('loads a fresh config proof and submits only the explicit blind replacement', async () => {
    const wrapper = mount(ConfigDrawer, {
      props: { visible: true, operateType: 'edit', rowData: { configId: '1', configValue: 'stale-secret' } },
      global: { stubs }
    });
    await flushPromises();
    expect(mocks.configForm).toHaveBeenCalledWith({ mode: 'update', recordId: '1' });
    expect(wrapper.get<HTMLInputElement>('[data-path="configValue"] input').element.value).toBe('');
    expect(wrapper.findComponent({ name: 'NSwitch' }).exists()).toBe(false);
    await wrapper.get('[data-path="configValue"] input').setValue('Explicit');
    await wrapper.get('footer button:last-child').trigger('click');
    await flushPromises();
    expect(mocks.configUpdate).toHaveBeenCalledWith('1', { configValue: 'Explicit', formReceipt: 'receipt' });
    wrapper.unmount();
  });
  it('does not let a late config save close a new target draft', async () => {
    let finish!: (value: unknown) => void;
    mocks.configUpdate.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const wrapper = mount(ConfigDrawer, {
      props: { visible: true, operateType: 'edit', rowData: { configId: '1' } },
      global: { stubs }
    });
    await flushPromises();
    await wrapper.get('[data-path="configValue"] input').setValue('A');
    await wrapper.get('footer button:last-child').trigger('click');
    await flushPromises();
    await wrapper.setProps({ rowData: { configId: '2' } });
    await flushPromises();
    await wrapper.get('[data-path="configValue"] input').setValue('B');
    finish({ data: null, error: null });
    await flushPromises();
    expect(wrapper.emitted('submitted')).toBeUndefined();
    expect(wrapper.emitted('update:visible')).toBeUndefined();
    expect(wrapper.get<HTMLInputElement>('[data-path="configValue"] input').element.value).toBe('B');
    wrapper.unmount();
  });
  it('keeps task metadata separate from scheduling and preserves absent legacy arguments', async () => {
    const wrapper = mount(JobDrawer, {
      props: { visible: true, operateType: 'edit', rowData: { jobId: '2', jobArgs: 'old hidden JSON' } },
      global: { stubs }
    });
    await flushPromises();
    await wrapper.get('[data-path="jobName"] input').setValue('Repair name');
    await wrapper.get('footer button:last-child').trigger('click');
    await flushPromises();
    expect(mocks.jobUpdate).toHaveBeenCalledWith({ jobId: '2', jobName: 'Repair name', formReceipt: 'job-receipt' });
    expect(mocks.schedule).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it('sends scheduling through its dedicated command with only touched special fields', async () => {
    const wrapper = mount(JobDrawer, {
      props: { visible: true, operateType: 'edit', command: 'schedule', rowData: { jobId: '2' } },
      global: { stubs }
    });
    await flushPromises();
    expect(wrapper.find('[data-path="jobName"]').exists()).toBe(false);
    await wrapper.get('[data-path="cronExpression"] input').setValue('0 * * * *');
    await wrapper.get('footer button:last-child').trigger('click');
    await flushPromises();
    expect(mocks.schedule).toHaveBeenCalledWith({ jobId: '2', cronExpression: '0 * * * *' });
    expect(mocks.jobUpdate).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
