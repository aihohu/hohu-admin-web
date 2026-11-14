<script setup lang="ts">
import { computed } from 'vue';
import { enableStatusOptions } from '@/constants/business';
import { $t } from '@/locales';
defineProps<{ editable: (key: string) => boolean; present: (key: string) => boolean; creating: boolean }>();
const model = defineModel<Partial<Api.SystemManage.JobCreateParams>>('model', { required: true });
const units = computed(() =>
  ['seconds', 'minutes', 'hours', 'days'].map(value => ({ value, label: $t(`fieldPolicy.unit_${value}`) }))
);
const presets = computed(() => [
  { value: '* * * * *', label: $t('page.system.job.presetEveryMinute') },
  { value: '0 * * * *', label: $t('page.system.job.presetEveryHour') },
  { value: '0 0 * * *', label: $t('page.system.job.presetEveryDay') },
  { value: '0 0 * * 1', label: $t('page.system.job.presetEveryWeek') },
  { value: '0 0 1 * *', label: $t('page.system.job.presetEveryMonth') },
  { value: '0 0 1 1 *', label: $t('page.system.job.presetEveryYear') }
]);
</script>

<template>
  <NFormItem v-if="present('triggerType')" :label="$t('page.system.job.triggerType')" path="triggerType">
    <NRadioGroup v-model:value="model.triggerType" :disabled="!editable('triggerType')">
      <NRadio value="cron">{{ $t('page.system.job.triggerTypeCron') }}</NRadio>
      <NRadio value="interval">{{ $t('page.system.job.triggerTypeInterval') }}</NRadio>
    </NRadioGroup>
  </NFormItem>
  <template v-if="model.triggerType !== 'interval'">
    <NFormItem v-if="present('cronExpression')" :label="$t('page.system.job.cronExpression')" path="cronExpression">
      <NInput v-model:value="model.cronExpression" :disabled="!editable('cronExpression')" />
    </NFormItem>
    <NSpace v-if="editable('cronExpression')" class="mb-12px" :size="4">
      <NButton
        v-for="preset in presets"
        :key="preset.value"
        size="tiny"
        quaternary
        :type="model.cronExpression === preset.value ? 'primary' : 'default'"
        @click="model.cronExpression = preset.value"
      >
        {{ preset.label }}
      </NButton>
    </NSpace>
  </template>
  <NFormItem
    v-if="model.triggerType !== 'cron' && (present('intervalValue') || present('intervalUnit'))"
    :label="$t('page.system.job.interval')"
  >
    <NSpace :size="8" align="center">
      <NInputNumber
        v-if="present('intervalValue')"
        v-model:value="model.intervalValue"
        :disabled="!editable('intervalValue')"
        :min="1"
        class="w-120px"
      />
      <NSelect
        v-if="present('intervalUnit')"
        v-model:value="model.intervalUnit"
        :disabled="!editable('intervalUnit')"
        :options="units"
        class="w-120px"
      />
    </NSpace>
  </NFormItem>
  <NFormItem v-if="present('jobArgs')" :label="$t('page.system.job.jobArgs')" path="jobArgs">
    <NInput
      v-model:value="model.jobArgs"
      :disabled="!editable('jobArgs')"
      type="textarea"
      :autosize="{ minRows: 2, maxRows: 4 }"
      :placeholder="$t('fieldPolicy.emptyTaskArgs')"
    />
  </NFormItem>
  <NFormItem v-if="creating && present('status')" :label="$t('page.system.job.status')" path="status">
    <NRadioGroup v-model:value="model.status" :disabled="!editable('status')">
      <NRadio v-for="item in enableStatusOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
    </NRadioGroup>
  </NFormItem>
  <NFormItem v-if="present('concurrent')" :label="$t('page.system.job.concurrent')" path="concurrent">
    <NRadioGroup v-model:value="model.concurrent" :disabled="!editable('concurrent')">
      <NRadio value="1">{{ $t('page.system.job.concurrentAllow') }}</NRadio>
      <NRadio value="2">{{ $t('page.system.job.concurrentForbid') }}</NRadio>
    </NRadioGroup>
  </NFormItem>
  <NFormItem v-if="present('timeoutSeconds')" :label="$t('page.system.job.timeoutSeconds')" path="timeoutSeconds">
    <NInputNumber
      v-model:value="model.timeoutSeconds"
      :disabled="!editable('timeoutSeconds')"
      :min="1"
      :max="60"
      clearable
      class="w-full"
    />
  </NFormItem>
  <NFormItem v-if="present('maxRetries')" :label="$t('page.system.job.maxRetries')" path="maxRetries">
    <NInputNumber
      v-model:value="model.maxRetries"
      :disabled="!editable('maxRetries')"
      :min="0"
      :max="3"
      class="w-full"
    />
  </NFormItem>
  <NFormItem v-if="present('runOnEnable')" :label="$t('page.system.job.runOnEnable')" path="runOnEnable">
    <NSwitch v-model:value="model.runOnEnable" :disabled="!editable('runOnEnable')" />
  </NFormItem>
</template>
