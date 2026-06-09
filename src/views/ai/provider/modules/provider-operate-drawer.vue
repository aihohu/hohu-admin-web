<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { jsonClone } from '@sa/utils';
import {
  fetchSaveProvider,
  fetchTestModel,
  fetchUpdateProvider,
  fetchGetProviderModels,
  fetchAddProviderModel,
  fetchUpdateProviderModel,
  fetchDeleteProviderModel
} from '@/service/api';
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

const providerModels = ref<Api.Ai.AiModel[]>([]);
const pendingModels = ref<Api.Ai.AiModelCreateParams[]>([]);
const modelsLoading = ref(false);

const ALL_CAPABILITIES: { key: Api.Ai.ModelCapability; label: string }[] = [
  { key: 'text', label: t('page.ai.provider.capText') },
  { key: 'vision', label: t('page.ai.provider.capVision') },
  { key: 'image-gen', label: t('page.ai.provider.capImageGen') },
  { key: 'video', label: t('page.ai.provider.capVideo') },
  { key: 'audio', label: t('page.ai.provider.capAudio') },
  { key: 'embedding', label: t('page.ai.provider.capEmbedding') }
];

const editingModel = ref<Api.Ai.AiModel | null>(null);
const showModelForm = ref(false);

const newModel = ref(createEmptyModelForm());
const testingModelId = ref<string | null>(null);

const modelFormRef = ref();
const modelFormRules = computed(() => ({
  name: { required: true, message: t('page.ai.provider.form.modelName'), trigger: 'blur' },
  capabilities: {
    required: true,
    type: 'array' as const,
    min: 1,
    message: t('page.ai.provider.capabilitiesRequired'),
    trigger: 'change'
  }
}));

const capLabelMap = computed(() => {
  const map: Record<string, string> = {};
  for (const c of ALL_CAPABILITIES) {
    map[c.key] = c.label;
  }
  return map;
});

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

function createEmptyModelForm(): Api.Ai.AiModelCreateParams {
  return {
    name: '',
    capabilities: ['text'],
    baseUrl: '',
    isEnabled: true,
    sortOrder: 0,
    config: null
  };
}

async function loadProviderModels() {
  if (props.operateType !== 'edit' || !props.rowData) return;
  modelsLoading.value = true;
  try {
    const { data, error } = await fetchGetProviderModels(props.rowData.providerId);
    if (!error && data) {
      providerModels.value = data;
    }
  } finally {
    modelsLoading.value = false;
  }
}

function openAddModel() {
  editingModel.value = null;
  newModel.value = createEmptyModelForm();
  showModelForm.value = true;
}

function openEditModel(m: Api.Ai.AiModel) {
  editingModel.value = m;
  newModel.value = {
    name: m.name,
    capabilities: [...m.capabilities],
    baseUrl: m.baseUrl || '',
    isEnabled: m.isEnabled,
    sortOrder: m.sortOrder,
    config: m.config
  };
  showModelForm.value = true;
}

async function saveModel() {
  try {
    await modelFormRef.value?.validate();
  } catch {
    return;
  }

  if (props.operateType === 'add') {
    // 新增模式：暂存到本地列表
    pendingModels.value.push({ ...newModel.value });
    showModelForm.value = false;
    return;
  }

  if (!props.rowData) return;
  const providerId = props.rowData.providerId;
  if (editingModel.value) {
    const { error } = await fetchUpdateProviderModel(providerId, editingModel.value.modelId, newModel.value);
    if (!error) {
      window.$message?.success(t('common.updateSuccess'));
    }
  } else {
    const { error } = await fetchAddProviderModel(providerId, newModel.value);
    if (!error) {
      window.$message?.success(t('common.addSuccess'));
    }
  }
  showModelForm.value = false;
  await loadProviderModels();
}

function removePendingModel(index: number) {
  pendingModels.value.splice(index, 1);
}

async function deleteModel(m: Api.Ai.AiModel) {
  if (!props.rowData) return;
  const { error } = await fetchDeleteProviderModel(props.rowData.providerId, m.modelId);
  if (!error) {
    window.$message?.success(t('common.deleteSuccess'));
    await loadProviderModels();
  }
}

async function handleTestModel(m: Api.Ai.AiModel) {
  testingModelId.value = m.modelId;
  const { error } = await fetchTestModel({
    providerId: props.rowData?.providerId,
    providerCode: model.value.providerCode,
    model: m.name,
    apiKey: model.value.apiKey || undefined,
    baseUrl: m.baseUrl || model.value.baseUrl || undefined
  });
  testingModelId.value = null;
  if (!error) {
    window.$message?.success(t('page.ai.provider.modelTestSuccess', { name: m.name }));
  }
}

type RuleKey = Extract<keyof Model, 'providerCode' | 'name' | 'apiKey'>;

const rules = computed<Record<RuleKey, App.Global.FormRule>>(() => ({
  providerCode: defaultRequiredRule,
  name: defaultRequiredRule,
  apiKey: props.operateType === 'add' ? defaultRequiredRule : {}
}));

function handleInitModel() {
  model.value = createDefaultModel();
  providerModels.value = [];
  pendingModels.value = [];
  showModelForm.value = false;

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
    loadProviderModels();
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  loading.value = true;
  try {
    let res;
    if (props.operateType === 'edit' && props.rowData) {
      res = await fetchUpdateProvider(props.rowData.providerId, model.value);
    } else {
      res = await fetchSaveProvider(model.value);
    }
    const { error, data } = res;
    if (!error) {
      // 新增模式：批量保存待处理的模型
      if (
        props.operateType === 'add' &&
        (data as unknown as Api.Ai.Provider)?.providerId &&
        pendingModels.value.length > 0
      ) {
        const providerId = (data as unknown as Api.Ai.Provider).providerId;
        for (const pm of pendingModels.value) {
          await fetchAddProviderModel(providerId, pm);
        }
      }
      window.$message?.success(props.operateType === 'edit' ? t('common.updateSuccess') : t('common.addSuccess'));
      closeDrawer();
      emit('submitted');
    }
  } finally {
    loading.value = false;
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
  <NDrawer v-model:show="visible" display-directive="show" :width="500">
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
        <NFormItem :label="t('page.ai.provider.status')" path="isEnabled">
          <NSwitch v-model:value="model.isEnabled" />
        </NFormItem>
      </NForm>

      <!-- Models section -->
      <NDivider style="margin: 12px 0 8px">
        {{ t('page.ai.provider.models') }}
      </NDivider>

      <!-- Edit mode: server-side models -->
      <NSpin v-if="operateType === 'edit'" :show="modelsLoading">
        <div class="models-list">
          <div v-for="m in providerModels" :key="m.modelId" class="model-card">
            <div class="model-card-header">
              <span class="model-name">{{ m.name }}</span>
              <NSpace :size="4" align="center">
                <NTag
                  v-for="cap in m.capabilities"
                  :key="cap"
                  size="small"
                  :type="cap === 'text' ? 'info' : cap === 'vision' ? 'success' : 'warning'"
                  round
                >
                  {{ capLabelMap[cap] || cap }}
                </NTag>
                <NTooltip>
                  <template #trigger>
                    <NButton
                      quaternary
                      circle
                      size="tiny"
                      :loading="testingModelId === m.modelId"
                      @click="handleTestModel(m)"
                    >
                      <template #icon>
                        <icon-ic-round-play-arrow class="text-14px" />
                      </template>
                    </NButton>
                  </template>
                  {{ t('page.ai.provider.testConnectivity') }}
                </NTooltip>
                <NButton quaternary circle size="tiny" @click="openEditModel(m)">
                  <template #icon>
                    <icon-ic-round-edit class="text-14px" />
                  </template>
                </NButton>
                <NPopconfirm @positive-click="deleteModel(m)">
                  <template #trigger>
                    <NButton quaternary circle size="tiny">
                      <template #icon>
                        <icon-ic-round-delete class="text-14px" />
                      </template>
                    </NButton>
                  </template>
                  {{ t('common.confirmDelete') }}
                </NPopconfirm>
              </NSpace>
            </div>
            <div v-if="m.baseUrl" class="model-base-url">{{ m.baseUrl }}</div>
          </div>

          <NButton v-if="!showModelForm" dashed size="small" block @click="openAddModel">
            <template #icon>
              <icon-ic-round-add class="text-14px" />
            </template>
            {{ t('page.ai.provider.addModel') }}
          </NButton>
        </div>
      </NSpin>

      <!-- Add mode: local pending models -->
      <div v-if="operateType === 'add'" class="models-list">
        <div v-for="(m, idx) in pendingModels" :key="idx" class="model-card">
          <div class="model-card-header">
            <span class="model-name">{{ m.name }}</span>
            <NSpace :size="4" align="center">
              <NTag
                v-for="cap in m.capabilities"
                :key="cap"
                size="small"
                :type="cap === 'text' ? 'info' : cap === 'vision' ? 'success' : 'warning'"
                round
              >
                {{ capLabelMap[cap] || cap }}
              </NTag>
              <NButton quaternary circle size="tiny" @click="removePendingModel(idx)">
                <template #icon>
                  <icon-ic-round-close class="text-14px" />
                </template>
              </NButton>
            </NSpace>
          </div>
          <div v-if="m.baseUrl" class="model-base-url">{{ m.baseUrl }}</div>
        </div>

        <NButton v-if="!showModelForm" dashed size="small" block @click="openAddModel">
          <template #icon>
            <icon-ic-round-add class="text-14px" />
          </template>
          {{ t('page.ai.provider.addModel') }}
        </NButton>
      </div>

      <!-- Add/Edit model form (shared) -->
      <div v-if="showModelForm" class="model-form">
        <NCard size="small" :title="editingModel ? t('common.edit') : t('page.ai.provider.addModel')">
          <NForm
            ref="modelFormRef"
            :model="newModel"
            :rules="modelFormRules"
            label-placement="left"
            label-width="auto"
            size="small"
          >
            <NFormItem :label="t('page.ai.provider.name')" path="name">
              <NInput v-model:value="newModel.name" :placeholder="t('page.ai.provider.form.modelName')" />
            </NFormItem>
            <NFormItem :label="t('page.ai.provider.capabilities')" path="capabilities">
              <NCheckboxGroup v-model:value="newModel.capabilities">
                <NSpace>
                  <NCheckbox v-for="cap in ALL_CAPABILITIES" :key="cap.key" :value="cap.key" :label="cap.label" />
                </NSpace>
              </NCheckboxGroup>
            </NFormItem>
            <NFormItem :label="t('page.ai.provider.modelBaseUrl')">
              <NInput v-model:value="newModel.baseUrl" :placeholder="t('page.ai.provider.form.modelBaseUrl')" />
            </NFormItem>
            <NFormItem :label="t('page.ai.provider.sortOrder')">
              <NInputNumber v-model:value="newModel.sortOrder" :min="0" size="small" />
            </NFormItem>
          </NForm>
          <template #action>
            <NSpace>
              <NButton size="small" @click="showModelForm = false">{{ t('common.cancel') }}</NButton>
              <NButton type="primary" size="small" @click="saveModel">{{ t('common.confirm') }}</NButton>
            </NSpace>
          </template>
        </NCard>
      </div>

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
.models-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.model-card {
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  padding: 8px 12px;
}

.model-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.model-name {
  font-weight: 500;
  font-size: 13px;
}

.model-base-url {
  margin-top: 4px;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.model-form {
  margin-top: 8px;
}
</style>
