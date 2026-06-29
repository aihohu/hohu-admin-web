<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NCard, NDescriptions, NDescriptionsItem, NSpace, NTag } from 'naive-ui';
import { $t } from '@/locales';
import { getAppData } from '@/service/api/lowcode';

const props = defineProps<{
  manifest: Record<string, any>;
  page: Record<string, any>;
  dataSchema: Record<string, any> | null;
  uiSchema: Record<string, any>;
  breakpoint: string;
}>();

const router = useRouter();
const route = useRoute();

const slug = computed(() => props.manifest.slug);
const modelKey = computed(() => props.page.model || '_');
const recordId = computed(() => {
  const id = route.query.id;
  return id ? String(id) : null;
});

const loading = ref(false);
const record = ref<Record<string, any> | null>(null);

const SYSTEM_COLUMNS = new Set(['id', 'tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by']);

/** Fields in declared order (ui:order or schema order), system fields excluded. */
const fields = computed(() => {
  if (!props.dataSchema) return [];
  const properties = props.dataSchema.properties || {};
  const order = (props.uiSchema['ui:order'] as string[]) || Object.keys(properties);
  return order
    .filter(key => !SYSTEM_COLUMNS.has(key))
    .map(key => ({
      key,
      def: properties[key] || {}
    }));
});

async function loadRecord() {
  if (!recordId.value) return;
  loading.value = true;
  try {
    const { data, error } = await getAppData(slug.value, modelKey.value, recordId.value);
    if (error) {
      window.$message?.error(error.message || $t('page.marketplace.lowcode.msgLoadFailed'));
      return;
    }
    record.value = data;
  } finally {
    loading.value = false;
  }
}

function findListPage() {
  return (props.manifest.pages || []).find((p: any) => p.page_type === 'table');
}

function onBack() {
  const listPage = findListPage();
  if (listPage) {
    router.push(`/app/${slug.value}/${listPage.key}`);
  } else {
    router.back();
  }
}

/** Render a single field's value as text/tags depending on type. */
function renderValue(field: { key: string; def: Record<string, any> }) {
  const v = record.value?.[field.key];
  if (v == null || v === '') return '-';
  if (Array.isArray(v)) {
    return h(NSpace, { size: 4 }, () => v.map((item, idx) => h(NTag, { key: idx, size: 'small' }, () => String(item))));
  }
  if (typeof v === 'object') {
    return h('pre', { class: 'm-0 text-12px whitespace-pre-wrap' }, JSON.stringify(v, null, 2));
  }
  if (typeof v === 'boolean') {
    return v ? '是' : '否';
  }
  return String(v);
}

onMounted(loadRecord);
</script>

<template>
  <NCard :loading="loading" data-testid="lowcode-detail-card">
    <template #header>
      <NSpace justify="space-between" align="center">
        <span data-testid="lowcode-detail-page-title">{{ page.title }}</span>
        <NButton data-testid="lowcode-detail-back-btn" @click="onBack">
          {{ $t('page.marketplace.lowcode.buttonCancel') }}
        </NButton>
      </NSpace>
    </template>
    <NResult
      v-if="!recordId"
      status="warning"
      :title="$t('page.marketplace.lowcode.msgLoadFailed')"
      description="missing ?id= query"
    />
    <NResult v-else-if="!loading && !record" status="404" title="记录不存在" />
    <NDescriptions v-else-if="record" bordered :column="breakpoint === 'mobile' ? 1 : 2" label-placement="left">
      <NDescriptionsItem
        v-for="field in fields"
        :key="field.key"
        :label="field.def.title || field.key"
        :data-testid="`lowcode-detail-field-${field.key}`"
      >
        <component :is="renderValue(field)" />
      </NDescriptionsItem>
    </NDescriptions>
  </NCard>
</template>
