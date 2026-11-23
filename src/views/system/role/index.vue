<script setup lang="tsx">
import { localizedText } from '@/locales';
import { computed, nextTick, onMounted, reactive, shallowRef, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { NAlert, NButton, NPopconfirm, NTag } from 'naive-ui';
import { useBoolean } from '@sa/hooks';
import { enableStatusRecord, roleDataScopeRecord } from '@/constants/business';
import { fetchBatchDeleteRole, fetchDeleteRole, fetchGetRoleList } from '@/service/api';
import { fetchAiQueryCache } from '@/service/api/ai';
import { useAppStore } from '@/store/modules/app';
import { useAuthStore } from '@/store/modules/auth';
import { fieldPolicyRepository } from '@/service/api/field-policy';
import { useAuth } from '@/hooks/business/auth';
import { useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import { fieldAllowed } from '@/hooks/business/ordinary-fields';
import { loadRolePolicyAnchors, useRolePolicyRepair } from '@/hooks/business/role-policy-repair';
import { isMaintenanceConsole } from '@/utils/maintenance-console';
import { useFieldMaintenance } from '@/store/modules/field-maintenance';
import RoleOperateDrawer from './modules/role-operate-drawer.vue';
import RoleSearch from './modules/role-search.vue';
import MenuAuthModal from './modules/menu-auth-modal.vue';
import AiAgentAuthModal from './modules/ai-agent-auth-modal.vue';
import FieldPolicyDrawer from './modules/field-policy-drawer.vue';

const fieldPolicy = shallowRef<Api.SystemManage.OrdinaryCapabilities>();
const appStore = useAppStore();
const authStore = useAuthStore();
const maintenance = isMaintenanceConsole() ? useFieldMaintenance() : undefined;
const repository = maintenance?.repository ?? fieldPolicyRepository;
const fieldPolicyIdentity = computed(() => maintenance ? maintenance.identity : authStore.userInfo.userId + ':' + authStore.token);
const { hasAuth, hasSuperAdminAuth } = useAuth();
const route = useRoute();
const { bool: menuAuthVisible, setTrue: openMenuAuthModal } = useBoolean();
const { bool: aiAgentAuthVisible, setTrue: openAiAgentAuthModal } = useBoolean();

const currentRoleId = shallowRef<string>('');
const aiAgentAuthRoleId = shallowRef<string>('');
const editingRole = shallowRef<Api.SystemManage.Role | null>(null);
const fieldPolicyRoleId = shallowRef('');
const fieldPolicyVisible = shallowRef(false);
const fieldPolicyDrawer = shallowRef<InstanceType<typeof FieldPolicyDrawer> | null>(null);
onBeforeRouteLeave(() => fieldPolicyVisible.value && (!maintenance || maintenance.identity) ? (fieldPolicyDrawer.value?.confirmLeave() ?? false) : true);
if (maintenance) {
  const router = useRouter();
  watch(() => maintenance.identity, identity => {
    if (!identity) {
      fieldPolicyVisible.value = false;
      void router.replace({ name: 'login' });
    }
  }, { flush: 'sync' });
}
function finishMaintenance() {
  window.$dialog?.warning({
    title: $t('fieldPolicy.prepareFinish'),
    content: $t('fieldPolicy.prepareFinishHint'),
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      try {
        await maintenance?.finish();
      } catch {
        window.$message?.error($t('fieldPolicy.prepareUnavailable'));
        return false;
      }
    }
  });
}

const searchParams: Api.SystemManage.RoleSearchParams = reactive({
  current: 1,
  size: 10,
  roleName: null,
  roleCode: null,
  dataScope: null,
  status: null
});

const roleRepair = useRolePolicyRepair({ identity: fieldPolicyIdentity, params: searchParams, repository: fieldPolicyRepository, fetchRoles: () => fetchGetRoleList(searchParams), canRepair: () => hasSuperAdminAuth('system:role:field-policy-view') });
const repairMode = computed(() => Boolean(maintenance) || roleRepair.repairMode.value);
async function maintenanceRoles(): Promise<Api.SystemManage.RoleList | null> {
  const identity = maintenance?.identity;
  if (!identity) return null;
  try {
    const records = await loadRolePolicyAnchors(repository, undefined, true);
    if (identity !== maintenance?.identity) return null;
    const current = searchParams.current ?? 1;
    const size = searchParams.size ?? 10;
    return {
      records: records.slice((current - 1) * size, current * size),
      total: records.length,
      current,
      size,
      fieldPolicy: { read: [], query: [], create: [], update: [], canCreate: false }
    };
  } catch {
    if (identity === maintenance?.identity) window.$message?.error($t('fieldPolicy.prepareUnavailable'));
    return null;
  }
}
const { columns, columnChecks, data, loading, getData, getDataByPage, mobilePagination } = useNaivePaginatedTable({
  api: async () => maintenance ? { data: await maintenanceRoles() } : roleRepair.load(),
  transform: ({ data: page }) => {
    fieldPolicy.value = page?.fieldPolicy;
    return { data: page?.records ?? [], total: page?.total ?? 0, pageNum: page?.current ?? 1, pageSize: page?.size ?? 10 };
  },
  onPaginationParamsChange: params => {
    searchParams.current = params.page;
    searchParams.size = params.pageSize;
  },
  columns: () => [
    {
      type: 'selection',
      align: 'center',
      width: 48
    },
    {
      key: 'index',
      title: $t('common.index'),
      width: 64,
      align: 'center',
      render: (_, index) => index + 1
    },
    {
      key: 'roleName',
      render: row => localizedText(row.roleName, row.i18nKeys?.roleName),
      title: $t('page.system.role.roleName'),
      align: 'center',
      minWidth: 120
    },
    {
      key: 'roleCode',
      title: $t('page.system.role.roleCode'),
      align: 'center',
      minWidth: 120
    },
    {
      key: 'dataScope',
      title: $t('page.system.role.dataScope.label'),
      align: 'center',
      minWidth: 140,
      render: row => row.dataScope ? (
        <NTag type="info" class="whitespace-nowrap">
          {$t(roleDataScopeRecord[row.dataScope])}
        </NTag>
      ) : null
    },
    {
      key: 'status',
      title: $t('page.system.role.roleStatus'),
      align: 'center',
      width: 100,
      render: row => {
        if (!row.status) {
          return null;
        }

        const tagMap: Record<Api.Common.EnableStatus, NaiveUI.ThemeColor> = {
          1: 'success',
          2: 'warning'
        };

        const label = $t(enableStatusRecord[row.status]);

        return <NTag type={tagMap[row.status]}>{label}</NTag>;
      }
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      minWidth: 360,
      render: row => (
        <div class="flex-center flex-nowrap gap-8px whitespace-nowrap">
          {row.delegable && hasAuth('system:role:menu-auth') && (
            <NButton type="info" ghost size="small" onClick={() => onMenuAuthClick(row.roleId)}>
              {$t('page.system.role.menuAuth')}
            </NButton>
          )}
          {(maintenance ? Boolean(maintenance.identity) : hasSuperAdminAuth('system:role:field-policy-view')) && (
            <NButton type="info" ghost size="small" onClick={() => { fieldPolicyRoleId.value = row.roleId; fieldPolicyVisible.value = true; }}>
              {$t('fieldPolicy.title')}
            </NButton>
          )}
          {row.delegable && hasAuth('system:role:ai-agent-auth') && (
            <NButton
              type="primary"
              ghost
              size="small"
              data-testid={`role-ai-agent-auth-${row.roleCode}`}
              onClick={() => onAiAgentAuthClick(row.roleId)}
            >
              {$t('page.ai.aiAgentAuth.title')}
            </NButton>
          )}
          {row.delegable && hasAuth('system:role:edit') && (
            <NButton type="primary" ghost size="small" onClick={() => edit(row.roleId)}>
              {$t('common.edit')}
            </NButton>
          )}
          {!repairMode.value && hasSuperAdminAuth('system:role:delete') && (
            <NPopconfirm onPositiveClick={() => handleDelete(row.roleId)}>
              {{
                default: () => $t('common.confirmDelete'),
                trigger: () => (
                  <NButton type="error" ghost size="small">
                    {$t('common.delete')}
                  </NButton>
                )
              }}
            </NPopconfirm>
          )}
        </div>
      )
    }
  ]
});

const visibleColumns = computed<NaiveUI.TableColumn<Api.SystemManage.RoleSummary>[]>(() => repairMode.value ? [
  { key: 'roleId', title: $t('fieldPolicy.roleAnchor'), align: 'center', minWidth: 180 },
  ...columns.value.filter(column => {
    if (!('key' in column)) return false;
    const key = column.key;
    return key === 'operate' || (maintenance && (key === 'roleName' || key === 'roleCode') && data.value.some(row => Object.hasOwn(row, key)));
  })
] : columns.value.filter(column => !('key' in column) ||
  ['index', 'operate'].includes(String(column.key)) || fieldAllowed(fieldPolicy.value?.read, String(column.key))));

const {
  drawerVisible,
  openDrawer,
  operateType,
  handleAdd,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted
  // closeDrawer
} = useTableOperate(data, 'roleId', getData);

// Replay cached tool filters when arriving from an AI result card.
onMounted(async () => {
  if (maintenance) return;
  const aiQueryId = route.query.ai_query_id;
  if (typeof aiQueryId !== 'string' || !aiQueryId) return;
  const { data: cache, error } = await fetchAiQueryCache(aiQueryId);
  if (error) {
    window.$message?.error($t('common.filterReplayLoadFailed'));
    return;
  }
  if (!cache) {
    window.$message?.info($t('common.filterReplayExpired'), { duration: 8000 });
    return;
  }
  const filters = cache.filters || {};
  if (filters.status === '1' || filters.status === '2') {
    searchParams.status = filters.status;
  }
  await getData();
});

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteRole(checkedRowKeys.value);
  if (!error) {
    onBatchDeleted();
  }
}

async function handleDelete(id: string) {
  const { error } = await fetchDeleteRole(id);
  if (!error) {
    onDeleted();
  }
}

function edit(id: string) {
  operateType.value = 'edit';
  editingRole.value = { roleId: id };
  openDrawer();
}

function onMenuAuthClick(id: string) {
  currentRoleId.value = id;
  openMenuAuthModal();
}

function onAiAgentAuthClick(id: string) {
  aiAgentAuthRoleId.value = id;
  openAiAgentAuthModal();
}

async function onAgentMenuAuthClick(id: string) {
  aiAgentAuthVisible.value = false;
  currentRoleId.value = id;
  await nextTick();
  openMenuAuthModal();
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NAlert v-if="maintenance" type="warning">{{ $t('fieldPolicy.prepareHint') }}</NAlert>
    <RoleSearch
      v-else
      :model="searchParams"
      @update:model="Object.assign(searchParams, $event)"
      @search="getDataByPage"
    />
    <NCard :title="$t('page.system.role.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <NButton v-if="maintenance" @click="finishMaintenance">{{ $t('fieldPolicy.prepareFinish') }}</NButton>
        <TableHeaderOperation
          v-else
          v-model:columns="columnChecks"
          :show-add="fieldPolicy?.canCreate === true"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          add-auth="system:role:add"
          delete-auth="system:role:batch-delete"
          :show-delete="!repairMode && hasSuperAdminAuth('system:role:batch-delete')"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @refresh="getData"
        />
      </template>
      <NAlert v-if="repairMode" type="info" class="mb-12px">{{ $t('fieldPolicy.roleRepairHint') }}</NAlert>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="visibleColumns"
        :data="data"
        size="small"
        table-layout="auto"
        :flex-height="!appStore.isMobile"
        :scroll-x="1200"
        :loading="loading"
        remote
        :row-key="row => row.roleId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <RoleOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingRole"
        @submitted="getDataByPage"
      />
    </NCard>

    <MenuAuthModal v-model:visible="menuAuthVisible" :role-id="currentRoleId" />
    <FieldPolicyDrawer
      ref="fieldPolicyDrawer"
      v-model:visible="fieldPolicyVisible"
      :role-id="fieldPolicyRoleId"
      :identity="fieldPolicyIdentity"
      :repository="repository"
      :can-menu="!repairMode && hasAuth('system:role:menu-auth')"
      :can-edit-role="!repairMode && hasAuth('system:role:edit')"
      @navigate="
        target => {
          if (target === 'menu') onMenuAuthClick(fieldPolicyRoleId);
          else edit(fieldPolicyRoleId);
        }
      "
    />
    <AiAgentAuthModal
      v-model:visible="aiAgentAuthVisible"
      :role-id="aiAgentAuthRoleId"
      :can-open-menu-auth="hasAuth('system:role:menu-auth')"
      @open-menu-auth="onAgentMenuAuthClick"
    />
  </div>
</template>

<style scoped></style>
