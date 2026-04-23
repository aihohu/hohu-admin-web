<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { enableStatusOptions } from '@/constants/business';
import { fetchGetRegisteredTasks, fetchSaveJob, fetchUpdateJob } from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'JobOperateDrawer'
});

interface Props {
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.SystemManage.Job | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', { default: false });

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t('page.system.job.addJob'),
    edit: $t('page.system.job.editJob')
  };
  return titles[props.operateType];
});

type Model = Api.SystemManage.JobCreateParams;

const model = ref(createDefaultModel());

function createDefaultModel(): Model {
  return {
    jobName: '',
    jobKey: '',
    cronExpression: null,
    triggerType: 'cron',
    intervalValue: null,
    intervalUnit: null,
    jobArgs: null,
    status: '2',
    concurrent: '2',
    remark: null
  };
}

const triggerTypeOptions = [
  { label: $t('page.system.job.triggerTypeCron'), value: 'cron' },
  { label: $t('page.system.job.triggerTypeInterval'), value: 'interval' }
];

const intervalUnitOptions = [
  { label: $t('page.system.job.unitSeconds'), value: 'seconds' },
  { label: $t('page.system.job.unitMinutes'), value: 'minutes' },
  { label: $t('page.system.job.unitHours'), value: 'hours' },
  { label: $t('page.system.job.unitDays'), value: 'days' }
];

const concurrentOptions = [
  { label: $t('page.system.job.concurrentAllow'), value: '1' },
  { label: $t('page.system.job.concurrentForbid'), value: '2' }
];

const cronPresets = [
  { label: $t('page.system.job.presetEveryMinute'), value: '* * * * *' },
  { label: $t('page.system.job.presetEveryHour'), value: '0 * * * *' },
  { label: $t('page.system.job.presetEveryDay'), value: '0 0 * * *' },
  { label: $t('page.system.job.presetEveryWeek'), value: '0 0 * * 1' },
  { label: $t('page.system.job.presetEveryMonth'), value: '0 0 1 * *' },
  { label: $t('page.system.job.presetEveryYear'), value: '0 0 1 1 *' }
];

const cronDescription = computed(() => {
  if (model.value.triggerType !== 'cron' || !model.value.cronExpression) return '';
  const parts = model.value.cronExpression.trim().split(/\s+/);
  if (parts.length === 5) {
    const [min, hour, day, month, dow] = parts;
    if (min === '*' && hour === '*') return $t('page.system.job.descEveryMinute');
    if (min === '0' && hour === '*') return $t('page.system.job.descEveryHour');
    if (min === '0' && hour === '0' && day === '*' && month === '*' && dow === '*')
      return $t('page.system.job.descEveryDay');
    if (min === '0' && hour === '0' && dow !== '*' && day === '*' && month === '*')
      return $t('page.system.job.descEveryWeek');
  }
  return '';
});

const registeredTasks = ref<Api.SystemManage.RegisteredTask[]>([]);

async function loadRegisteredTasks() {
  const { data, error } = await fetchGetRegisteredTasks();
  if (!error && data) {
    registeredTasks.value = data;
  }
}

type RuleKey = Extract<keyof Model, 'jobName' | 'jobKey' | 'status'>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  jobName: defaultRequiredRule,
  jobKey: defaultRequiredRule,
  status: defaultRequiredRule
};

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === 'edit' && props.rowData) {
    const clone = jsonClone(props.rowData);
    model.value = {
      jobName: clone.jobName,
      jobKey: clone.jobKey,
      cronExpression: clone.cronExpression,
      triggerType: clone.triggerType || 'cron',
      intervalValue: clone.intervalValue,
      intervalUnit: clone.intervalUnit,
      jobArgs: clone.jobArgs,
      status: clone.status,
      concurrent: clone.concurrent,
      remark: clone.remark
    };
  }
}

function closeDrawer() {
  visible.value = false;
}

function applyCronPreset(value: string) {
  model.value.cronExpression = value;
}

async function handleSubmit() {
  await validate();

  let res;
  if (props.operateType === 'edit' && props.rowData) {
    res = await fetchUpdateJob({ ...model.value, jobId: props.rowData.jobId });
  } else {
    res = await fetchSaveJob(model.value);
  }
  const { error, response } = res;
  if (!error) {
    const successMsg =
      response?.data?.msg || $t(props.operateType === 'edit' ? 'common.updateSuccess' : 'common.saveSuccess');
    window.$message?.success(successMsg);
    closeDrawer();
    emit('submitted');
  }
}

watch(visible, () => {
  if (visible.value) {
    handleInitModel();
    restoreValidation();
    loadRegisteredTasks();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="460">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem :label="$t('page.system.job.jobName')" path="jobName">
          <NInput v-model:value="model.jobName" :placeholder="$t('page.system.job.form.jobName')" />
        </NFormItem>
        <NFormItem :label="$t('page.system.job.jobKey')" path="jobKey">
          <NSelect
            v-model:value="model.jobKey"
            :placeholder="$t('page.system.job.form.jobKey')"
            :options="registeredTasks.map(t => ({ label: `${t.name} (${t.key})`, value: t.key }))"
            :disabled="operateType === 'edit'"
            filterable
          />
        </NFormItem>
        <NFormItem :label="$t('page.system.job.triggerType')" path="triggerType">
          <NRadioGroup v-model:value="model.triggerType">
            <NRadio v-for="item in triggerTypeOptions" :key="item.value" :value="item.value" :label="item.label" />
          </NRadioGroup>
        </NFormItem>

        <!-- cron 模式 -->
        <template v-if="model.triggerType === 'cron'">
          <NFormItem :label="$t('page.system.job.cronExpression')" path="cronExpression">
            <NInput v-model:value="model.cronExpression" :placeholder="$t('page.system.job.form.cronExpression')" />
          </NFormItem>
          <div class="mb-12px">
            <NSpace :size="4">
              <NButton
                v-for="preset in cronPresets"
                :key="preset.value"
                size="tiny"
                quaternary
                @click="applyCronPreset(preset.value)"
              >
                {{ preset.label }}
              </NButton>
            </NSpace>
          </div>
          <div v-if="cronDescription" class="mb-12px text-12px text-gray-500">
            {{ cronDescription }}
          </div>
        </template>

        <!-- interval 模式 -->
        <template v-if="model.triggerType === 'interval'">
          <NFormItem :label="$t('page.system.job.interval')" path="intervalValue">
            <NSpace :size="8" align="center">
              <NInputNumber
                v-model:value="model.intervalValue"
                :min="1"
                :placeholder="$t('page.system.job.form.intervalValue')"
                style="width: 120px"
              />
              <NSelect
                v-model:value="model.intervalUnit"
                :options="intervalUnitOptions"
                :placeholder="$t('page.system.job.form.intervalUnit')"
                style="width: 120px"
              />
            </NSpace>
          </NFormItem>
        </template>

        <NFormItem :label="$t('page.system.job.jobArgs')" path="jobArgs">
          <NInput
            v-model:value="model.jobArgs"
            type="textarea"
            :placeholder="$t('page.system.job.form.jobArgs')"
            :autosize="{ minRows: 2, maxRows: 4 }"
          />
        </NFormItem>
        <NFormItem :label="$t('page.system.job.status')" path="status">
          <NRadioGroup v-model:value="model.status">
            <NRadio v-for="item in enableStatusOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
          </NRadioGroup>
        </NFormItem>
        <NFormItem :label="$t('page.system.job.concurrent')" path="concurrent">
          <NRadioGroup v-model:value="model.concurrent">
            <NRadio v-for="item in concurrentOptions" :key="item.value" :value="item.value" :label="item.label" />
          </NRadioGroup>
        </NFormItem>
        <NFormItem :label="$t('page.system.job.remark')" path="remark">
          <NInput
            v-model:value="model.remark"
            type="textarea"
            :placeholder="$t('page.system.job.form.remark')"
            :autosize="{ minRows: 2, maxRows: 4 }"
          />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
