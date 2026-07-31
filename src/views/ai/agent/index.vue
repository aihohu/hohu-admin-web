<script setup lang="tsx">
import { computed, h, onMounted, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { NButton, NSwitch, NTag, NTooltip } from 'naive-ui';
import type { DataTableColumns, SelectOption } from 'naive-ui';
import { fetchAgentAdminList } from '@/service/api';
import { $t } from '@/locales';
import { useAuth } from '@/hooks/business/auth';
import AgentOperateDrawer from './modules/agent-operate-drawer.vue';

defineOptions({
  name: 'AiAgent',
  meta: {
    title: 'AI Agent 管理',
    i18nKey: 'route.ai_agent'
  }
});

const { t } = useI18n();
const { hasAuth } = useAuth();

const allAgents = shallowRef<Api.AiAgent.AdminListItem[]>([]);
const loading = shallowRef(false);

async function loadList() {
  loading.value = true;
  const { error, data } = await fetchAgentAdminList();
  if (!error) {
    allAgents.value = data;
  }
  loading.value = false;
}

const keyword = ref('');
// 'all' | 'enabled' | 'disabled' — avoid tri-typed boolean union that NSelect can't type
const enabledFilter = ref<'all' | 'enabled' | 'disabled'>('all');

const enabledFilterOptions: SelectOption[] = [
  { label: '全部', value: 'all' },
  { label: '启用', value: 'enabled' },
  { label: '禁用', value: 'disabled' }
];

const filtered = computed(() => {
  return allAgents.value.filter(a => {
    if (keyword.value) {
      const kw = keyword.value.toLowerCase();
      if (!a.code.toLowerCase().includes(kw) && !a.name.toLowerCase().includes(kw)) {
        return false;
      }
    }
    if (enabledFilter.value === 'enabled' && !a.enabled) return false;
    if (enabledFilter.value === 'disabled' && a.enabled) return false;
    return true;
  });
});

const columns = computed<DataTableColumns<Api.AiAgent.AdminListItem>>(() => [
  { title: 'Code', key: 'code', width: 140 },
  { title: '名称', key: 'name', width: 140 },
  {
    title: '描述',
    key: 'description',
    minWidth: 200,
    render: row =>
      h(
        NTooltip,
        {},
        {
          trigger: () => h('span', { class: 'truncate inline-block max-w-300px align-bottom' }, row.description),
          default: () => row.description
        }
      )
  },
  {
    title: '启用',
    key: 'enabled',
    width: 80,
    align: 'center',
    render: row =>
      h(NSwitch, {
        value: row.enabled,
        size: 'small',
        // read-only display; toggle goes through drawer edit (ensures audit + validation)
        onUpdateValue: () => {
          // no-op
        }
      })
  },
  {
    title: '内置',
    key: 'isBuiltin',
    width: 80,
    align: 'center',
    render: row =>
      h(
        NTag,
        { type: row.isBuiltin ? 'info' : 'default', size: 'small' },
        { default: () => (row.isBuiltin ? '是' : '否') }
      )
  },
  { title: '排序', key: 'displayOrder', width: 80, align: 'center' },
  {
    title: t('common.operate'),
    key: 'actions',
    width: 100,
    fixed: 'right',
    render: row =>
      hasAuth('ai:agent:edit')
        ? h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              text: true,
              onClick: () => openEdit(row)
            },
            { default: () => $t('common.edit') }
          )
        : null
  }
]);

// drawer state (read-only listing — no add, no useTableOperate pagination plumbing)
const drawerVisible = ref(false);
const editingData = shallowRef<Api.AiAgent.AdminListItem | null>(null);

function openEdit(row: Api.AiAgent.AdminListItem) {
  editingData.value = row;
  drawerVisible.value = true;
}

onMounted(loadList);
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard title="AI Agent 管理" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <NButton size="small" @click="loadList">{{ $t('common.refresh') }}</NButton>
      </template>
      <NForm inline>
        <NFormItem label="关键字">
          <NInput v-model:value="keyword" placeholder="code / name" clearable />
        </NFormItem>
        <NFormItem label="启用状态">
          <NSelect v-model:value="enabledFilter" :options="enabledFilterOptions" class="w-120px" />
        </NFormItem>
      </NForm>
      <NDataTable
        :columns="columns"
        :data="filtered"
        size="small"
        :loading="loading"
        :row-key="(row: Api.AiAgent.AdminListItem) => row.agentId"
        :scroll-x="840"
      />
      <AgentOperateDrawer v-model:visible="drawerVisible" :edit-row="editingData" @submitted="loadList" />
    </NCard>
  </div>
</template>
