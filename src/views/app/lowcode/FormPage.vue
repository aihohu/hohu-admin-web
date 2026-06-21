<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NCard, NForm, NFormItem, NGrid, NGridItem, NSpace } from 'naive-ui';
import { createAppData, getAppData, updateAppData } from '@/service/api/lowcode';
import { resolveSpan } from './composables/useResponsive';
import { inferWidget, WIDGET_REGISTRY } from './widgets';

const props = defineProps<{
  manifest: Record<string, any>;
  page: Record<string, any>;
  dataSchema: Record<string, any> | null;
  uiSchema: Record<string, any>;
  breakpoint: string;
}>();

const router = useRouter();
const route = useRoute();

const editId = computed(() => {
  const id = route.query.id;
  return id ? String(id) : null;
});
const isEdit = computed(() => editId.value !== null);

const slug = computed(() => props.manifest.slug);
const modelKey = computed(() => props.page.model || '_');

const formData = reactive<Record<string, any>>({});
const submitting = ref(false);

const SYSTEM_COLUMNS = new Set(['id', 'tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by']);

const fields = computed(() => {
  if (!props.dataSchema) return [];
  const properties = props.dataSchema.properties || {};
  const order = (props.uiSchema['ui:order'] as string[]) || Object.keys(properties);
  return order
    .filter(key => !SYSTEM_COLUMNS.has(key))
    .map(key => ({
      key,
      def: properties[key] || {},
      ui: props.uiSchema[key] || {}
    }));
});

function initDefaults() {
  if (!props.dataSchema) return;
  const properties = props.dataSchema.properties || {};
  for (const [key, def] of Object.entries(properties)) {
    const fieldDef = def as Record<string, any>;
    if (SYSTEM_COLUMNS.has(key)) continue;
    if (fieldDef.default !== undefined) {
      formData[key] = fieldDef.default;
    }
  }
}

async function loadRecord() {
  if (!isEdit.value) return;
  const { data, error } = await getAppData(slug.value, modelKey.value, editId.value as string);
  if (error) {
    window.$message?.error(error.message || '加载失败');
    return;
  }
  if (data) {
    Object.assign(formData, data);
  }
}

function resolveWidget(field: { ui: Record<string, any>; def: Record<string, any> }): string {
  return field.ui.widget || inferWidget(field.def);
}

function findListPage() {
  return (props.manifest.pages || []).find((p: any) => p.page_type === 'table');
}

async function onSubmit() {
  submitting.value = true;
  try {
    const res = isEdit.value
      ? await updateAppData(slug.value, modelKey.value, editId.value as string, formData)
      : await createAppData(slug.value, modelKey.value, formData);
    if (res.error) {
      window.$message?.error(res.error.message || '提交失败');
      return;
    }
    window.$message?.success(isEdit.value ? '更新成功' : '创建成功');
    const listPage = findListPage();
    if (listPage) {
      router.push(`/app/${slug.value}/${listPage.key}`);
    } else {
      router.back();
    }
  } finally {
    submitting.value = false;
  }
}

function onCancel() {
  router.back();
}

onMounted(async () => {
  initDefaults();
  await loadRecord();
});
</script>

<template>
  <NCard :title="isEdit ? `编辑${page.title}` : `新建${page.title}`">
    <NForm :model="formData" label-placement="top">
      <NGrid :cols="breakpoint === 'mobile' ? 1 : 24" :x-gap="12" :y-gap="12" responsive="screen">
        <NGridItem v-for="field in fields" :key="field.key" :span="resolveSpan(field.ui, breakpoint as any)">
          <NFormItem :label="field.def.title || field.key" :path="field.key">
            <component
              :is="WIDGET_REGISTRY[resolveWidget(field)]"
              :value="formData[field.key]"
              :field-def="field.def"
              :ui-schema="field.ui"
              @update:value="(v: any) => (formData[field.key] = v)"
            />
          </NFormItem>
        </NGridItem>
      </NGrid>
    </NForm>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="onCancel">取消</NButton>
        <NButton type="primary" :loading="submitting" @click="onSubmit">保存</NButton>
      </NSpace>
    </template>
  </NCard>
</template>
