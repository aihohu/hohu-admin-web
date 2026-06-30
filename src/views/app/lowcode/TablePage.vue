<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NCard, NDataTable, NPopconfirm, NSpace } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { $t } from '@/locales';
import { deleteAppData, fetchAppData } from '@/service/api/lowcode';
import LowcodeTableSearch from './modules/table-search.vue';
import { buildFilters, useTableFilters } from './composables/useTableFilters';

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

const {
  fields: filterFields,
  state: filterState,
  reset: resetFilters
} = useTableFilters(props.dataSchema, props.uiSchema);

/** Currently-applied filters (only updated on search/reset click, not every keystroke). */
const activeFilters = ref<Record<string, string>>({});
/** NaiveUI sorter state. columnKey=null & order=false = no sort. */
const sorter = ref<{ columnKey: string | null; order: 'ascend' | 'descend' | false }>({
  columnKey: null,
  order: false
});

const loading = ref(false);
const records = ref<any[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);

async function loadData() {
  loading.value = true;
  try {
    const order_by =
      sorter.value.columnKey && sorter.value.order
        ? `${sorter.value.order === 'descend' ? '-' : ''}${sorter.value.columnKey}`
        : undefined;
    const { data, error } = await fetchAppData(slug.value, modelKey.value, {
      current: currentPage.value,
      size: pageSize.value,
      order_by,
      filters: activeFilters.value
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

/** Detect FK fields that point at another model (x-ref OR declared in relations[]).
 *  Backend auto-joins these and emits <fk>_label; the column should read that field. */
const belongsToFields = computed<Set<string>>(() => {
  const out = new Set<string>();
  if (!props.dataSchema) return out;
  // Field-level x-ref
  for (const [key, def] of Object.entries(props.dataSchema.properties || {})) {
    if ((def as Record<string, any>)['x-ref']) out.add(key);
  }
  // Explicit relations (rare for single-table mode but spec allows)
  for (const rel of props.dataSchema.relations || []) {
    if (rel?.type === 'belongs_to' && rel.foreign_key) out.add(rel.foreign_key);
  }
  return out;
});

const columns = computed<DataTableColumns>(() => {
  if (!props.dataSchema) return [];
  const properties = props.dataSchema.properties || {};
  const cols: DataTableColumns = [];

  for (const [key, def] of Object.entries(properties)) {
    if (SYSTEM_COLUMNS.has(key)) continue;
    const fieldDef = def as Record<string, any>;
    const isBelongsTo = belongsToFields.value.has(key);
    // Backend emits <fk>_label on list (decision #79) and supports JOIN-based
    // sort on the label column (LEFT JOIN target table, ORDER BY target.label).
    // So sorter is enabled for ALL non-system columns, including belongs_to.
    cols.push({
      title: fieldDef.title || key,
      key: isBelongsTo ? `${key}_label` : key,
      ellipsis: { tooltip: true },
      sorter: true
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
  // Match same model so multi-model apps route to the right form
  // (e.g., order_list 新增 → order_form, not customer_form).
  const currentModel = props.page.model;
  return (props.manifest.pages || []).find(
    (p: any) => p.page_type === 'form' && (!currentModel || p.model === currentModel)
  );
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

function onPageSizeChange(size: number) {
  pageSize.value = size;
  currentPage.value = 1;
  loadData();
}

function onSorterUpdate(options: { columnKey: string | null; order: 'ascend' | 'descend' | false }) {
  sorter.value = options;
  currentPage.value = 1;
  loadData();
}

function onSearch() {
  activeFilters.value = buildFilters(filterState, filterFields.value);
  currentPage.value = 1;
  loadData();
}

function onResetFilters() {
  resetFilters();
  activeFilters.value = {};
  currentPage.value = 1;
  loadData();
}

onMounted(loadData);
</script>

<template>
  <LowcodeTableSearch
    v-if="filterFields.length"
    v-model:model="filterState"
    :fields="filterFields"
    @search="onSearch"
    @reset="onResetFilters"
  />
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
        showSizePicker: true,
        pageSizes: [10, 20, 30, 50, 100],
        prefix: ({ itemCount }: { itemCount?: number }) =>
          $t('page.marketplace.lowcode.itemCount', { total: itemCount ?? 0 })
      }"
      @update:page="onPageChange"
      @update:page-size="onPageSizeChange"
      @update:sorter="onSorterUpdate"
    />
  </NCard>
</template>
