<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import type { FormInst } from 'naive-ui';
import { fetchAgentAdminDetail, fetchUpdateAgentAdmin } from '@/service/api';
import { fetchGetAvailableModels } from '@/service/api/ai';
import { $t } from '@/locales';

interface Props {
  visible: boolean;
  editRow: Api.AiAgent.AdminListItem | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void;
  (e: 'submitted'): void;
}>();

const visible = computed({
  get: () => props.visible,
  set: v => emit('update:visible', v)
});

const formRef = ref<FormInst | null>(null);
const submitting = ref(false);
const detailLoading = ref(false);

const model = ref<Api.AiAgent.AdminUpdateReq & { code?: string }>({});
const detail = shallowRef<Api.AiAgent.AdminDetailItem | null>(null);

const modelPreferenceOptions = shallowRef<{ label: string; value: string }[]>([{ label: '用全局默认', value: '' }]);

const descLen = computed(() => model.value.description?.length ?? 0);
const descInvalid = computed(() => {
  // only validate once the user has edited the description
  if (model.value.description === undefined) return false;
  return descLen.value < 50 || descLen.value > 200;
});

const formRules = computed(() => ({
  name: {
    required: true,
    message: $t('common.modifySuccess'),
    trigger: 'blur'
  }
}));

async function loadDetail() {
  if (!props.editRow) return;
  detailLoading.value = true;
  const { data } = await fetchAgentAdminDetail(props.editRow.agentId);
  const d = data ?? null;
  detail.value = d;
  if (d) {
    model.value = {
      name: d.name,
      description: d.description,
      enabled: d.enabled,
      displayOrder: d.displayOrder,
      systemPrompt: d.systemPrompt,
      modelPreference: d.modelPreference,
      dailyQuotaPerUser: d.dailyQuotaPerUser,
      riskAppetite: d.riskAppetite
    };
    model.value.code = d.code;
  }
  detailLoading.value = false;
}

async function loadModelOptions() {
  // reuse GET /ai/provider/models — flat list of all available models
  const { data } = await fetchGetAvailableModels();
  const list = data ?? [];
  const opts = list.map(m => ({
    label: `${m.providerName} / ${m.model}`,
    value: `${m.providerCode}:${m.model}`
  }));
  modelPreferenceOptions.value = [{ label: '用全局默认', value: '' }, ...opts];
}

async function handleSubmit() {
  if (descInvalid.value) return;
  if (!props.editRow) return;

  // empty string modelPreference -> null (matches backend AdminUpdateReq schema)
  const body: Api.AiAgent.AdminUpdateReq = { ...model.value };
  if (body.modelPreference === '') {
    body.modelPreference = null;
  }
  // code is read-only (display only) — strip from submit body
  delete (body as { code?: string }).code;

  submitting.value = true;
  const { error } = await fetchUpdateAgentAdmin(props.editRow.agentId, body);
  submitting.value = false;

  if (!error) {
    window.$message?.success?.($t('common.modifySuccess'));
    visible.value = false;
    emit('submitted');
  }
}

watch(
  () => props.visible,
  v => {
    if (v) {
      loadDetail();
      loadModelOptions();
    }
  }
);
</script>

<template>
  <NDrawer v-model:show="visible" :width="600">
    <NDrawerContent title="编辑 Agent" closable>
      <NForm ref="formRef" :model="model" :rules="formRules" label-placement="top" :disabled="detailLoading">
        <NFormItem label="Code">
          <NInput :value="model.code" disabled />
        </NFormItem>
        <NFormItem label="名称" path="name">
          <NInput v-model:value="model.name" />
        </NFormItem>
        <NFormItem label="启用">
          <NSwitch v-model:value="model.enabled" />
        </NFormItem>
        <NFormItem label="排序">
          <NInputNumber v-model:value="model.displayOrder" :min="0" class="w-full" />
        </NFormItem>
        <NFormItem label="风险偏好">
          <NSelect
            v-model:value="model.riskAppetite"
            :options="[
              { label: 'Conservative', value: 'conservative' },
              { label: 'Balanced', value: 'balanced' },
              { label: 'Aggressive', value: 'aggressive' }
            ]"
          />
        </NFormItem>
        <NFormItem label="每日配额/用户（空=仅全局 L2）">
          <NInputNumber v-model:value="model.dailyQuotaPerUser" :min="1" clearable class="w-full" />
        </NFormItem>
        <NFormItem label="模型偏好">
          <NSelect v-model:value="model.modelPreference" :options="modelPreferenceOptions" />
        </NFormItem>
        <NFormItem label="描述">
          <NInput v-model:value="model.description" type="textarea" :autosize="{ minRows: 3 }" />
          <template #feedback>
            <span :class="{ 'text-red-500': descInvalid }">{{ descLen }} / 50-200</span>
          </template>
        </NFormItem>
        <NFormItem label="System Prompt">
          <NInput v-model:value="model.systemPrompt" type="textarea" :autosize="{ minRows: 6 }" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="visible = false">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :disabled="descInvalid" :loading="submitting" @click="handleSubmit">
            {{ $t('common.confirm') }}
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
