<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, shallowRef } from 'vue';
import type { DataTableColumn } from 'naive-ui';
import {
  NButton,
  NCard,
  NCollapse,
  NCollapseItem,
  NDataTable,
  NDatePicker,
  NDescriptions,
  NDescriptionsItem,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NSpace,
  NTag
} from 'naive-ui';
import dayjs from 'dayjs';
import { fetchAiTraceDetail, fetchAiTraceList } from '@/service/api';
import { $t } from '@/locales';

defineOptions({ name: 'AiTrace' });

const initialTraceId = new URLSearchParams(window.location.search).get('traceId') || undefined;
const query = reactive<Api.AiTrace.ListQuery>({ current: 1, size: 20, traceId: initialTraceId });
const queuedRange = ref<[number, number] | null>(null);
const records = shallowRef<Api.AiTrace.Summary[]>([]);
const total = ref(0);
const loading = ref(false);
const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = shallowRef<Api.AiTrace.Detail | null>(null);

const statusOptions = computed(() =>
  ['running', 'pending_confirmation', 'success', 'failed', 'rejected', 'expired'].map(value => ({
    label: value,
    value
  }))
);

function formatTime(value: string | null | undefined) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';
}

function formatTargets(targets: Api.AiTrace.Target[]) {
  return targets.length ? targets.map(target => `${target.type}:${target.id}`).join(', ') : '-';
}

async function loadList() {
  loading.value = true;
  const { error, data } = await fetchAiTraceList({
    ...query,
    traceId: query.traceId || undefined,
    actorId: query.actorId || undefined,
    agentCode: query.agentCode || undefined,
    toolName: query.toolName || undefined,
    status: query.status || undefined,
    queuedFrom: queuedRange.value?.[0],
    queuedTo: queuedRange.value?.[1]
  });
  if (!error) {
    records.value = data.records;
    total.value = data.total;
  }
  loading.value = false;
}

function search() {
  query.current = 1;
  loadList();
}

function reset() {
  Object.assign(query, { current: 1, size: query.size });
  queuedRange.value = null;
  loadList();
}

async function openTrace(traceId: string) {
  detailVisible.value = true;
  detailLoading.value = true;
  detail.value = null;
  const { error, data } = await fetchAiTraceDetail(traceId);
  if (!error) detail.value = data;
  detailLoading.value = false;
}

function onPageChange(page: number) {
  query.current = page;
  loadList();
}

function onPageSizeChange(pageSize: number) {
  query.size = pageSize;
  query.current = 1;
  loadList();
}

const columns = computed<DataTableColumn<Api.AiTrace.Summary>[]>(() => [
  { title: $t('page.ai.trace.traceId'), key: 'traceId', minWidth: 210 },
  { title: $t('page.ai.trace.actor'), key: 'actorName', width: 130 },
  {
    title: $t('page.ai.trace.agent'),
    key: 'agentCodes',
    render: row => row.agentCodes.join(', ')
  },
  {
    title: $t('page.ai.trace.tool'),
    key: 'toolNames',
    render: row => row.toolNames.join(', ')
  },
  {
    title: $t('page.ai.trace.status'),
    key: 'statuses',
    render: row => h(NSpace, { size: 4 }, () => row.statuses.map(status => h(NTag, { size: 'small' }, () => status)))
  },
  { title: $t('page.ai.trace.operationCount'), key: 'operationCount', width: 100 },
  {
    title: $t('page.ai.trace.queuedAt'),
    key: 'queuedAt',
    width: 180,
    render: row => formatTime(row.queuedAt)
  },
  {
    title: $t('page.ai.trace.actions'),
    key: 'actions',
    width: 100,
    render: row =>
      h(NButton, { text: true, type: 'primary', onClick: () => openTrace(row.traceId) }, () =>
        $t('page.ai.trace.detail')
      )
  }
]);

onMounted(loadList);

defineExpose({ openTrace, query });
</script>

<template>
  <NSpace vertical :size="16">
    <NCard :title="$t('page.ai.trace.filters')">
      <NForm inline :show-feedback="false">
        <NFormItem :label="$t('page.ai.trace.traceId')">
          <NInput v-model:value="query.traceId" clearable />
        </NFormItem>
        <NFormItem :label="$t('page.ai.trace.actorId')">
          <NInput v-model:value="query.actorId" clearable />
        </NFormItem>
        <NFormItem :label="$t('page.ai.trace.agent')">
          <NInput v-model:value="query.agentCode" clearable />
        </NFormItem>
        <NFormItem :label="$t('page.ai.trace.tool')">
          <NInput v-model:value="query.toolName" clearable />
        </NFormItem>
        <NFormItem :label="$t('page.ai.trace.status')">
          <NSelect v-model:value="query.status" :options="statusOptions" clearable class="w-40" />
        </NFormItem>
        <NFormItem :label="$t('page.ai.trace.queuedAt')">
          <NDatePicker v-model:value="queuedRange" type="datetimerange" clearable />
        </NFormItem>
        <NFormItem>
          <NSpace>
            <NButton type="primary" @click="search">{{ $t('page.ai.trace.search') }}</NButton>
            <NButton @click="reset">{{ $t('page.ai.trace.reset') }}</NButton>
          </NSpace>
        </NFormItem>
      </NForm>
    </NCard>

    <NCard :title="$t('page.ai.trace.title')" data-testid="ai-trace-list">
      <NDataTable
        remote
        :columns="columns"
        :data="records"
        :loading="loading"
        :pagination="{
          page: query.current,
          pageSize: query.size,
          itemCount: total,
          showSizePicker: true,
          pageSizes: [10, 20, 50, 100]
        }"
        @update:page="onPageChange"
        @update:page-size="onPageSizeChange"
      />
    </NCard>

    <NDrawer v-model:show="detailVisible" :width="720" data-testid="ai-trace-detail">
      <NDrawerContent :title="$t('page.ai.trace.detail')" :native-scrollbar="false">
        <div v-if="detailLoading">{{ $t('page.ai.trace.loading') }}</div>
        <template v-else-if="detail">
          <NDescriptions bordered :column="1" class="mb-4">
            <NDescriptionsItem :label="$t('page.ai.trace.traceId')">{{ detail.traceId }}</NDescriptionsItem>
            <NDescriptionsItem :label="$t('page.ai.trace.conversationId')">
              {{ detail.conversationId }}
            </NDescriptionsItem>
          </NDescriptions>
          <NCollapse :default-expanded-names="detail.operations.map(operation => operation.logId)">
            <NCollapseItem
              v-for="operation in detail.operations"
              :key="operation.logId"
              :title="`${operation.toolName} · ${operation.status}`"
              :name="operation.logId"
            >
              <NDescriptions bordered :column="1" label-placement="left">
                <NDescriptionsItem :label="$t('page.ai.trace.agent')">{{ operation.agentCode }}</NDescriptionsItem>
                <NDescriptionsItem :label="$t('page.ai.trace.actor')">
                  {{ operation.actorName || operation.actorId }}
                </NDescriptionsItem>
                <NDescriptionsItem :label="$t('page.ai.trace.sourceMessage')">
                  {{ operation.sourceMessageRole || '-' }} · {{ operation.sourceMessageId || '-' }} ·
                  {{ formatTime(operation.sourceMessageAt) }}
                </NDescriptionsItem>
                <NDescriptionsItem :label="$t('page.ai.trace.targets')">
                  {{ formatTargets(operation.targetSummary) }}
                </NDescriptionsItem>
                <NDescriptionsItem :label="$t('page.ai.trace.lifecycle')">
                  {{ operation.executionMode }} · {{ operation.riskLevel }} · {{ operation.status }}
                </NDescriptionsItem>
                <NDescriptionsItem :label="$t('page.ai.trace.confirmationId')">
                  {{ operation.confirmationId || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem :label="$t('page.ai.trace.errorCode')">
                  {{ operation.errorCode || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem :label="$t('page.ai.trace.duration')">
                  {{ operation.durationMs ?? '-' }} ms
                </NDescriptionsItem>
                <NDescriptionsItem :label="$t('page.ai.trace.queuedAt')">
                  {{ formatTime(operation.queuedAt) }}
                </NDescriptionsItem>
                <NDescriptionsItem :label="$t('page.ai.trace.finishedAt')">
                  {{ formatTime(operation.finishedAt) }}
                </NDescriptionsItem>
              </NDescriptions>
            </NCollapseItem>
          </NCollapse>
        </template>
      </NDrawerContent>
    </NDrawer>
  </NSpace>
</template>
