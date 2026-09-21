<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import { fetchAgentAdminDetail, fetchAgentModelOptions, fetchUpdateAgentAdmin } from '@/service/api';
import { $t } from '@/locales';

interface Props {
  visible: boolean;
  editRow: Api.AiAgent.AdminListItem | null;
  readOnly?: boolean;
  requireAudit?: boolean;
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
const reason = ref('');
const ticket = ref('');
const acknowledged = ref(false);
const auditInvalid = computed(
  () =>
    props.requireAudit &&
    (!reason.value.trim() ||
      reason.value.length > 256 ||
      !/^[A-Za-z0-9._:/-]{1,128}$/.test(ticket.value.trim()) ||
      !acknowledged.value)
);

const model = ref<Api.AiAgent.AdminUpdateReq & { code?: string }>({});
const detail = shallowRef<Api.AiAgent.AdminDetailItem | null>(null);

const modelPreferenceOptions = shallowRef<{ label: string; value: string }[]>([
  { label: $t('page.ai.agent.useGlobalDefault'), value: '' }
]);

const nameInvalid = computed(() => !model.value.name?.trim() || Array.from(model.value.name).length > 128);
const descLen = computed(() => Array.from(model.value.description || '').length);
const descInvalid = computed(() => {
  // only validate once the user has edited the description
  if (model.value.description === undefined) return false;
  return descLen.value < 50 || descLen.value > 200;
});

let loadSequence = 0;

async function loadDetail(sequence: number): Promise<boolean> {
  if (!props.editRow) return false;
  detailLoading.value = true;
  const { error, data } = await fetchAgentAdminDetail(props.editRow.agentId);
  if (sequence !== loadSequence || !props.visible) return false;
  if (!error && data) {
    detail.value = data;
    model.value = {
      name: data.name,
      description: data.description,
      enabled: data.enabled,
      displayOrder: data.displayOrder,
      systemPrompt: data.systemPrompt,
      modelPreference: data.modelPreference ?? '',
      dailyQuotaPerUser: data.dailyQuotaPerUser,
      riskAppetite: data.riskAppetite
    };
    model.value.code = data.code;
  } else {
    window.$message?.error?.($t('page.ai.agent.loadFailed'));
  }
  detailLoading.value = false;
  return !error && Boolean(data);
}

async function loadModelOptions(sequence: number) {
  const { error, data } = await fetchAgentModelOptions();
  if (sequence !== loadSequence || !props.visible) return;
  if (!error && data) {
    const opts = data.map(m => ({
      label: m.label,
      value: m.modelId
    }));
    const currentPreference = model.value.modelPreference;
    if (currentPreference && !opts.some(option => option.value === currentPreference)) {
      opts.unshift({ label: currentPreference, value: currentPreference });
    }
    modelPreferenceOptions.value = [{ label: $t('page.ai.agent.useGlobalDefault'), value: '' }, ...opts];
  }
  // Keep the global default option when model options cannot be loaded.
}

async function loadDrawerData(sequence: number) {
  if (!(await loadDetail(sequence))) return;
  await loadModelOptions(sequence);
}

async function handleSubmit() {
  if (
    descInvalid.value ||
    nameInvalid.value ||
    auditInvalid.value ||
    props.readOnly ||
    detailLoading.value ||
    !detail.value ||
    submitting.value
  )
    return;
  if (!props.editRow) return;

  // empty string modelPreference -> null (matches backend AdminUpdateReq schema)
  const body: Api.AiAgent.AdminUpdateReq = { ...model.value };
  if (body.modelPreference === '') {
    body.modelPreference = null;
  }
  // code is read-only (display only) — strip from submit body
  delete (body as { code?: string }).code;

  submitting.value = true;
  const { error } = props.requireAudit
    ? await fetchUpdateAgentAdmin(props.editRow.agentId, body, { reason: reason.value, ticket: ticket.value })
    : await fetchUpdateAgentAdmin(props.editRow.agentId, body);
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
    const sequence = ++loadSequence;
    detail.value = null;
    model.value = {};
    reason.value = '';
    ticket.value = '';
    acknowledged.value = false;
    if (v) {
      modelPreferenceOptions.value = [{ label: $t('page.ai.agent.useGlobalDefault'), value: '' }];
      void loadDrawerData(sequence);
    }
  }
);

// exposed for vitest component tests (descInvalid / model / handleSubmit)
defineExpose({ descInvalid, model, modelPreferenceOptions, handleSubmit });
</script>

<template>
  <NDrawer v-model:show="visible" :width="600" :style="{ maxWidth: '100vw' }" data-testid="ai-agent-drawer">
    <NDrawerContent :title="$t(readOnly ? 'platform.view' : 'page.ai.agent.editTitle')" closable>
      <NAlert v-if="requireAudit" type="warning" class="mb-4">{{ $t('platform.scope') }}</NAlert>
      <NForm :model="model" label-placement="top" :disabled="detailLoading || readOnly || submitting">
        <NFormItem :label="$t('page.ai.agent.code')">
          <NInput :value="model.code" disabled />
        </NFormItem>
        <NFormItem
          :label="$t('page.ai.agent.name')"
          path="name"
          required
          :validation-status="nameInvalid && detail ? 'error' : undefined"
          :feedback="nameInvalid && detail ? $t('platform.nameRequired') : undefined"
        >
          <NInput v-model:value="model.name" :input-props="{ 'aria-label': $t('page.ai.agent.name') }" />
        </NFormItem>
        <NFormItem :label="$t('page.ai.agent.enabled')">
          <NSwitch v-model:value="model.enabled" data-testid="ai-agent-enabled" />
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
          <NInput v-model:value="model.description" type="textarea" :rows="4" data-testid="ai-agent-description" />
          <template #feedback>
            <span :class="{ 'text-red-500': descInvalid }">{{ descLen }} / 50-200</span>
          </template>
        </NFormItem>
        <NFormItem :label="$t('page.ai.agent.systemPrompt')">
          <NInput v-model:value="model.systemPrompt" type="textarea" :rows="8" />
        </NFormItem>
        <template v-if="requireAudit && !readOnly">
          <NAlert type="info" class="mb-4">{{ $t('platform.auditHint') }}</NAlert>
          <NFormItem :label="$t('platform.reason')" required>
            <NInput v-model:value="reason" :maxlength="256" :input-props="{ 'aria-label': $t('platform.reason') }" />
          </NFormItem>
          <NFormItem :label="$t('platform.ticket')" required>
            <NInput v-model:value="ticket" :maxlength="128" :input-props="{ 'aria-label': $t('platform.ticket') }" />
          </NFormItem>
          <NCheckbox v-model:checked="acknowledged">{{ $t('platform.acknowledge') }}</NCheckbox>
        </template>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="visible = false">{{ $t('common.cancel') }}</NButton>
          <NButton
            v-if="!readOnly"
            type="primary"
            :disabled="nameInvalid || descInvalid || auditInvalid || detailLoading || !detail || submitting"
            :loading="submitting"
            data-testid="ai-agent-submit"
            @click="handleSubmit"
          >
            {{ $t('common.confirm') }}
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
