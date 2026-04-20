<script setup lang="tsx">
import { reactive, ref } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { fetchBatchDeleteFile, fetchDeleteFile, fetchGetFileList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import FileUploadModal from './modules/file-upload-modal.vue';

const { t } = useI18n();
const appStore = useAppStore();
const uploadModalRef = ref<InstanceType<typeof FileUploadModal>>();

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

const searchParams: Api.SystemManage.FileSearchParams = reactive({
  current: 1,
  size: 10,
  originalName: null,
  businessType: null,
  fileExt: null
});

const { columns, columnChecks, data, loading, getData, mobilePagination } = useNaivePaginatedTable({
  api: () => fetchGetFileList(searchParams),
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
      title: t('common.index'),
      width: 64,
      align: 'center',
      render: (_, index) => index + 1
    },
    {
      key: 'originalName',
      title: t('page.system.file.fileName'),
      minWidth: 200,
      ellipsis: { tooltip: true }
    },
    {
      key: 'fileExt',
      title: t('page.system.file.fileType'),
      width: 100,
      align: 'center',
      render: row => <NTag size="small">{row.fileExt}</NTag>
    },
    {
      key: 'fileSize',
      title: t('page.system.file.fileSize'),
      width: 100,
      align: 'center',
      render: row => formatFileSize(row.fileSize)
    },
    {
      key: 'createBy',
      title: t('page.system.file.uploader'),
      width: 100,
      align: 'center'
    },
    {
      key: 'createTime',
      title: t('page.system.file.uploadTime'),
      width: 180,
      align: 'center'
    },
    {
      key: 'operate',
      title: t('common.operate'),
      align: 'center',
      width: 180,
      render: row => (
        <div class="flex-center gap-8px">
          <NButton type="info" ghost size="small" onClick={() => handleCopyUrl(row.fileUrl)}>
            {t('page.system.file.copyLink')}
          </NButton>
          <NPopconfirm onPositiveClick={() => handleDelete(row.fileId)}>
            {{
              default: () => t('page.system.file.confirmDelete'),
              trigger: () => (
                <NButton type="error" ghost size="small">
                  {t('common.delete')}
                </NButton>
              )
            }}
          </NPopconfirm>
        </div>
      )
    }
  ]
});

const { checkedRowKeys, onBatchDeleted, onDeleted } = useTableOperate(data, 'fileId', getData);

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteFile(checkedRowKeys.value);
  if (!error) {
    onBatchDeleted();
  }
}

async function handleDelete(id: string) {
  const { error } = await fetchDeleteFile(id);
  if (!error) {
    onDeleted();
  }
}

function handleCopyUrl(url: string) {
  navigator.clipboard.writeText(url).then(() => {
    window.$message?.success(t('page.system.file.linkCopied'));
  });
}

function handleSearch() {
  searchParams.current = 1;
  getData();
}

function handleReset() {
  searchParams.originalName = null;
  searchParams.businessType = null;
  searchParams.fileExt = null;
  searchParams.current = 1;
  getData();
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <!-- 搜索栏 -->
    <NCard :bordered="false" size="small">
      <NForm inline label-placement="left" :show-feedback="false">
        <NFormItem :label="$t('page.system.file.fileName')">
          <NInput
            v-model:value="searchParams.originalName"
            :placeholder="$t('page.system.file.fileNamePlaceholder')"
            clearable
            class="w-200px"
          />
        </NFormItem>
        <NFormItem :label="$t('page.system.file.fileType')">
          <NInput
            v-model:value="searchParams.fileExt"
            :placeholder="$t('page.system.file.fileTypePlaceholder')"
            clearable
            class="w-120px"
          />
        </NFormItem>
        <NFormItem>
          <NButton type="primary" @click="handleSearch">
            <template #icon>
              <icon-ic-round-search class="align-sub text-icon" />
            </template>
            {{ $t('common.search') }}
          </NButton>
          <NButton class="ml-12px" @click="handleReset">
            {{ $t('common.reset') }}
          </NButton>
        </NFormItem>
      </NForm>
    </NCard>

    <!-- 表格 -->
    <NCard
      :title="$t('page.system.file.fileList')"
      :bordered="false"
      size="small"
      class="card-wrapper sm:flex-1-hidden"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          @delete="handleBatchDelete"
          @refresh="getData"
        >
          <template #prefix>
            <NButton type="primary" size="small" @click="uploadModalRef?.open()">
              <template #icon>
                <icon-ic-round-cloud-upload class="align-sub text-icon" />
              </template>
              {{ $t('page.system.file.uploadFile') }}
            </NButton>
          </template>
          <template #default>
            <NPopconfirm @positive-click="handleBatchDelete">
              <template #trigger>
                <NButton size="small" ghost type="error" :disabled="checkedRowKeys.length === 0">
                  <template #icon>
                    <icon-ic-round-delete class="text-icon" />
                  </template>
                  {{ $t('common.batchDelete') }}
                </NButton>
              </template>
              {{ $t('common.confirmDelete') }}
            </NPopconfirm>
          </template>
        </TableHeaderOperation>
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="960"
        :loading="loading"
        remote
        :row-key="row => row.fileId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
    </NCard>

    <FileUploadModal ref="uploadModalRef" @success="getData" />
  </div>
</template>

<style scoped></style>
