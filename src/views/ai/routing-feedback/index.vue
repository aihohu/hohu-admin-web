<script setup lang="ts">
import { computed, h, onMounted, ref, shallowRef, watch } from 'vue';
import { NCard, NDataTable, NInput, NRadio, NRadioGroup, NSpace, NStatistic, NGrid, NGridItem } from 'naive-ui';
import type { DataTableColumn } from 'naive-ui';
import dayjs from 'dayjs';
import { fetchRoutingFeedbackList, fetchRoutingFeedbackSummary } from '@/service/api';

defineOptions({
  name: 'AiRoutingFeedback'
});

const days = ref<7 | 30>(7);
const originalAgent = ref<string>('');
const correctedAgent = ref<string>('');

const summary = shallowRef<Api.AiRoutingFeedback.Summary | null>(null);
const summaryLoading = shallowRef(false);

async function loadSummary() {
  summaryLoading.value = true;
  const { error, data } = await fetchRoutingFeedbackSummary(days.value);
  if (!error) {
    summary.value = data;
  }
  summaryLoading.value = false;
}

const listData = shallowRef<Api.AiRoutingFeedback.ListItem[]>([]);
const listLoading = shallowRef(false);
const current = ref(1);
const size = ref(20);
const total = ref(0);

async function loadList() {
  listLoading.value = true;
  const { error, data } = await fetchRoutingFeedbackList({
    days: days.value,
    current: current.value,
    size: size.value,
    feedback: 'wrong',
    originalAgent: originalAgent.value || undefined,
    correctedAgent: correctedAgent.value || undefined
  });
  if (!error) {
    listData.value = data.records;
    total.value = data.total;
  }
  listLoading.value = false;
}

const columns = computed<DataTableColumn<Api.AiRoutingFeedback.ListItem>[]>(() => [
  {
    title: '时间',
    key: 'createTime',
    width: 180,
    render: (row: Api.AiRoutingFeedback.ListItem) =>
      row.createTime ? dayjs(row.createTime).format('YYYY-MM-DD HH:mm:ss') : '-'
  },
  { title: '用户', key: 'userName', width: 120 },
  {
    title: '原 Agent → 纠正 Agent',
    key: 'agentFlow',
    render: (row: Api.AiRoutingFeedback.ListItem) => `${row.originalAgentName} → ${row.correctedAgentName || '-'}`
  },
  {
    title: 'TraceId',
    key: 'traceId',
    width: 200,
    render: (row: Api.AiRoutingFeedback.ListItem) =>
      row.traceId
        ? h(
            'a',
            {
              class: 'text-primary underline cursor-pointer',
              onClick: () => {
                window.open(`/monitor/operation-log?traceId=${row.traceId}`, '_blank');
              }
            },
            `${row.traceId.slice(0, 8)}...`
          )
        : '-'
  }
]);

const topWrongColumns: DataTableColumn<Api.AiRoutingFeedback.TopWrongAgent>[] = [
  { title: 'Agent', key: 'agentName' },
  { title: '错路由数', key: 'wrongCount', width: 120 },
  {
    title: '最常被纠正到',
    key: 'topCorrected',
    render: (row: Api.AiRoutingFeedback.TopWrongAgent) =>
      row.topCorrected ? `${row.topCorrected.name} (${row.topCorrected.count})` : '-'
  }
];

const wrongRateDisplay = computed(() => {
  if (!summary.value) return '0%';
  return `${(summary.value.wrongRate * 100).toFixed(1)}%`;
});

watch(days, () => {
  current.value = 1;
  loadSummary();
  loadList();
});

watch([originalAgent, correctedAgent], () => {
  current.value = 1;
  loadList();
});

function onPageChange(p: number) {
  current.value = p;
  loadList();
}

function onPageSizeChange(s: number) {
  size.value = s;
  current.value = 1;
  loadList();
}

onMounted(() => {
  loadSummary();
  loadList();
});

defineExpose({ days });
</script>

<template>
  <NSpace vertical :size="16">
    <NCard title="筛选">
      <NSpace align="center">
        <span>时间范围：</span>
        <NRadioGroup v-model:value="days">
          <NRadio :value="7">最近 7 天</NRadio>
          <NRadio :value="30">最近 30 天</NRadio>
        </NRadioGroup>
      </NSpace>
    </NCard>

    <NCard title="概览">
      <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen">
        <NGridItem>
          <NStatistic label="反馈总数" :value="summary?.total ?? 0" :loading="summaryLoading" />
        </NGridItem>
        <NGridItem>
          <NStatistic label="正确路由" :value="summary?.correct ?? 0" :loading="summaryLoading" />
        </NGridItem>
        <NGridItem>
          <NStatistic label="错误路由" :value="summary?.wrong ?? 0" :loading="summaryLoading" />
        </NGridItem>
        <NGridItem>
          <NStatistic label="错误率" :value="wrongRateDisplay" :loading="summaryLoading" />
        </NGridItem>
      </NGrid>
    </NCard>

    <NCard title="高频错误 Agent TOP10">
      <NDataTable :columns="topWrongColumns" :data="summary?.topWrongAgents ?? []" :loading="summaryLoading" />
    </NCard>

    <NCard title="错误反馈明细">
      <NSpace align="center" :size="12" class="mb-3">
        <NInput v-model:value="originalAgent" placeholder="原 Agent 名称/编码" clearable style="width: 200px" />
        <NInput v-model:value="correctedAgent" placeholder="纠正到 Agent 名称/编码" clearable style="width: 200px" />
      </NSpace>
      <NDataTable
        :columns="columns"
        :data="listData"
        :loading="listLoading"
        remote
        :pagination="{
          page: current,
          pageSize: size,
          itemCount: total,
          showSizePicker: true,
          pageSizes: [10, 20, 50]
        }"
        @update:page="onPageChange"
        @update:page-size="onPageSizeChange"
      />
    </NCard>
  </NSpace>
</template>
