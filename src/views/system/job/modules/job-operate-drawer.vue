<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import { fetchGetRegisteredTasks, fetchJobForm, fetchSaveJob, fetchUpdateJob, updateJobSchedule } from '@/service/api';
import { useControlForm } from '@/hooks/business/control-form';
import { jobNotification } from '@/hooks/business/control-fields';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { getServerErrorMessage, useServerFieldErrors } from '@/hooks/common/server-field-errors';
import { $t } from '@/locales';
import JobScheduleFields from './job-schedule-fields.vue';

const props = defineProps<{
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.SystemManage.Job | null;
  command?: 'metadata' | 'schedule';
}>();
const emit = defineEmits<{ submitted: [] }>();
const visible = defineModel<boolean>('visible', { default: false });
const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();
const { fieldProps, applyServerFieldErrors, clearServerFieldErrors } = useServerFieldErrors();
type Model = Api.SystemManage.JobCreateParams;
const form = useControlForm<Model>({
  visible,
  mode: () => (props.operateType === 'edit' ? 'update' : 'create'),
  command: () => props.command ?? 'metadata',
  target: () => props.rowData?.jobId,
  defaults: () => ({
    jobName: '',
    jobKey: '',
    triggerType: 'cron',
    cronExpression: null,
    intervalValue: null,
    intervalUnit: null,
    jobArgs: null,
    status: '2',
    concurrent: '2',
    timeoutSeconds: 30,
    maxRetries: 0,
    runOnEnable: false,
    remark: null
  }),
  load: fetchJobForm
});
const { model, ready, editable, present } = form;
const loading = shallowRef(false);
const registered = shallowRef<Api.SystemManage.RegisteredTask[]>([]);
const tasksReady = shallowRef(false);
const scheduling = computed(() => props.operateType === 'add' || props.command === 'schedule');
const title = computed(() =>
  props.operateType === 'add'
    ? $t('page.system.job.addJob')
    : props.command === 'schedule'
      ? $t('fieldPolicy.scheduleJob')
      : $t('page.system.job.editJob')
);
const dirty = computed(() => Object.keys(form.payload()).length > 0);
const rules = computed(() =>
  Object.fromEntries(
    ['jobName', 'jobKey']
      .filter(key => (props.operateType === 'add' ? editable(key) : Object.hasOwn(form.payload(), key)))
      .map(key => [key, defaultRequiredRule])
  )
);
async function loadTasks() {
  const token = form.session();
  registered.value = [];
  tasksReady.value = false;
  if (props.operateType !== 'add' || !visible.value) return;
  try {
    const { data, error } = await fetchGetRegisteredTasks();
    if (!form.current(token) || error || !data) return;
    registered.value = data;
    tasksReady.value = true;
  } catch {
    /* A failed registry closes creation. */
  }
}
async function submit() {
  if (!ready.value || loading.value || !dirty.value || (props.operateType === 'add' && !tasksReady.value)) return;
  const token = form.session();
  loading.value = true;
  try {
    try {
      await validate();
    } catch {
      return;
    }
    if (!form.current(token)) return;
    const payload = form.payload();
    if (!Object.keys(payload).length) return;
    const result =
      props.operateType === 'add'
        ? await fetchSaveJob({ ...(payload as Model), formReceipt: form.receipt.value })
        : props.command === 'schedule'
          ? await updateJobSchedule({ ...payload, jobId: props.rowData!.jobId })
          : await fetchUpdateJob({ ...payload, jobId: props.rowData!.jobId, formReceipt: form.receipt.value });
    if (!form.current(token)) return;
    if (result.error) {
      form.invalidate();
      if (!applyServerFieldErrors(result.error))
        window.$message?.error(getServerErrorMessage(result.error) || $t('common.modifyFailed'));
      return;
    }
    const delivery = jobNotification(result.data);
    if (delivery) window.$message?.warning($t(`fieldPolicy.job_${delivery}`));
    else window.$message?.success($t('common.saveSuccess'));
    visible.value = false;
    emit('submitted');
  } finally {
    if (form.current(token)) loading.value = false;
  }
}
watch(model, () => clearServerFieldErrors(), { deep: true });
watch(
  [visible, () => props.rowData?.jobId, () => props.operateType, () => props.command],
  () => {
    loading.value = false;
    restoreValidation();
    void loadTasks();
  },
  { immediate: true }
);
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="460" :style="{ maxWidth: '100vw' }">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NSpin :show="form.loading.value">
        <NAlert v-if="!form.loading.value && !ready" type="error" class="mb-16px">
          {{ $t('fieldPolicy.loadFailed') }}
          <NButton text @click="form.reload">{{ $t('common.refresh') }}</NButton>
        </NAlert>
        <NForm ref="formRef" :model="model" :rules="rules" :disabled="loading || !ready">
          <NFormItem
            v-if="(!scheduling || operateType === 'add') && present('jobName')"
            v-bind="fieldProps('jobName')"
            :label="$t('page.system.job.jobName')"
            path="jobName"
          >
            <NInput v-model:value="model.jobName" :disabled="!editable('jobName')" />
          </NFormItem>
          <NFormItem
            v-if="operateType === 'add' && present('jobKey')"
            :label="$t('page.system.job.jobKey')"
            path="jobKey"
          >
            <NSelect
              v-model:value="model.jobKey"
              :disabled="!editable('jobKey') || !tasksReady"
              :options="
                registered.map(task => ({
                  label: task.key === 'test_task' ? $t('fieldPolicy.testTask') : task.labelKey,
                  value: task.key
                }))
              "
            />
          </NFormItem>
          <JobScheduleFields
            v-if="scheduling && ready"
            v-model:model="model"
            :editable="editable"
            :present="present"
            :creating="operateType === 'add'"
          />
          <NFormItem
            v-if="(!scheduling || operateType === 'add') && present('remark')"
            v-bind="fieldProps('remark')"
            :label="$t('page.system.job.remark')"
            path="remark"
          >
            <NInput
              v-model:value="model.remark"
              :disabled="!editable('remark')"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 4 }"
            />
          </NFormItem>
          <NAlert v-if="ready && !Object.keys(model).length" type="info">
            {{ $t('fieldPolicy.replacementHint') }}
          </NAlert>
        </NForm>
      </NSpin>
      <template #footer>
        <NSpace :size="16">
          <NButton @click="visible = false">{{ $t('common.cancel') }}</NButton>
          <NButton
            v-if="
              ready &&
              (operateType === 'add'
                ? form.policy.value?.canCreate
                : scheduling
                  ? form.policy.value?.specialUpdate.length
                  : form.policy.value?.update.length)
            "
            type="primary"
            :disabled="!dirty || (operateType === 'add' && !tasksReady)"
            :loading="loading"
            @click="submit"
          >
            {{ $t('common.confirm') }}
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
