<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NCard, NDataTable, NPopconfirm, NSpace } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
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
      window.$message?.error(error.message || '加载失败');
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
    title: '操作',
    key: '__actions',
    width: 180,
    fixed: 'right',
    render: (row: any) =>
      h(NSpace, { size: 'small' }, () => [
        h(NButton, { size: 'small', onClick: () => onEdit(row) }, () => '编辑'),
        h(
          NPopconfirm,
          { onPositiveClick: () => onDelete(row.id) },
          {
            trigger: () => h(NButton, { size: 'small', type: 'error' }, () => '删除'),
            default: () => '确认删除？'
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
    window.$message?.error(error.message || '删除失败');
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
  <NCard>
    <template #header>
      <NSpace justify="space-between" align="center">
        <span>{{ page.title }}</span>
        <NButton type="primary" @click="onCreate">新增</NButton>
      </NSpace>
    </template>
    <NDataTable
      remote
      :columns="columns"
      :data="records"
      :loading="loading"
      :pagination="{
        page: currentPage,
        pageSize: pageSize,
        itemCount: total,
        showSizePicker: false,
        prefix: ({ itemCount }: { itemCount?: number }) => `共 ${itemCount ?? 0} 条`
      }"
      @update:page="onPageChange"
    />
  </NCard>
</template>
