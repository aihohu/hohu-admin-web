<script setup lang="ts">
import type { FormInst, FormRules } from 'naive-ui';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NCard, NForm, NFormItem, NGrid, NGridItem, NSpace } from 'naive-ui';
import { $t } from '@/locales';
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
const formRef = ref<FormInst | null>(null);

const SYSTEM_COLUMNS = new Set(['id', 'tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by']);

const requiredKeys = computed<Set<string>>(() => {
  const arr = (props.dataSchema?.required as string[] | undefined) || [];
  return new Set(arr);
});

const fields = computed(() => {
  if (!props.dataSchema) return [];
  const properties = props.dataSchema.properties || {};
  const order = (props.uiSchema['ui:order'] as string[]) || Object.keys(properties);
  return order
    .filter(key => !SYSTEM_COLUMNS.has(key))
    .map(key => ({
      key,
      def: properties[key] || {},
      ui: props.uiSchema[key] || {},
      required: requiredKeys.value.has(key)
    }));
});

/** Build NaiveUI FormRules from data_schema.required. */
const formRules = computed<FormRules>(() => {
  const rules: FormRules = {};
  for (const key of requiredKeys.value) {
    rules[key] = [
      {
        required: true,
        trigger: ['blur', 'change'],
        message: $t('page.marketplace.lowcode.msgFieldRequired')
      }
    ];
  }
  return rules;
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
    window.$message?.error(error.message || $t('page.marketplace.lowcode.msgLoadFailed'));
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
  // Validate required fields before submit; NaiveUI runs the async validator
  // and returns errors via callback. On failure we abort and surface message.
  try {
    await formRef.value?.validate();
  } catch {
    window.$message?.warning($t('page.marketplace.lowcode.msgValidationFailed'));
    return;
  }
  submitting.value = true;
  try {
    const res = isEdit.value
      ? await updateAppData(slug.value, modelKey.value, editId.value as string, formData)
      : await createAppData(slug.value, modelKey.value, formData);
    if (res.error) {
      window.$message?.error(res.error.message || $t('page.marketplace.lowcode.msgSubmitFailed'));
      return;
    }
    window.$message?.success(
      isEdit.value ? $t('page.marketplace.lowcode.msgUpdateSuccess') : $t('page.marketplace.lowcode.msgCreateSuccess')
    );
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
  <NCard
    :data-testid="isEdit ? 'lowcode-form-card-edit' : 'lowcode-form-card-create'"
    :title="
      isEdit
        ? $t('page.marketplace.lowcode.titleEdit', { title: page.title })
        : $t('page.marketplace.lowcode.titleCreate', { title: page.title })
    "
  >
    <NForm ref="formRef" :model="formData" :rules="formRules" label-placement="top" data-testid="lowcode-form">
      <NGrid :cols="breakpoint === 'mobile' ? 1 : 24" :x-gap="12" :y-gap="12" responsive="screen">
        <NGridItem v-for="field in fields" :key="field.key" :span="resolveSpan(field.ui, breakpoint as any)">
          <NFormItem
            :label="field.def.title || field.key"
            :path="field.key"
            :required="field.required"
            :data-testid="`lowcode-form-field-${field.key}`"
          >
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
        <NButton data-testid="lowcode-form-cancel-btn" @click="onCancel">
          {{ $t('page.marketplace.lowcode.buttonCancel') }}
        </NButton>
        <NButton type="primary" :loading="submitting" data-testid="lowcode-form-save-btn" @click="onSubmit">
          {{ $t('page.marketplace.lowcode.buttonSave') }}
        </NButton>
      </NSpace>
    </template>
  </NCard>
</template>
