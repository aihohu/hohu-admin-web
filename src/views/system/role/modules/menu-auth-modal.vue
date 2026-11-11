<script setup lang="ts">
import { computed, onScopeDispose, shallowRef, watch } from 'vue';
import { fetchGetAllPages, fetchGetMenuTree, fetchGetRoleMenuList, fetchUpdateRoleMenu } from '@/service/api';
import { completeTreeIds } from '@/hooks/business/relation-tree';
import { $t, localizedText } from '@/locales';

defineOptions({
  name: 'MenuAuthModal'
});

interface Props {
  /** the roleId */
  roleId: string;
}

const props = defineProps<Props>();

const visible = defineModel<boolean>('visible', {
  default: false
});

function closeModal() {
  visible.value = false;
}

const title = computed(() => $t('common.edit') + $t('page.system.role.menuAuth'));

const showSpin = shallowRef<boolean>(false);
const loaded = shallowRef(false);
const saving = shallowRef(false);
let generation = 0;
onScopeDispose(() => {
  generation += 1;
});
let availableIds = new Set<string>();

const home = shallowRef('');

async function getHome() {
  home.value = 'home';
}

// async function updateHome(val: string) {
//   // request

//   home.value = val;
// }

const pages = shallowRef<string[]>([]);

// const pageSelectOptions = computed(() => {
//   const opts: CommonType.Option[] = pages.value.map(page => ({
//     label: page,
//     value: page
//   }));

//   return opts;
// });

function translateTree(nodes: Api.SystemManage.MenuTree[]): Api.SystemManage.MenuTree[] {
  return nodes.map(node => ({
    ...node,
    label: localizedText(node.label, node.i18nKey),
    children: node.children ? translateTree(node.children) : undefined
  }));
}

const tree = shallowRef<Api.SystemManage.MenuTree[]>([]);
const localizedTree = computed(() => translateTree(tree.value));

const checks = shallowRef<string[]>([]);
const indeterminateKeys = shallowRef<Array<string | number>>([]);

/**
 * 根据 tree 与 checks 主动计算半选父节点。
 * NTree cascade 模式下，初始加载不会 emit indeterminate-keys，导致用户
 * 未操作直接点确认时丢失半选父菜单（父菜单关联被清空，用户失去路由）。
 */
function recomputeIndeterminate() {
  const checkedSet = new Set(checks.value);
  const result: Array<string | number> = [];

  const dfs = (node: Api.SystemManage.MenuTree): { selected: number; total: number } => {
    const children = node.children || [];
    if (children.length === 0) {
      return {
        selected: checkedSet.has(node.id) ? 1 : 0,
        total: 1
      };
    }
    let selected = 0;
    let total = 0;
    for (const child of children) {
      const r = dfs(child);
      selected += r.selected;
      total += r.total;
    }
    if (selected > 0 && selected < total) {
      result.push(node.id);
    }
    return { selected, total };
  };

  for (const root of tree.value) {
    dfs(root);
  }
  indeterminateKeys.value = result;
}

const handleIndeterminateKeysCheck = (keys: Array<string | number>) => {
  indeterminateKeys.value = keys;
};

async function handleSubmit() {
  if (!visible.value || showSpin.value || saving.value || !loaded.value) return;
  const token = generation;
  const roleId = props.roleId;
  const allCheckedKeys = [...new Set([...checks.value, ...indeterminateKeys.value])];
  if (allCheckedKeys.some(key => typeof key !== 'string' || !availableIds.has(key))) return;
  saving.value = true;
  try {
    const { error } = await fetchUpdateRoleMenu(roleId, allCheckedKeys);
    if (token !== generation || !visible.value) return;
    if (!error) {
      window.$message?.success?.($t('common.modifySuccess'));
      closeModal();
    }
  } finally {
    if (token === generation) saving.value = false;
  }
}

async function init(token: number) {
  showSpin.value = true;
  getHome();
  const roleId = props.roleId;
  try {
    const [pageResult, treeResult, checkResult] = await Promise.all([
      fetchGetAllPages(),
      fetchGetMenuTree(),
      fetchGetRoleMenuList(roleId)
    ]);
    if (token !== generation || !visible.value) return;
    if (!pageResult.error && pageResult.data) pages.value = pageResult.data;
    if (treeResult.error || checkResult.error || !Array.isArray(checkResult.data)) return;
    const ids = completeTreeIds(treeResult.data);
    if (!ids || new Set(checkResult.data).size !== checkResult.data.length || checkResult.data.some(id => !ids.has(id)))
      return;
    availableIds = ids;
    tree.value = treeResult.data;
    checks.value = checkResult.data;
    recomputeIndeterminate();
    loaded.value = true;
  } catch {
    // No partial or failed collection becomes an empty replacement.
  } finally {
    if (token === generation) showSpin.value = false;
  }
}

watch(
  [visible, () => props.roleId],
  () => {
    const token = ++generation;
    loaded.value = false;
    saving.value = false;
    showSpin.value = false;
    checks.value = [];
    tree.value = [];
    pages.value = [];
    indeterminateKeys.value = [];
    availableIds = new Set();
    if (visible.value && props.roleId) init(token);
  },
  { immediate: true, flush: 'sync' }
);
</script>

<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-480px">
    <NSpace vertical>
      <NSpin :show="showSpin">
        <!--
 <div class="flex-y-center gap-16px pb-12px">
      <div>{{ $t('page.system.menu.home') }}</div>
      <NSelect :value="home" :options="pageSelectOptions" size="small" class="w-160px" @update:value="updateHome" />
    </div> 
-->

        <NAlert v-if="!showSpin && !loaded" type="warning" class="mb-3">
          {{ $t('fieldPolicy.relationUnavailable') }}
        </NAlert>
        <NTree
          v-model:checked-keys="checks"
          :disabled="!loaded || saving"
          :data="localizedTree"
          key-field="id"
          checkable
          cascade
          show-line
          expand-on-click
          virtual-scroll
          block-line
          class="h-280px"
          @update-indeterminate-keys="handleIndeterminateKeysCheck"
        />
      </NSpin>
    </NSpace>

    <template #footer>
      <NSpace justify="end">
        <NButton size="small" class="mt-16px" @click="closeModal">
          {{ $t('common.cancel') }}
        </NButton>
        <NButton
          :disabled="!loaded || showSpin"
          :loading="saving"
          type="primary"
          size="small"
          class="mt-16px"
          @click="handleSubmit"
        >
          {{ $t('common.confirm') }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
