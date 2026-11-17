<script setup lang="ts">
import { $t } from '@/locales';

defineOptions({
  name: 'OperationLogDetailModal'
});

interface Props {
  rowData?: Api.SystemManage.OperationLog | null;
}

defineProps<Props>();

const visible = defineModel<boolean>('visible', { default: false });
</script>

<template>
  <NModal v-model:show="visible" preset="card" :title="$t('page.system.operationLog.detailTitle')" class="w-600px">
    <template v-if="rowData">
      <NDescriptions label-placement="left" bordered :column="2" size="small">
        <NDescriptionsItem v-if="Object.hasOwn(rowData, 'username')" :label="$t('page.system.operationLog.username')">
          {{ rowData.username }}
        </NDescriptionsItem>
        <NDescriptionsItem v-if="Object.hasOwn(rowData, 'module')" :label="$t('page.system.operationLog.module')">
          {{ rowData.module }}
        </NDescriptionsItem>
        <NDescriptionsItem v-if="Object.hasOwn(rowData, 'action')" :label="$t('page.system.operationLog.action')">
          {{ rowData.action }}
        </NDescriptionsItem>
        <NDescriptionsItem v-if="Object.hasOwn(rowData, 'method')" :label="$t('page.system.operationLog.method')">
          {{ rowData.method }}
        </NDescriptionsItem>
        <NDescriptionsItem v-if="Object.hasOwn(rowData, 'path')" :label="$t('page.system.operationLog.path')" :span="2">
          {{ rowData.path }}
        </NDescriptionsItem>
        <NDescriptionsItem
          v-if="Object.hasOwn(rowData, 'statusCode')"
          :label="$t('page.system.operationLog.statusCode')"
        >
          {{ rowData.statusCode ?? '-' }}
        </NDescriptionsItem>
        <NDescriptionsItem v-if="Object.hasOwn(rowData, 'duration')" :label="$t('page.system.operationLog.duration')">
          {{ rowData.duration != null ? `${rowData.duration}ms` : '-' }}
        </NDescriptionsItem>
      </NDescriptions>
    </template>
  </NModal>
</template>

<style scoped></style>
