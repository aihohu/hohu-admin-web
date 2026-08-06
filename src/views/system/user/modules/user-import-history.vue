<script setup lang="tsx">
import { computed, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NEmpty, NTag } from 'naive-ui';
import {
  fetchCancelImportBatch,
  fetchGetImportBatchDetail,
  fetchGetImportBatchList,
  fetchGetImportBatchLogs
} from '@/service/api';
import { $t } from '@/locales';

defineOptions({ name: 'UserImportHistory' });

interface Emits {
  (e: 'cancelled', batchId: string): void;
}

const emit = defineEmits<Emits>();

const visible = ref<boolean>(false);
const detailVisible = ref<boolean>(false);

const loading = ref<boolean>(false);
const batches = ref<Api.SystemManage.UserImportBatch[]>([]);
const total = ref<number>(0);
const current = ref<number>(1);
const size = ref<number>(10);
const statusFilter = ref<Api.SystemManage.UserImportBatchStatus | null>(null);

const selectedBatch = ref<Api.SystemManage.UserImportBatch | null>(null);
const logsLoading = ref<boolean>(false);
const logs = ref<Api.SystemManage.UserImportBatchLog[]>([]);
const logsTotal = ref<number>(0);
const logsCurrent = ref<number>(1);

const cancelTargetId = ref<string | null>(null);
const cancelReason = ref<string>('');
const cancelModalVisible = ref<boolean>(false);
const cancelling = ref<boolean>(false);

const statusOptions: { label: string; value: Api.SystemManage.UserImportBatchStatus }[] = [
  { label: 'CREATED', value: 'CREATED' },
  { label: 'PREVIEW_DONE', value: 'PREVIEW_DONE' },
  { label: 'RUNNING', value: 'RUNNING' },
  { label: 'SUCCESS', value: 'SUCCESS' },
  { label: 'PARTIAL_SUCCESS', value: 'PARTIAL_SUCCESS' },
  { label: 'FAILED', value: 'FAILED' },
  { label: 'EXPIRED', value: 'EXPIRED' },
  { label: 'CANCELLED', value: 'CANCELLED' }
];

function tagType(status: Api.SystemManage.UserImportBatchStatus): NaiveUI.ThemeColor {
  switch (status) {
    case 'SUCCESS':
      return 'success';
    case 'PARTIAL_SUCCESS':
      return 'warning';
    case 'FAILED':
    case 'EXPIRED':
    case 'CANCELLED':
      return 'error';
    case 'RUNNING':
    case 'PREVIEW_DONE':
      return 'info';
    default:
      return 'default';
  }
}

function isCancellable(b: Api.SystemManage.UserImportBatch): boolean {
  return b.status === 'PREVIEW_DONE' || b.status === 'RUNNING';
}

const batchColumns = computed<DataTableColumns<Api.SystemManage.UserImportBatch>>(() => [
  {
    title: () => $t('common.importHistoryDrawer.batchIdLabel'),
    key: 'batchId',
    width: 160,
    ellipsis: { tooltip: true }
  },
  {
    title: () => $t('common.importHistoryDrawer.statusLabel'),
    key: 'status',
    width: 140,
    render: row => <NTag size="small" type={tagType(row.status)}>{row.status}</NTag>
  },
  {
    title: () => $t('common.importHistoryDrawer.filenameLabel'),
    key: 'filename',
    minWidth: 160,
    ellipsis: { tooltip: true }
  },
  {
    title: () => $t('common.importHistoryDrawer.operatorLabel'),
    key: 'operatorName',
    width: 120
  },
  {
    title: () => $t('common.importHistoryDrawer.totalRowsLabel'),
    key: 'totalRows',
    width: 90,
    align: 'center'
  },
  {
    title: () => $t('common.importHistoryDrawer.summaryNewLabel'),
    key: 'summaryNew',
    width: 90,
    align: 'center'
  },
  {
    title: () => $t('common.importHistoryDrawer.successCountLabel'),
    key: 'successCount',
    width: 90,
    align: 'center'
  },
  {
    title: () => $t('common.importHistoryDrawer.failedCountLabel'),
    key: 'failedCount',
    width: 90,
    align: 'center'
  },
  {
    title: () => $t('common.importHistoryDrawer.createdAtLabel'),
    key: 'createdAt',
    width: 170
  },
  {
    title: () => $t('common.importHistoryDrawer.finishedAtLabel'),
    key: 'finishedAt',
    width: 170
  },
  {
    title: () => $t('common.operate'),
    key: 'operate',
    width: 200,
    fixed: 'right',
    render: row => (
      <div class="flex-center gap-8px">
        <NButton size="small" ghost type="primary" onClick={() => handleOpenDetail(row)}>
          {$t('common.importHistoryDrawer.openDetail')}
        </NButton>
        {isCancellable(row) && (
          <NButton size="small" ghost type="warning" onClick={() => openCancelModal(row.batchId)}>
            {$t('common.importHistoryDrawer.cancelBatch')}
          </NButton>
        )}
      </div>
    )
  }
]);

const logColumns = computed<DataTableColumns<Api.SystemManage.UserImportBatchLog>>(() => [
  { title: () => $t('common.importHistoryDrawer.logsEventLabel'), key: 'event', width: 160 },
  {
    title: () => $t('common.importHistoryDrawer.logsFromLabel'),
    key: 'fromStatus',
    width: 140,
    render: row => (row.fromStatus ? <NTag size="small">{row.fromStatus}</NTag> : '-')
  },
  {
    title: () => $t('common.importHistoryDrawer.logsToLabel'),
    key: 'toStatus',
    width: 140,
    render: row => (row.toStatus ? <NTag size="small" type="info">{row.toStatus}</NTag> : '-')
  },
  {
    title: () => $t('common.importHistoryDrawer.logsOperatorLabel'),
    key: 'operatorName',
    width: 120
  },
  {
    title: () => $t('common.importHistoryDrawer.logsTimeLabel'),
    key: 'createdAt',
    width: 170
  },
  {
    title: () => $t('common.importHistoryDrawer.logsDetailLabel'),
    key: 'detail',
    minWidth: 220,
    ellipsis: { tooltip: true },
    render: row => (row.detail ? JSON.stringify(row.detail) : '-')
  }
]);

async function loadBatches(): Promise<void> {
  loading.value = true;
  const params: Api.SystemManage.UserImportBatchQuery = {
    current: current.value,
    size: size.value,
    status: statusFilter.value
  };
  const { data, error } = await fetchGetImportBatchList(params);
  loading.value = false;
  if (error || !data) return;
  batches.value = data.records;
  total.value = data.total;
}

async function loadLogs(batchId: string): Promise<void> {
  logsLoading.value = true;
  const params: Api.SystemManage.UserImportBatchLogQuery = { current: logsCurrent.value, size: 20 };
  const { data, error } = await fetchGetImportBatchLogs(batchId, params);
  logsLoading.value = false;
  if (error || !data) return;
  logs.value = data.records;
  logsTotal.value = data.total;
}

async function handleOpenDetail(batch: Api.SystemManage.UserImportBatch): Promise<void> {
  selectedBatch.value = batch;
  logsCurrent.value = 1;
  logs.value = [];
  logsTotal.value = 0;
  detailVisible.value = true;
  const { data, error } = await fetchGetImportBatchDetail(batch.batchId);
  if (!error && data) {
    selectedBatch.value = data;
  }
  await loadLogs(batch.batchId);
}

function handlePageChange(page: number): void {
  current.value = page;
  loadBatches();
}

function handleStatusFilterChange(): void {
  current.value = 1;
  loadBatches();
}

function openCancelModal(batchId: string): void {
  cancelTargetId.value = batchId;
  cancelReason.value = '';
  cancelModalVisible.value = true;
}

async function confirmCancel(): Promise<boolean> {
  if (!cancelTargetId.value) return false;
  if (!cancelReason.value.trim()) {
    window.$message?.warning($t('common.importHistoryDrawer.cancelReasonPlaceholder'));
    return false;
  }
  cancelling.value = true;
  const { error } = await fetchCancelImportBatch(cancelTargetId.value, cancelReason.value.trim());
  cancelling.value = false;
  if (error) {
    return false;
  }
  window.$message?.success(`${$t('common.importHistoryDrawer.cancelBatch')} ✓`);
  emit('cancelled', cancelTargetId.value);
  cancelTargetId.value = null;
  cancelReason.value = '';
  await loadBatches();
  return true;
}

function handleAfterLeave(): void {
  batches.value = [];
  total.value = 0;
  current.value = 1;
  statusFilter.value = null;
}

function open(): void {
  visible.value = true;
  loadBatches();
}

defineExpose({ open });
</script>

<template>
  <NDrawer v-model:show="visible" :width="920" @after-leave="handleAfterLeave">
    <NDrawerContent :title="$t('common.importHistoryDrawer.title')" closable>
      <NSpace align="center" class="mb-12px">
        <NSelect
          v-model:value="statusFilter"
          :options="statusOptions"
          :placeholder="$t('common.importHistoryDrawer.filterStatusPlaceholder')"
          clearable
          size="small"
          style="width: 200px"
          @update:value="handleStatusFilterChange"
        />
        <NButton size="small" :loading="loading" @click="loadBatches">
          <template #icon>
            <IconMdiRefresh class="text-icon" :class="{ 'animate-spin': loading }" />
          </template>
          {{ $t('common.importHistoryDrawer.refresh') }}
        </NButton>
      </NSpace>

      <NDataTable
        :columns="batchColumns"
        :data="batches"
        :loading="loading"
        :pagination="{
          page: current,
          pageSize: size,
          itemCount: total,
          showSizePicker: false,
          onChange: handlePageChange
        }"
        size="small"
        remote
        :row-key="row => row.batchId"
        :scroll-x="1400"
      />

      <template #footer>
        <NButton @click="visible = false">{{ $t('common.close') }}</NButton>
      </template>
    </NDrawerContent>
  </NDrawer>

  <NDrawer v-model:show="detailVisible" :width="720">
    <NDrawerContent :title="$t('common.importHistoryDrawer.detailDrawerTitle')" closable>
      <NTabs v-if="selectedBatch" type="line" animated>
        <NTabPane name="summary" :tab="$t('common.importHistoryDrawer.summaryTabTitle')">
          <NDescriptions label-placement="left" :column="2" bordered size="small">
            <NDescriptionsItem :label="$t('common.importHistoryDrawer.batchIdLabel')">
              {{ selectedBatch.batchId }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('common.importHistoryDrawer.statusLabel')">
              <NTag size="small" :type="tagType(selectedBatch.status)">{{ selectedBatch.status }}</NTag>
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('common.importHistoryDrawer.filenameLabel')">
              {{ selectedBatch.filename ?? '-' }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('common.importHistoryDrawer.operatorLabel')">
              {{ selectedBatch.operatorName ?? '-' }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('common.importHistoryDrawer.totalRowsLabel')">
              {{ selectedBatch.totalRows }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('common.importHistoryDrawer.expiresAtLabel')">
              {{ selectedBatch.expiresAt ?? '-' }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('common.importHistoryDrawer.summaryNewLabel')">
              {{ selectedBatch.summaryNew }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('common.importHistoryDrawer.summaryExistsLabel')">
              {{ selectedBatch.summaryExists }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('common.importHistoryDrawer.summaryConflictLabel')">
              {{ selectedBatch.summaryConflict }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('common.importHistoryDrawer.summaryOutOfScopeLabel')">
              {{ selectedBatch.summaryOutOfScope }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('common.importHistoryDrawer.successCountLabel')">
              {{ selectedBatch.successCount }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('common.importHistoryDrawer.skippedCountLabel')">
              {{ selectedBatch.skippedCount }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('common.importHistoryDrawer.overwrittenCountLabel')">
              {{ selectedBatch.overwrittenCount }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('common.importHistoryDrawer.failedCountLabel')">
              {{ selectedBatch.failedCount }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('common.importHistoryDrawer.createdAtLabel')">
              {{ selectedBatch.createdAt }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('common.importHistoryDrawer.finishedAtLabel')">
              {{ selectedBatch.finishedAt ?? '-' }}
            </NDescriptionsItem>
          </NDescriptions>
        </NTabPane>
        <NTabPane name="logs" :tab="$t('common.importHistoryDrawer.logsTabTitle')">
          <NDataTable
            :columns="logColumns"
            :data="logs"
            :loading="logsLoading"
            size="small"
            :row-key="row => row.logId"
            :pagination="{
              page: logsCurrent,
              pageSize: 20,
              itemCount: logsTotal,
              showSizePicker: false,
              onChange: (p: number) => {
                logsCurrent = p;
                if (selectedBatch) loadLogs(selectedBatch.batchId);
              }
            }"
            :scroll-x="950"
          />
        </NTabPane>
      </NTabs>
      <NEmpty v-else :description="$t('common.importHistoryDrawer.noBatches')" />

      <template #footer>
        <NSpace>
          <NButton
            v-if="selectedBatch && isCancellable(selectedBatch)"
            type="warning"
            ghost
            @click="openCancelModal(selectedBatch.batchId)"
          >
            {{ $t('common.importHistoryDrawer.cancelBatch') }}
          </NButton>
          <NButton @click="detailVisible = false">{{ $t('common.close') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>

  <NModal
    v-model:show="cancelModalVisible"
    preset="dialog"
    :title="$t('common.importHistoryDrawer.cancelBatch')"
    :positive-text="$t('common.confirm')"
    :negative-text="$t('common.cancel')"
    :loading="cancelling"
    @positive-click="confirmCancel"
  >
    <NForm label-placement="top">
      <NFormItem :label="$t('common.importHistoryDrawer.cancelReasonLabel')">
        <NInput
          v-model:value="cancelReason"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 4 }"
          :placeholder="$t('common.importHistoryDrawer.cancelReasonPlaceholder')"
          :maxlength="256"
          show-count
        />
      </NFormItem>
    </NForm>
  </NModal>
</template>

<style scoped></style>
