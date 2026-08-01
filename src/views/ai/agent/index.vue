<script setup lang="tsx">
import { computed, onMounted, reactive, shallowRef } from 'vue';
import { NButton, NSwitch, NTag, NTooltip } from 'naive-ui';
import { fetchAgentAdminList } from '@/service/api';
import { useNaiveTable } from '@/hooks/common/table';
import { useAuth } from '@/hooks/business/auth';
import { $t } from '@/locales';
import AgentOperateDrawer from './modules/agent-operate-drawer.vue';
import AgentSearch from './modules/agent-search.vue';

defineOptions({
  name: 'AiAgent'
});

const { hasAuth } = useAuth();

// §决策 #23：list 端点无分页，返回全量。useNaiveTable 走非分页模式（pagination: false），
// 服务器全量取回后前端按 keyword / enabledFilter 二次筛选。
const searchParams: Api.AiAgent.AdminListSearchParams = reactive({
  keyword: null,
  enabledFilter: 'all'
});

const { columns, columnChecks, data, getData, loading, scrollX } = useNaiveTable({
  api: fetchAgentAdminList,
  // 非分页模式：transform 直接返回数组（GetApiData<ApiData, false> = ApiData[]）
  transform: response => response.data ?? [],
  immediate: false,
  columns: () => [
    {
      key: 'index',
      title: $t('common.index'),
      align: 'center',
      width: 64,
      render: (_, index) => index + 1
    },
    {
      key: 'code',
      title: $t('page.ai.agent.code'),
      align: 'center',
      width: 140
    },
    {
      key: 'name',
      title: $t('page.ai.agent.name'),
      align: 'center',
      minWidth: 120
    },
    {
      key: 'description',
      title: $t('page.ai.agent.description'),
      minWidth: 240,
      render: row => (
        <NTooltip style="max-width: 480px">
          {{
            trigger: () => <span class="truncate inline-block max-w-300px align-bottom">{row.description}</span>,
            default: () => row.description
          }}
        </NTooltip>
      )
    },
    {
      key: 'enabled',
      title: $t('page.ai.agent.enabled'),
      align: 'center',
      width: 80,
      render: row => (
        <NSwitch
          value={row.enabled}
          size="small"
          onUpdateValue={() => {
            // read-only display; toggle goes through drawer edit (ensures audit + validation)
          }}
        />
      )
    },
    {
      key: 'isBuiltin',
      title: $t('page.ai.agent.isBuiltin'),
      align: 'center',
      width: 80,
      render: row => (
        <NTag type={row.isBuiltin ? 'info' : 'default'} size="small">
          {row.isBuiltin ? $t('page.ai.agent.yes') : $t('page.ai.agent.no')}
        </NTag>
      )
    },
    {
      key: 'displayOrder',
      title: $t('page.ai.agent.displayOrder'),
      align: 'center',
      width: 80
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 100,
      fixed: 'right',
      render: row =>
        hasAuth('ai:agent:edit') ? (
          <NButton size="small" type="primary" text onClick={() => openEdit(row)}>
            {$t('common.edit')}
          </NButton>
        ) : null
    }
  ]
});

// 前端二次筛选 — searchParams 改变即触发 computed 重算
const filtered = computed(() => {
  return data.value.filter(a => {
    const kw = searchParams.keyword?.trim().toLowerCase();
    if (kw) {
      if (!a.code.toLowerCase().includes(kw) && !a.name.toLowerCase().includes(kw)) {
        return false;
      }
    }
    if (searchParams.enabledFilter === 'enabled' && !a.enabled) return false;
    if (searchParams.enabledFilter === 'disabled' && a.enabled) return false;
    return true;
  });
});

// drawer state (read-only listing — no add, no useTableOperate pagination plumbing)
const drawerVisible = shallowRef(false);
const editingData = shallowRef<Api.AiAgent.AdminListItem | null>(null);

function openEdit(row: Api.AiAgent.AdminListItem) {
  editingData.value = row;
  drawerVisible.value = true;
}

// searchParams 是客户端筛选，无需重取；保留 API 与 system 页一致
function handleSearch() {}

onMounted(getData);
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <AgentSearch v-model:model="searchParams" @search="handleSearch" />
    <NCard :title="$t('page.ai.agent.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :loading="loading"
          :show-add="false"
          :show-delete="false"
          @refresh="getData"
        />
      </template>
      <NDataTable
        :columns="columns"
        :data="filtered"
        size="small"
        :loading="loading"
        :row-key="(row: Api.AiAgent.AdminListItem) => row.agentId"
        :scroll-x="scrollX"
        :pagination="false"
      />
      <AgentOperateDrawer v-model:visible="drawerVisible" :edit-row="editingData" @submitted="getData" />
    </NCard>
  </div>
</template>
