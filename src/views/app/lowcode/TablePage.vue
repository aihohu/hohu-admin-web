<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NCard, NDataTable, NPopconfirm, NSpace } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { $t } from '@/locales';
import { deleteAppData, fetchAppData } from '@/service/api/lowcode';

const props = defineProps<{
  manifest: Record<string, any>;
  page: Record<string, any>;
  dataSchema: Record<string, any> | null;
  uiSchema: Record<string, any>;
  breakpoint: string;
}>();

const router = useRouter();

const slug = computed(() => props.manifest.slug);
const modelKey = computed(() => props.page.model || '_');

const loading = ref(false);
const records = ref<any[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

async function loadData() {
  loading.value = true;
  try {
    const { data, error } = await fetchAppData(slug.value, modelKey.value, {
      current: currentPage.value,
      size: pageSize.value
    });
    if (error) {
      window.$message?.error(error.message || $t('page.marketplace.lowcode.msgLoadFailed'));
      records.value = [];
      total.value = 0;
      return;
    }
    records.value = data?.records || [];
    total.value = data?.total || 0;
  } finally {
    loading.value = false;
  }
}

const SYSTEM_COLUMNS = new Set(['id', 'tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by']);

const columns = computed<DataTableColumns>(() => {
  if (!props.dataSchema) return [];
  const properties = props.dataSchema.properties || {};
  const cols: DataTableColumns = [];

  for (const [key, def] of Object.entries(properties)) {
    if (SYSTEM_COLUMNS.has(key)) continue;
    const fieldDef = def as Record<string, any>;
    cols.push({
      title: fieldDef.title || key,
      key,
      ellipsis: { tooltip: true }
    });
  }

  cols.push({
    title: $t('page.marketplace.lowcode.colActions'),
    key: '__actions',
    width: 180,
    fixed: 'right',
    render: (row: any) =>
      h(NSpace, { size: 'small' }, () => [
        h(
          NButton,
          {
            size: 'small',
            onClick: () => onEdit(row),
            'data-testid': `lowcode-table-edit-btn-${row.id}`
          },
          () => $t('page.marketplace.lowcode.buttonEdit')
        ),
        h(
          NPopconfirm,
          { onPositiveClick: () => onDelete(row.id) },
          {
            trigger: () =>
              h(
                NButton,
                {
                  size: 'small',
                  type: 'error',
                  'data-testid': `lowcode-table-delete-btn-${row.id}`
                },
                () => $t('page.marketplace.lowcode.buttonDelete')
              ),
            default: () => $t('page.marketplace.lowcode.confirmDelete')
          }
        )
      ])
  });

  return cols;
});

function findFormPage() {
  return (props.manifest.pages || []).find((p: any) => p.page_type === 'form');
}

function onEdit(row: any) {
  const formPage = findFormPage();
  if (formPage) {
    router.push(`/app/${slug.value}/${formPage.key}?id=${row.id}`);
  }
}

function onCreate() {
  const formPage = findFormPage();
  if (formPage) {
    router.push(`/app/${slug.value}/${formPage.key}`);
  }
}

async function onDelete(id: number | string) {
  const { error } = await deleteAppData(slug.value, modelKey.value, id);
  if (error) {
    window.$message?.error(error.message || $t('page.marketplace.lowcode.msgDeleteFailed'));
    return;
  }
  await loadData();
}

function onPageChange(page: number) {
  currentPage.value = page;
  loadData();
}

onMounted(loadData);
</script>

<template>
  <NCard data-testid="lowcode-table-card">
    <template #header>
      <NSpace justify="space-between" align="center">
        <span data-testid="lowcode-table-page-title">{{ page.title }}</span>
        <NButton type="primary" data-testid="lowcode-table-create-btn" @click="onCreate">
          {{ $t('page.marketplace.lowcode.buttonCreate') }}
        </NButton>
      </NSpace>
    </template>
    <NDataTable
      remote
      data-testid="lowcode-table-datatable"
      :columns="columns"
      :data="records"
      :loading="loading"
      :pagination="{
        page: currentPage,
        pageSize: pageSize,
        itemCount: total,
        showSizePicker: false,
        prefix: ({ itemCount }: { itemCount?: number }) =>
          $t('page.marketplace.lowcode.itemCount', { total: itemCount ?? 0 })
      }"
      @update:page="onPageChange"
    />
  </NCard>
</template>
