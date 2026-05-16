<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { jsonClone } from '@sa/utils';
import { fetchSaveProvider, fetchTestModel, fetchUpdateProvider } from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';

const { t } = useI18n();

defineOptions({
  name: 'ProviderOperateDrawer'
});

interface Props {
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.Ai.Provider | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: t('page.ai.provider.addProvider'),
    edit: t('page.ai.provider.editProvider')
  };
  return titles[props.operateType];
});

type Model = Api.Ai.ProviderCreateParams;

const model = ref<Model>(createDefaultModel());

const loading = ref(false);

const modelsList = ref<string[]>([]);
const testingIndex = ref<number | null>(null);

function createDefaultModel(): Model {
  return {
    providerCode: '',
    name: '',
    apiKey: '',
    baseUrl: '',
    isEnabled: true,
    config: {}
  };
}

function addModelEntry() {
  modelsList.value.push('');
}

function removeModelEntry(index: number) {
  modelsList.value.splice(index, 1);
}

function syncModelsToConfig() {
  const valid = modelsList.value.filter(m => m.trim());
  model.value = {
    ...model.value,
    config: { ...model.value.config, models: valid }
  };
}

type RuleKey = Extract<keyof Model, 'providerCode' | 'name' | 'apiKey'>;

const rules = computed<Record<RuleKey, App.Global.FormRule>>(() => ({
  providerCode: defaultRequiredRule,
  name: defaultRequiredRule,
  apiKey: props.operateType === 'add' ? defaultRequiredRule : {}
}));

function handleInitModel() {
  model.value = createDefaultModel();
  modelsList.value = [];

  if (props.operateType === 'edit' && props.rowData) {
    const cloned = jsonClone(props.rowData);
    Object.assign(model.value, {
      providerCode: cloned.providerCode,
      name: cloned.name,
      apiKey: '',
      baseUrl: cloned.baseUrl || '',
      isEnabled: cloned.isEnabled,
      config: cloned.config
    });

    // Load models from config
    const config = cloned.config || {};
    if (config.models && Array.isArray(config.models)) {
      modelsList.value = jsonClone(config.models);
    }
  }

  if (modelsList.value.length === 0) {
    modelsList.value.push('');
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  loading.value = true;
  try {
    syncModelsToConfig();

    let res;
    if (props.operateType === 'edit' && props.rowData) {
      res = await fetchUpdateProvider(props.rowData.providerId, model.value);
    } else {
      res = await fetchSaveProvider(model.value);
    }
    const { error } = res;
    if (!error) {
      window.$message?.success(props.operateType === 'edit' ? t('common.updateSuccess') : t('common.addSuccess'));
      closeDrawer();
      emit('submitted');
    }
  } finally {
    loading.value = false;
  }
}

async function handleTestModel(idx: number) {
  const modelName = modelsList.value[idx]?.trim();
  if (!modelName) {
    window.$message?.warning(t('page.ai.provider.testNoModel'));
    return;
  }
  if (!model.value.providerCode) {
    window.$message?.warning(t('page.ai.provider.testNoCode'));
    return;
  }

  testingIndex.value = idx;
  const { error } = await fetchTestModel({
    providerId: props.operateType === 'edit' && props.rowData ? props.rowData.providerId : undefined,
    providerCode: model.value.providerCode,
    model: modelName,
    apiKey: model.value.apiKey || undefined,
    baseUrl: model.value.baseUrl || undefined
  });
  testingIndex.value = null;
  if (!error) {
    window.$message?.success(t('page.ai.provider.modelTestSuccess', { name: modelName }));
  }
}

watch(visible, () => {
  if (visible.value) {
    handleInitModel();
    restoreValidation();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="400">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem :label="t('page.ai.provider.code')" path="providerCode">
          <NInput v-model:value="model.providerCode" :placeholder="t('page.ai.provider.form.code')" />
        </NFormItem>
        <NFormItem :label="t('page.ai.provider.name')" path="name">
          <NInput v-model:value="model.name" :placeholder="t('page.ai.provider.form.name')" />
        </NFormItem>
        <NFormItem :label="t('page.ai.provider.apiKey')" path="apiKey">
          <NInput
            v-model:value="model.apiKey"
            type="password"
            show-password-on="click"
            :placeholder="
              operateType === 'edit' ? t('page.ai.provider.form.apiKeyEdit') : t('page.ai.provider.form.apiKey')
            "
          />
        </NFormItem>
        <NFormItem :label="t('page.ai.provider.baseUrl')" path="baseUrl">
          <NInput v-model:value="model.baseUrl" :placeholder="t('page.ai.provider.form.baseUrl')" />
        </NFormItem>
        <NFormItem :label="t('page.ai.provider.models')">
          <div class="models-config">
            <div v-for="(m, idx) in modelsList" :key="idx" class="model-entry">
              <NInput v-model:value="modelsList[idx]" :placeholder="t('page.ai.provider.form.model')" size="small" />
              <NTooltip>
                <template #trigger>
                  <NButton
                    quaternary
                    circle
                    size="tiny"
                    :loading="testingIndex === idx"
                    :disabled="!modelsList[idx]?.trim()"
                    @click="handleTestModel(idx)"
                  >
                    <template #icon>
                      <icon-ic-round-play-arrow class="text-14px" />
                    </template>
                  </NButton>
                </template>
                {{ t('page.ai.provider.testConnectivity') }}
              </NTooltip>
              <NButton quaternary circle size="tiny" @click="removeModelEntry(idx)">
                <template #icon>
                  <icon-ic-round-close class="text-14px" />
                </template>
              </NButton>
            </div>
            <NButton dashed size="small" block @click="addModelEntry">
              <template #icon>
                <icon-ic-round-add class="text-14px" />
              </template>
              {{ t('page.ai.provider.addModel') }}
            </NButton>
          </div>
        </NFormItem>
        <NFormItem :label="t('page.ai.provider.status')" path="isEnabled">
          <NSwitch v-model:value="model.isEnabled" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">{{ t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="loading" @click="handleSubmit">{{ t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.models-config {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.model-entry {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
