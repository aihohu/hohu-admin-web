<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
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

async function loadDetail() {
  if (!props.editRow) return;
  detailLoading.value = true;
  const { error, data } = await fetchAgentAdminDetail(props.editRow.agentId);
  if (!error && data) {
    detail.value = data;
    model.value = {
      name: data.name,
      description: data.description,
      enabled: data.enabled,
      displayOrder: data.displayOrder,
      systemPrompt: data.systemPrompt,
      modelPreference: data.modelPreference,
      dailyQuotaPerUser: data.dailyQuotaPerUser,
      riskAppetite: data.riskAppetite
    };
    model.value.code = data.code;
  } else {
    window.$message?.error?.('加载失败');
  }
  detailLoading.value = false;
}

async function loadModelOptions() {
  // reuse GET /ai/provider/models — flat list of all available models
  const { error, data } = await fetchGetAvailableModels();
  if (!error && data) {
    const opts = data.map(m => ({
      label: `${m.providerName} / ${m.model}`,
      value: `${m.providerCode}:${m.model}`
    }));
    modelPreferenceOptions.value = [{ label: '用全局默认', value: '' }, ...opts];
  }
  // silent fail — modelPreference select keeps default option
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

// exposed for vitest component tests (descInvalid / model / handleSubmit)
defineExpose({ descInvalid, model, handleSubmit });
</script>

<template>
  <NDrawer v-model:show="visible" :width="600">
    <NDrawerContent title="编辑 Agent" closable>
      <NForm :model="model" label-placement="top" :disabled="detailLoading">
        <NFormItem :label="$t('page.ai.agent.code')">
          <NInput :value="model.code" disabled />
        </NFormItem>
        <NFormItem :label="$t('page.ai.agent.name')" path="name">
          <NInput v-model:value="model.name" />
        </NFormItem>
        <NFormItem :label="$t('page.ai.agent.enabled')">
          <NSwitch v-model:value="model.enabled" />
        </NFormItem>
        <NFormItem :label="$t('page.ai.agent.displayOrder')">
          <NInputNumber v-model:value="model.displayOrder" :min="0" class="w-full" />
        </NFormItem>
        <NFormItem :label="$t('page.ai.agent.riskAppetite')">
          <NSelect
            v-model:value="model.riskAppetite"
            :options="[
              { label: $t('page.ai.agent.riskAppetiteConservative'), value: 'conservative' },
              { label: $t('page.ai.agent.riskAppetiteBalanced'), value: 'balanced' },
              { label: $t('page.ai.agent.riskAppetiteAggressive'), value: 'aggressive' }
            ]"
          />
        </NFormItem>
        <NFormItem :label="`${$t('page.ai.agent.dailyQuotaPerUser')}（${$t('page.ai.agent.dailyQuotaHint')}）`">
          <NInputNumber v-model:value="model.dailyQuotaPerUser" :min="1" clearable class="w-full" />
        </NFormItem>
        <NFormItem :label="$t('page.ai.agent.modelPreference')">
          <NSelect v-model:value="model.modelPreference" :options="modelPreferenceOptions" />
        </NFormItem>
        <NFormItem :label="$t('page.ai.agent.description')">
          <NInput v-model:value="model.description" type="textarea" :rows="4" />
          <template #feedback>
            <span :class="{ 'text-red-500': descInvalid }">{{ descLen }} / 50-200</span>
          </template>
        </NFormItem>
        <NFormItem :label="$t('page.ai.agent.systemPrompt')">
          <NInput v-model:value="model.systemPrompt" type="textarea" :rows="8" />
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
