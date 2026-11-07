import { defineComponent } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, expect, it, vi } from 'vitest';
import FieldPolicyDrawer from '../field-policy-drawer.vue';
import FieldPolicyRules from '../field-policy-rules.vue';

const dialogs = vi.hoisted(() => ({ warning: vi.fn(), success: vi.fn() }));
vi.mock('naive-ui', async importOriginal => ({
  ...(await importOriginal<typeof import('naive-ui')>()),
  useDialog: () => dialogs,
  useMessage: () => dialogs
}));
vi.mock('@/locales', () => ({ $t: (key: string) => key }));
const container = defineComponent({ template: '<div><slot /><slot name="recommend" /><slot name="preview" /></div>' });
const button = defineComponent({ props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' });
const context = {
  catalogDigest: 'catalog',
  headVersion: '1',
  epoch: '1',
  tenantId: '0',
  activeManifestDigest: null,
  candidateManifestDigest: null,
  capabilities: { view: true, edit: true, freeze: false, activate: false }
};
const field = {
  fieldId: 'nickname',
  structural: false,
  bulkEligible: true,
  maskId: null,
  choices: [
    {
      access: { operation: 'read', purpose: 'management.read', use: '' },
      values: ['unset', 'deny', 'plain'],
      safeRecommendation: true
    }
  ]
} as Api.FieldManagement.Field;
function repository(edit = true) {
  const common = { ...context, capabilities: { ...context.capabilities, edit } };
  return {
    catalog: vi.fn().mockResolvedValue({
      ...common,
      objects: [{ objectId: 'system.user', fields: [field] }],
      complete: true,
      nextCursor: null
    }),
    object: vi.fn().mockResolvedValue({
      ...common,
      role: { roleId: '201', roleName: 'Admin', roleCode: 'R_SUPER', dataScope: '1' },
      objectId: 'system.user',
      bindingVersion: '0',
      rules: []
    }),
    manifest: vi.fn().mockResolvedValue({ ...common, items: [] }),
    preview: vi.fn(),
    publish: vi.fn(),
    roles: vi.fn(),
    previewManifest: vi.fn(),
    build: vi.fn(),
    freeze: vi.fn(),
    receipt: vi.fn()
  };
}
async function render(edit = true) {
  const repo = repository(edit);
  const stubs = Object.fromEntries(
    [
      'Drawer',
      'DrawerContent',
      'Spin',
      'Space',
      'Alert',
      'Tag',
      'Text',
      'Descriptions',
      'DescriptionsItem',
      'FormItem',
      'Tabs'
    ].flatMap(name => [
      [name, container],
      ['N' + name, container]
    ])
  );
  const page = mount(FieldPolicyDrawer, {
    props: { visible: false, roleId: '201', identity: '0/101', repository: repo },
    global: {
      stubs: {
        ...stubs,
        Button: button,
        Select: true,
        Input: true,
        DataTable: true,
        TabPane: true,
        Divider: true,
        Empty: true
      }
    }
  });
  await page.setProps({ visible: true });
  await flushPromises();
  return { page, repo };
}
beforeEach(() => vi.clearAllMocks());
it('retains confirmed action order and requires confirmation before discarding a draft', async () => {
  const { page, repo } = await render();
  const actions = page.findAll('button').map(b => b.text());
  const index = actions.indexOf('fieldPolicy.recommend');
  expect(actions.slice(index, index + 3)).toEqual([
    'fieldPolicy.recommend',
    'fieldPolicy.bulkAllow',
    'fieldPolicy.bulkDeny'
  ]);
  await page.findAll('button')[index].trigger('click');
  const pending = page.vm.confirmLeave();
  expect(dialogs.warning).toHaveBeenCalledTimes(1);
  dialogs.warning.mock.calls[0][0].onNegativeClick();
  expect(await pending).toBe(false);
  const accepted = page.vm.confirmLeave();
  dialogs.warning.mock.calls[1][0].onPositiveClick();
  expect(await accepted).toBe(true);
  expect(repo.publish).not.toHaveBeenCalled();
  page.unmount();
});
it('keeps read-only management controls disabled and clears on identity handoff', async () => {
  const { page } = await render(false);
  const actions = page.findAll('button');
  expect(actions.find(b => b.text() === 'fieldPolicy.recommend')!.attributes('disabled')).toBeDefined();
  expect(actions.find(b => b.text() === 'fieldPolicy.saveCandidate')!.attributes('disabled')).toBeDefined();
  expect(page.findComponent(FieldPolicyRules).props('disabled')).toBe(true);
  await page.setProps({ identity: '' });
  await flushPromises();
  expect(page.findComponent(FieldPolicyRules).exists()).toBe(false);
  page.unmount();
});
