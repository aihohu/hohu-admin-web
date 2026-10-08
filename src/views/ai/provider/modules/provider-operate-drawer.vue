<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { FormInst } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { jsonClone } from '@sa/utils';
import {
  fetchSaveProvider,
  fetchTestProviderModel,
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
const savedProviderFingerprint = ref('');

function providerFingerprint(value: Model): string {
  return JSON.stringify({
    providerCode: value.providerCode,
    name: value.name,
    apiKey: value.apiKey,
    baseUrl: value.baseUrl || '',
    isEnabled: value.isEnabled,
    config: value.config
  });
}

const providerFormDirty = computed(
  () => props.operateType === 'edit' && providerFingerprint(model.value) !== savedProviderFingerprint.value
);

const providerModels = ref<Api.Ai.AiModel[]>([]);
const pendingModels = ref<Api.Ai.AiModelCreateParams[]>([]);
const modelsLoading = ref(false);

const capabilities = computed<{ key: Api.Ai.ModelCapability; label: string }[]>(() => [
  { key: 'text', label: t('page.ai.provider.capText') },
  { key: 'vision', label: t('page.ai.provider.capVision') },
  { key: 'image-gen', label: t('page.ai.provider.capImageGen') },
  { key: 'video', label: t('page.ai.provider.capVideo') },
  { key: 'audio', label: t('page.ai.provider.capAudio') },
  { key: 'embedding', label: t('page.ai.provider.capEmbedding') }
]);

const editingModel = ref<Api.Ai.AiModel | null>(null);
const showModelForm = ref(false);
const modelSaving = ref(false);
const modelAdvancedSections = ref<string[]>([]);

const newModel = ref(createEmptyModelForm());
const testingModelId = ref<string | null>(null);
const testResults = ref<Record<string, 'passed' | 'failed' | undefined>>({});
const savedModelFingerprint = ref('');
const modelMaxTokens = ref<number | null>(null);
const modelTemperature = ref<number | null>(null);

function modelFingerprint(): string {
  const config = { ...newModel.value.config };
  delete config.generation;
  return JSON.stringify({
    name: newModel.value.name,
    capabilities: newModel.value.capabilities,
    baseUrl: newModel.value.baseUrl || '',
    isEnabled: newModel.value.isEnabled,
    sortOrder: newModel.value.sortOrder,
    config,
    maxTokens: modelMaxTokens.value,
    temperature: modelTemperature.value
  });
}

const modelFormDirty = computed(
  () => Boolean(editingModel.value) && modelFingerprint() !== savedModelFingerprint.value
);

const modelFormRef = ref<FormInst | null>(null);
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
  for (const c of capabilities.value) {
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
  if (loading.value || modelSaving.value || testingModelId.value) return;
  editingModel.value = null;
  modelMaxTokens.value = null;
  modelTemperature.value = null;
  newModel.value = createEmptyModelForm();
  modelAdvancedSections.value = [];
  showModelForm.value = true;
}

function openEditModel(m: Api.Ai.AiModel) {
  if (loading.value || modelSaving.value || testingModelId.value) return;
  editingModel.value = m;
  const generation = m.config?.generation as { max_tokens?: number; temperature?: number } | undefined;
  modelMaxTokens.value = generation?.max_tokens ?? null;
  modelTemperature.value = generation?.temperature ?? null;
  newModel.value = {
    name: m.name,
    capabilities: [...m.capabilities],
    baseUrl: m.baseUrl || '',
    isEnabled: m.isEnabled,
    sortOrder: m.sortOrder,
    config: m.config
  };
  modelAdvancedSections.value = [];
  savedModelFingerprint.value = modelFingerprint();
  showModelForm.value = true;
}

function cancelModelForm() {
  if (modelSaving.value || testingModelId.value) return;
  showModelForm.value = false;
}

async function saveModel() {
  if (loading.value || modelSaving.value || testingModelId.value) return;
  modelSaving.value = true;
  try {
    newModel.value.config = {
      ...newModel.value.config,
      generation: {
        ...(modelMaxTokens.value === null ? {} : { max_tokens: modelMaxTokens.value }),
        ...(modelTemperature.value === null ? {} : { temperature: modelTemperature.value })
      }
    };
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
    const { error } = editingModel.value
      ? await fetchUpdateProviderModel(providerId, editingModel.value.modelId, newModel.value)
      : await fetchAddProviderModel(providerId, newModel.value);
    if (error) return;
    if (editingModel.value) testResults.value[editingModel.value.modelId] = undefined;
    window.$message?.success(t(editingModel.value ? 'common.updateSuccess' : 'common.addSuccess'));
    showModelForm.value = false;
    await loadProviderModels();
  } finally {
    modelSaving.value = false;
  }
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
  if (
    !props.rowData ||
    !showModelForm.value ||
    editingModel.value?.modelId !== m.modelId ||
    testingModelId.value ||
    loading.value ||
    modelSaving.value
  )
    return;
  if (providerFormDirty.value) {
    window.$message?.warning(t('page.ai.provider.saveBeforeTest'));
    return;
  }
  if (modelFormDirty.value) {
    window.$message?.warning(t('page.ai.provider.saveModelBeforeTest'));
    return;
  }
  testingModelId.value = m.modelId;
  try {
    const { error } = await fetchTestProviderModel(props.rowData.providerId, m.modelId);
    testResults.value[m.modelId] = error ? 'failed' : 'passed';
    if (!error) {
      window.$message?.success(t('page.ai.provider.modelTestSuccess', { name: m.name }));
    }
  } catch {
    testResults.value[m.modelId] = 'failed';
    window.$message?.error(t('page.ai.provider.testFailed'));
  } finally {
    testingModelId.value = null;
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
  testResults.value = {};

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
    savedProviderFingerprint.value = providerFingerprint(model.value);
    loadProviderModels();
  } else {
    savedProviderFingerprint.value = providerFingerprint(model.value);
  }
}

function closeDrawer() {
  if (loading.value || modelSaving.value || testingModelId.value) return;
  visible.value = false;
}

async function handleSubmit() {
  if (showModelForm.value || loading.value || modelSaving.value) return;
  loading.value = true;
  try {
    try {
      await validate();
    } catch {
      return;
    }
    let res;
    if (props.operateType === 'edit' && props.rowData) {
      res = await fetchUpdateProvider(props.rowData.providerId, model.value);
    } else {
      res = await fetchSaveProvider(model.value);
    }
    const { error, data } = res;
    if (!error) {
      // 新增模式：批量保存待处理的模型
      if (props.operateType === 'add' && data?.providerId && pendingModels.value.length > 0) {
        const providerId = data.providerId;
        for (const pm of pendingModels.value) {
          await fetchAddProviderModel(providerId, pm);
        }
      }
      window.$message?.success(props.operateType === 'edit' ? t('common.updateSuccess') : t('common.addSuccess'));
      visible.value = false;
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

defineExpose({ handleTestModel, model, providerFormDirty, providerModels });
</script>

<template>
  <NDrawer
    v-model:show="visible"
    display-directive="show"
    :width="600"
    :style="{ maxWidth: '100vw' }"
    :mask-closable="!loading && !modelSaving && !testingModelId"
    :close-on-esc="!loading && !modelSaving && !testingModelId"
  >
    <NDrawerContent :title="title" :native-scrollbar="false" :closable="!loading && !modelSaving && !testingModelId">
      <NForm ref="formRef" :model="model" :rules="rules" label-placement="top" :disabled="loading || modelSaving">
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

      <div v-if="operateType === 'edit' && rowData" data-testid="provider-egress-status" class="mb-16px">
        <NSpace align="center" :size="8">
          <span>{{ t('page.ai.provider.egressStatus') }}</span>
          <NTag v-if="providerFormDirty" type="warning">{{ t('page.ai.provider.egressPendingSave') }}</NTag>
          <NTag v-else :type="rowData.egressStatus === 'EGRESS_POLICY_BLOCKED' ? 'error' : 'success'">
            {{
              t(
                rowData.egressStatus === 'EGRESS_POLICY_BLOCKED'
                  ? 'page.ai.provider.egressPolicyBlocked'
                  : 'page.ai.provider.egressPolicyAllowed'
              )
            }}
          </NTag>
        </NSpace>
        <div class="mt-4px text-12px text-gray-500">{{ t('page.ai.provider.egressPolicyHint') }}</div>
      </div>

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
                <NButton v-permission="'ai:provider:edit'" quaternary circle size="tiny" @click="openEditModel(m)">
                  <template #icon>
                    <IconIcRoundEdit class="text-14px" />
                  </template>
                </NButton>
                <NPopconfirm v-permission="'ai:provider:delete'" @positive-click="deleteModel(m)">
                  <template #trigger>
                    <NButton quaternary circle size="tiny">
                      <template #icon>
                        <IconIcRoundDelete class="text-14px" />
                      </template>
                    </NButton>
                  </template>
                  {{ t('common.confirmDelete') }}
                </NPopconfirm>
              </NSpace>
            </div>
            <div v-if="m.baseUrl" class="model-base-url">{{ m.baseUrl }}</div>
            <NAlert v-if="m.egressStatus === 'EGRESS_POLICY_BLOCKED'" type="error" :bordered="false">
              {{ t('page.ai.provider.egressPolicyBlocked') }}
            </NAlert>
          </div>

          <NButton
            v-if="!showModelForm"
            v-permission="'ai:provider:add'"
            dashed
            size="small"
            block
            :disabled="loading || modelSaving"
            data-testid="provider-add-model"
            @click="openAddModel"
          >
            <template #icon>
              <IconIcRoundAdd class="text-14px" />
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
                  <IconIcRoundClose class="text-14px" />
                </template>
              </NButton>
            </NSpace>
          </div>
          <div v-if="m.baseUrl" class="model-base-url">{{ m.baseUrl }}</div>
        </div>

        <NButton
          v-if="!showModelForm"
          dashed
          size="small"
          block
          :disabled="loading || modelSaving"
          data-testid="provider-add-model"
          @click="openAddModel"
        >
          <template #icon>
            <IconIcRoundAdd class="text-14px" />
          </template>
          {{ t('page.ai.provider.addModel') }}
        </NButton>
      </div>

      <!-- Add/Edit model form (shared) -->
      <div v-if="showModelForm" class="model-form" data-testid="provider-model-editor">
        <NCard size="small" :title="editingModel ? t('page.ai.provider.editModel') : t('page.ai.provider.addModel')">
          <NAlert v-if="editingModel && (providerFormDirty || modelFormDirty)" type="warning" :bordered="false">
            {{ t(providerFormDirty ? 'page.ai.provider.saveBeforeTest' : 'page.ai.provider.saveModelBeforeTest') }}
          </NAlert>
          <NForm
            ref="modelFormRef"
            :model="newModel"
            :rules="modelFormRules"
            label-placement="top"
            :disabled="modelSaving"
          >
            <NFormItem :label="t('page.ai.provider.modelName')" path="name">
              <NInput
                v-model:value="newModel.name"
                :placeholder="t('page.ai.provider.form.modelName')"
                data-testid="provider-model-name"
              />
            </NFormItem>
            <NFormItem :label="t('page.ai.provider.capabilities')" path="capabilities">
              <NCheckboxGroup
                v-model:value="newModel.capabilities"
                class="w-full"
                data-testid="provider-model-capabilities"
              >
                <div class="capability-grid">
                  <NCheckbox v-for="cap in capabilities" :key="cap.key" :value="cap.key" :label="cap.label" />
                </div>
              </NCheckboxGroup>
            </NFormItem>
            <NCollapse v-model:expanded-names="modelAdvancedSections" class="model-advanced">
              <NCollapseItem name="advanced" :title="t('page.ai.provider.advancedSettings')">
                <NFormItem :label="t('page.ai.provider.modelBaseUrl')">
                  <NInput
                    v-model:value="newModel.baseUrl"
                    :placeholder="t('page.ai.provider.form.modelBaseUrlExample')"
                  />
                  <template #feedback>{{ t('page.ai.provider.form.modelBaseUrl') }}</template>
                </NFormItem>
                <NAlert type="info" class="mb-16px">{{ t('settings.modelHint') }}</NAlert>
                <NFormItem :label="t('settings.modelTokens')">
                  <NInputNumber
                    v-model:value="modelMaxTokens"
                    :min="1"
                    :max="1000000"
                    :precision="0"
                    clearable
                    class="w-full"
                  />
                </NFormItem>
                <NFormItem :label="t('settings.modelTemperature')">
                  <NInputNumber
                    v-model:value="modelTemperature"
                    :min="0"
                    :max="2"
                    :step="0.1"
                    clearable
                    class="w-full"
                  />
                </NFormItem>
                <NFormItem :label="t('page.ai.provider.sortOrder')" :show-feedback="false">
                  <NInputNumber v-model:value="newModel.sortOrder" :min="0" class="w-full" />
                </NFormItem>
              </NCollapseItem>
            </NCollapse>
          </NForm>
          <template #action>
            <div v-if="editingModel" class="model-editor-hint mb-8px">{{ t('page.ai.provider.modelTestHint') }}</div>
            <NSpace justify="space-between" align="center">
              <NSpace align="center" :size="8">
                <NButton
                  v-if="operateType === 'edit' && editingModel"
                  v-permission="'ai:provider:test-model'"
                  :disabled="providerFormDirty || modelFormDirty || loading || modelSaving || testingModelId !== null"
                  :loading="testingModelId === editingModel.modelId"
                  data-testid="provider-model-test"
                  @click="handleTestModel(editingModel)"
                >
                  {{ t('page.ai.provider.testConnectivity') }}
                </NButton>
                <NTag
                  v-if="editingModel && testResults[editingModel.modelId] && !providerFormDirty && !modelFormDirty"
                  :type="testResults[editingModel.modelId] === 'passed' ? 'success' : 'error'"
                  size="small"
                  data-testid="provider-model-test-result"
                >
                  {{
                    t(
                      testResults[editingModel.modelId] === 'passed'
                        ? 'page.ai.provider.testPassed'
                        : 'page.ai.provider.testFailed'
                    )
                  }}
                </NTag>
              </NSpace>
              <NSpace align="center">
                <NButton
                  :disabled="modelSaving || testingModelId !== null"
                  data-testid="provider-model-cancel"
                  @click="cancelModelForm"
                >
                  {{ t(editingModel ? 'page.ai.provider.cancelEditModel' : 'page.ai.provider.cancelAddModel') }}
                </NButton>
                <NButton
                  type="primary"
                  :loading="modelSaving"
                  :disabled="testingModelId !== null"
                  data-testid="provider-model-submit"
                  @click="saveModel"
                >
                  {{ t(operateType === 'add' ? 'page.ai.provider.addModelToList' : 'page.ai.provider.saveModel') }}
                </NButton>
              </NSpace>
            </NSpace>
          </template>
        </NCard>
      </div>

      <template #footer>
        <div class="drawer-footer">
          <p v-if="showModelForm" id="provider-model-editor-hint" class="model-editor-hint">
            {{ t('page.ai.provider.completeModelFirst') }}
          </p>
          <div class="drawer-footer-actions">
            <NButton :disabled="loading || modelSaving" @click="closeDrawer">{{ t('common.cancel') }}</NButton>
            <NButton
              type="primary"
              :loading="loading"
              :disabled="showModelForm || modelSaving"
              :aria-describedby="showModelForm ? 'provider-model-editor-hint' : undefined"
              data-testid="provider-config-submit"
              @click="handleSubmit"
            >
              {{ t(operateType === 'add' ? 'page.ai.provider.createConfig' : 'page.ai.provider.saveConfig') }}
            </NButton>
          </div>
        </div>
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
  flex-wrap: wrap;
}

.model-name {
  font-weight: 500;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.model-base-url {
  margin-top: 4px;
  font-size: 12px;
  color: var(--n-text-color-3);
  overflow-wrap: anywhere;
}

.model-form {
  margin-top: 8px;
  container-type: inline-size;
}

.capability-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 16px;
}

@container (max-width: 440px) {
  .capability-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.model-advanced {
  border-top: 1px solid var(--n-border-color);
  padding-top: 16px;
}

.drawer-footer {
  width: 100%;
}

.model-editor-hint {
  margin: 0 0 12px;
  color: var(--n-text-color-3);
  font-size: 13px;
  line-height: 1.5;
}

.drawer-footer-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}
</style>
