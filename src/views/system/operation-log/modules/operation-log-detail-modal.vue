<script setup lang="ts">
import { computed } from 'vue';
import { $t } from '@/locales';

defineOptions({
  name: 'OperationLogDetailModal'
});

interface Props {
  rowData?: Api.SystemManage.OperationLog | null;
}

const props = defineProps<Props>();

const visible = defineModel<boolean>('visible', { default: false });

const parsedParams = computed(() => {
  if (!props.rowData?.requestParams) return null;
  try {
    return JSON.stringify(JSON.parse(props.rowData.requestParams), null, 2);
  } catch {
    return props.rowData.requestParams;
  }
});
</script>

<template>
  <NModal v-model:show="visible" preset="card" :title="$t('page.system.operationLog.detailTitle')" class="w-600px">
    <template v-if="rowData">
      <NDescriptions label-placement="left" bordered :column="2" size="small">
        <NDescriptionsItem :label="$t('page.system.operationLog.username')">
          {{ rowData.username }}
        </NDescriptionsItem>
        <NDescriptionsItem :label="$t('page.system.operationLog.module')">
          {{ rowData.module }}
        </NDescriptionsItem>
        <NDescriptionsItem :label="$t('page.system.operationLog.action')">
          {{ rowData.action }}
        </NDescriptionsItem>
        <NDescriptionsItem :label="$t('page.system.operationLog.method')">
          {{ rowData.method }}
        </NDescriptionsItem>
        <NDescriptionsItem :label="$t('page.system.operationLog.path')" :span="2">
          {{ rowData.path }}
        </NDescriptionsItem>
        <NDescriptionsItem :label="$t('page.system.operationLog.statusCode')">
          {{ rowData.statusCode ?? '-' }}
        </NDescriptionsItem>
        <NDescriptionsItem :label="$t('page.system.operationLog.duration')">
          {{ rowData.duration != null ? `${rowData.duration}ms` : '-' }}
        </NDescriptionsItem>
      </NDescriptions>
      <NDivider v-if="parsedParams" style="margin: 16px 0 8px">
        {{ $t('page.system.operationLog.requestParams') }}
      </NDivider>
      <NCode
        v-if="parsedParams"
        :code="parsedParams"
        language="json"
        word-wrap
      />
      <NEmpty
        v-else
        :description="$t('page.system.operationLog.noParams')"
        style="margin-top: 16px"
      />
    </template>
  </NModal>
</template>

<style scoped></style>
