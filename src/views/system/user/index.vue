<script setup lang="tsx">
import { reactive, ref } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { enableStatusRecord, userGenderRecord } from '@/constants/business';
import { REG_PWD } from '@/constants/reg';
import {
  fetchBatchDeleteUser,
  fetchDeleteUser,
  fetchGetUserList,
  fetchResetUserPassword
} from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { useAuth } from '@/hooks/business/auth';
import { $t } from '@/locales';
import UserOperateDrawer from './modules/user-operate-drawer.vue';
import UserSearch from './modules/user-search.vue';

const appStore = useAppStore();
const { hasAuth } = useAuth();

const searchParams: Api.SystemManage.UserSearchParams = reactive({
  current: 1,
  size: 10,
  status: null,
  userName: null,
  userGender: null,
  nickname: null,
  userPhone: null,
  userEmail: null
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination } = useNaivePaginatedTable({
  api: () => fetchGetUserList(searchParams),
  transform: response => defaultTransform(response),
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
      align: 'center',
      width: 64,
      render: (_, index) => index + 1
    },
    {
      key: 'userName',
      title: $t('page.system.user.userName'),
      align: 'center',
      minWidth: 100
    },
    {
      key: 'userGender',
      title: $t('page.system.user.userGender'),
      align: 'center',
      width: 100,
      render: row => {
        if (row.userGender === null) {
          return null;
        }

        const tagMap: Record<Api.SystemManage.UserGender, NaiveUI.ThemeColor> = {
          0: 'default',
          1: 'primary',
          2: 'error'
        };

        const label = $t(userGenderRecord[row.userGender]);

        return <NTag type={tagMap[row.userGender]}>{label}</NTag>;
      }
    },
    {
      key: 'nickname',
      title: $t('page.system.user.nickname'),
      align: 'center',
      minWidth: 100
    },
    {
      key: 'userPhone',
      title: $t('page.system.user.userPhone'),
      align: 'center',
      width: 120
    },
    {
      key: 'userEmail',
      title: $t('page.system.user.userEmail'),
      align: 'center',
      minWidth: 200
    },
    {
      key: 'status',
      title: $t('page.system.user.userStatus'),
      align: 'center',
      width: 100,
      render: row => {
        if (row.status === null) {
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
      width: 200,
      render: row => (
        <div class="flex-center gap-8px">
          <NButton type="primary" ghost size="small" onClick={() => edit(row.userId)}>
            {$t('common.edit')}
          </NButton>

          {hasAuth('system:user:reset-password') && (
            <NButton type="warning" ghost size="small" onClick={() => handleResetPassword(row.userId)}>
              {$t('page.system.user.resetPwd.title')}
            </NButton>
          )}

          {hasAuth('system:user:delete') && (
            <NPopconfirm onPositiveClick={() => handleDelete(row.userId)}>
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

const {
  drawerVisible,
  operateType,
  editingData,
  handleAdd,
  handleEdit,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted
  // closeDrawer
} = useTableOperate(data, 'userId', getData);

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteUser(checkedRowKeys.value);
  if (!error) {
    onBatchDeleted();
  }
}

async function handleDelete(id: string) {
  const { error } = await fetchDeleteUser(id);
  if (!error) {
    onDeleted();
  }
}

function edit(id: string) {
  handleEdit(id);
}

const resetPwdVisible = ref(false);
const resetPwdUserId = ref('');
const resetPwdValue = ref('');
const resetPwdLoading = ref(false);

function handleResetPassword(userId: string) {
  resetPwdUserId.value = userId;
  resetPwdValue.value = '';
  resetPwdVisible.value = true;
}

async function confirmResetPassword() {
  if (!resetPwdValue.value || !REG_PWD.test(resetPwdValue.value)) {
    window.$message?.warning($t('form.pwd.invalid'));
    return false;
  }
  resetPwdLoading.value = true;
  const { error } = await fetchResetUserPassword(resetPwdUserId.value, {
    newPassword: resetPwdValue.value
  });
  resetPwdLoading.value = false;
  if (!error) {
    window.$message?.success($t('common.updateSuccess'));
  }
  return !error;
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <UserSearch v-model:model="searchParams" @search="getDataByPage" />
    <NCard :title="$t('page.system.user.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @refresh="getData"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="1032"
        :loading="loading"
        remote
        :row-key="row => row.userId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <UserOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
    <NModal
      v-model:show="resetPwdVisible"
      :title="$t('page.system.user.resetPwd.title')"
      preset="dialog"
      :positive-text="$t('common.confirm')"
      :negative-text="$t('common.cancel')"
      :loading="resetPwdLoading"
      @positive-click="confirmResetPassword"
    >
      <NInput
        v-model:value="resetPwdValue"
        type="password"
        show-password-on="click"
        :placeholder="$t('page.system.user.form.password')"
      />
    </NModal>
  </div>
</template>

<style scoped></style>
