<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([GridComponent, LegendComponent, TooltipComponent, BarChart, PieChart, CanvasRenderer]);

type StatsGroup = { group: string; count: number };

const props = defineProps<{
  /** spec §2.9 stats 返回结构 [{group, count}] */
  data: StatsGroup[];
}>();

type TabKey = 'table' | 'bar' | 'pie';
const activeTab = ref<TabKey>('table');

const total = computed(() => props.data.reduce((sum, x) => sum + x.count, 0));

const labeled = computed(() =>
  props.data.map(d => ({
    raw: d.group,
    label: formatLabel(d.group),
    count: d.count,
    pct: total.value > 0 ? Math.round((d.count / total.value) * 100) : 0
  }))
);

function formatLabel(v: string): string {
  if (v === 'null' || v === '' || v === null) return '未知（未设置）';
  if (v === '1' || v === 'male') return '男';
  if (v === '2' || v === 'female') return '女';
  return v;
}

const barRef = ref<HTMLElement | null>(null);
const pieRef = ref<HTMLElement | null>(null);
let barChart: echarts.ECharts | null = null;
let pieChart: echarts.ECharts | null = null;

function renderBar() {
  if (!barRef.value) return;
  if (!barChart) barChart = echarts.init(barRef.value);
  barChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 30, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: labeled.value.map(d => d.label) },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'bar',
        data: labeled.value.map(d => d.count),
        itemStyle: { color: '#4d6bfe', borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', formatter: '{c}' }
      }
    ]
  });
  barChart.resize();
}

function renderPie() {
  if (!pieRef.value) return;
  if (!pieChart) pieChart = echarts.init(pieRef.value);
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, type: 'scroll' },
    series: [
      {
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        data: labeled.value.map(d => ({
          name: d.label,
          value: d.count,
          itemStyle: pickColor(d.raw)
        })),
        label: { formatter: '{b}\n{d}%' }
      }
    ]
  });
  pieChart.resize();
}

const PALETTE = ['#4d6bfe', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
function pickColor(raw: string): { color: string } {
  return { color: PALETTE[Math.abs(hashCode(raw)) % PALETTE.length] };
}
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

watch(activeTab, async tab => {
  if (tab === 'bar') {
    await nextTick();
    renderBar();
  } else if (tab === 'pie') {
    await nextTick();
    renderPie();
  }
});

/**
 * 容器宽度从 0 → 非 0 时重 render 当前 tab（修复父卡片折叠态导致 ECharts
 * init 时 width=0 → fallback 100px 的 bug）。
 *
 * 场景：chat-tool-call.vue 用 v-show 控制折叠，折叠时整个 stats-tabs 容器
 * display:none → width=0。用户展开卡片时父级从 display:none 变 visible，
 * ResizeObserver 触发，此时再 render ECharts 才能拿到正确宽度。
 */
useResizeObserver(barRef, entries => {
  const entry = entries[0];
  const width = entry.contentRect.width;
  if (width > 0 && activeTab.value === 'bar') {
    renderBar();
  }
});

useResizeObserver(pieRef, entries => {
  const entry = entries[0];
  const width = entry.contentRect.width;
  if (width > 0 && activeTab.value === 'pie') {
    renderPie();
  }
});

onUnmounted(() => {
  barChart?.dispose();
  pieChart?.dispose();
  barChart = null;
  pieChart = null;
});
</script>

<template>
  <div class="stats-tabs">
    <div class="stats-tab-header">
      <button class="stats-tab" :class="[{ active: activeTab === 'table' }]" @click="activeTab = 'table'">
        📋 表格
      </button>
      <button class="stats-tab" :class="[{ active: activeTab === 'bar' }]" @click="activeTab = 'bar'">📊 柱状图</button>
      <button class="stats-tab" :class="[{ active: activeTab === 'pie' }]" @click="activeTab = 'pie'">🥧 饼图</button>
    </div>
    <div class="stats-tab-body">
      <table v-if="activeTab === 'table'" class="stats-table">
        <tbody>
          <tr v-for="row in labeled" :key="row.raw">
            <td class="stats-label">{{ row.label }}</td>
            <td class="stats-count">
              <strong>{{ row.count }}</strong>
              <span class="stats-pct">· {{ row.pct }}%</span>
            </td>
          </tr>
          <tr class="stats-total">
            <td>合计</td>
            <td>
              <strong>{{ total }}</strong>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-show="activeTab === 'bar'" ref="barRef" class="stats-chart-box"></div>
      <div v-show="activeTab === 'pie'" ref="pieRef" class="stats-chart-box"></div>
    </div>
  </div>
</template>

<style scoped>
.stats-tabs {
  border: 1px solid var(--n-border-color, #e5e7eb);
  border-radius: 6px;
  overflow: hidden;
}
.stats-tab-header {
  display: flex;
  border-bottom: 1px solid var(--n-border-color, #e5e7eb);
  background: var(--n-color-embedded, #f4f4f5);
}
.stats-tab {
  flex: 1;
  padding: 6px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: var(--n-text-color-2, #6b7280);
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}
.stats-tab:hover {
  color: #4d6bfe;
}
.stats-tab.active {
  color: #4d6bfe;
  border-bottom-color: #4d6bfe;
  font-weight: 600;
}
.stats-tab-body {
  padding: 10px 12px;
  background: var(--n-color, #fff);
}
.stats-table {
  width: 100%;
  font-size: 12px;
  border-collapse: collapse;
}
.stats-table tr {
  border-bottom: 1px solid var(--n-border-color, #e5e7eb);
}
.stats-table tr:last-child {
  border-bottom: none;
}
.stats-table td {
  padding: 6px 10px;
}
.stats-label {
  color: var(--n-text-color-2, #6b7280);
}
.stats-count {
  text-align: right;
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 12px;
}
.stats-pct {
  color: var(--n-text-color-3, #9ca3af);
  font-size: 11px;
}
.stats-total td {
  font-weight: 600;
  color: var(--n-text-color, #1f1f1f);
  border-top: 1px dashed var(--n-border-color, #e5e7eb);
}
.stats-chart-box {
  width: 100%;
  height: 200px;
}

html.dark .stats-tab-header {
  background: rgba(255, 255, 255, 0.04);
}
html.dark .stats-tab-body {
  background: rgba(255, 255, 255, 0.03);
}
html.dark .stats-label {
  color: rgba(255, 255, 255, 0.65);
}
html.dark .stats-table tr {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}
html.dark .stats-total td {
  color: rgba(255, 255, 255, 0.88);
}
</style>
