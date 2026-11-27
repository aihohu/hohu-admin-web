<script setup lang="ts">
import { computed } from 'vue';
import { NTag } from 'naive-ui';
import { $t } from '@/locales';

defineOptions({
  name: 'JobLogDetailModal'
});

interface Props {
  rowData?: Api.SystemManage.JobLog | null;
}

const props = defineProps<Props>();

const visible = defineModel<boolean>('visible', { default: false });

const statusMap: Record<string, { type: NaiveUI.ThemeColor; label: string }> = {
  '1': { type: 'success', label: $t('page.system.jobLog.statusSuccess') },
  '2': { type: 'error', label: $t('page.system.jobLog.statusFailed') },
  '3': { type: 'primary', label: $t('page.system.jobLog.statusRunning') }
};

const statusInfo = computed(() => {
  if (!props.rowData?.status) return null;
  return statusMap[props.rowData.status];
});
</script>

<template>
  <NModal v-model:show="visible" preset="card" :title="$t('page.system.jobLog.detailTitle')" class="w-600px">
    <NDescriptions v-if="rowData" label-placement="left" bordered :column="1" size="small">
      <NDescriptionsItem v-if="Object.hasOwn(rowData, 'jobName')" :label="$t('page.system.jobLog.jobName')">
        {{ rowData.jobName }}
      </NDescriptionsItem>
      <NDescriptionsItem v-if="Object.hasOwn(rowData, 'jobKey')" :label="$t('page.system.jobLog.jobKey')">
        {{ rowData.jobKey }}
      </NDescriptionsItem>
      <NDescriptionsItem :label="$t('page.system.jobLog.status')">
        <NTag v-if="statusInfo" :type="statusInfo.type">{{ statusInfo.label }}</NTag>
        <span v-else>-</span>
      </NDescriptionsItem>
      <NDescriptionsItem v-if="Object.hasOwn(rowData, 'startTime')" :label="$t('page.system.jobLog.startTime')">
        {{ rowData.startTime }}
      </NDescriptionsItem>
      <NDescriptionsItem v-if="Object.hasOwn(rowData, 'endTime')" :label="$t('page.system.jobLog.endTime')">
        {{ rowData.endTime || '-' }}
      </NDescriptionsItem>
      <NDescriptionsItem v-if="Object.hasOwn(rowData, 'duration')" :label="$t('page.system.jobLog.duration')">
        {{ rowData.duration != null ? `${rowData.duration}ms` : '-' }}
      </NDescriptionsItem>
      <NDescriptionsItem v-if="rowData.errorMsg" :label="$t('page.system.jobLog.errorMsg')">
        <NAlert type="error" :bordered="false" class="whitespace-pre-wrap break-all">
          {{ rowData.errorMsg }}
        </NAlert>
      </NDescriptionsItem>
    </NDescriptions>
  </NModal>
</template>

<style scoped></style>
