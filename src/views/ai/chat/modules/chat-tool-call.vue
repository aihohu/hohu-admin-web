<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import ChatToolStatsTabs from './chat-tool-stats-tabs.vue';

const props = defineProps<{
  /** tool_call_started 事件（含 tool/toolCallId/summary/args/risk） */
  started: Api.Ai.ToolCallStartedEvent;
  /** 配对的 tool_call_result 事件（可选，未完成时为 null） */
  result?: Api.Ai.ToolCallResultEvent | null;
  /** §12 场景 4: HITL pending 状态（卡片嵌入倒计时 bar） */
  isPending?: boolean;
  /** HITL pending 过期时间 ISO 8601 UTC */
  pendingExpiresAt?: string;
}>();

const emit = defineEmits<{
  approve: [];
  reject: [];
}>();

// spec §12 prototype tool desc 中文映射；未知 tool 显示空（head 不渲染）
const TOOL_DESC: Record<string, string> = {
  'user.lookup': '查询用户信息',
  'user.list': '查询用户列表',
  'user.create': '创建用户',
  'user.update_dept': '调整用户部门',
  'user.update_email': '修改用户邮箱',
  'user.batch_delete': '批量删除用户',
  'user.reset_password': '重置用户密码',
  'user.disable': '禁用用户',
  'user.enable': '启用用户',
  'user.distinct': '查询不重复字段值',
  'user.stats': '按维度分组统计',
  'dept.export_members': '导出部门成员',
  'role.bind_menus': '给角色绑定菜单'
};

const toolDesc = computed(() => TOOL_DESC[props.started.tool] || '');

// ===== 状态映射（spec §12 卡片视觉）=====
type CardStatus = 'running' | 'success' | 'failed' | 'pending';

const cardStatus = computed<CardStatus>(() => {
  if (props.isPending) return 'pending';
  if (!props.result) return 'running';
  return props.result.ok ? 'success' : 'failed';
});

const iconChar = computed(() => {
  if (cardStatus.value === 'running') return '⟳';
  if (cardStatus.value === 'success') return '✓';
  if (cardStatus.value === 'pending') return '⚠';
  return '×';
});

const errorCodeFriendly = computed(() => {
  const code = props.result?.errorCode;
  if (!code) return '内部错误';
  const map: Record<string, string> = {
    AI_TOOL_NOT_FOUND: '工具不可用',
    AI_TOOL_PERM_DENIED: '权限不足',
    AI_DATA_SCOPE_VIOLATION: '目标不在可见范围',
    AI_RATE_LIMIT_USER_WRITE: '操作过于频繁',
    AI_DAILY_QUOTA_EXHAUSTED: '今日额度已用尽',
    AI_TOOL_TIMEOUT: '操作超时',
    AI_REPEATED_FAILURE: '连续失败',
    AI_INTERNAL_ERROR: '内部错误',
    AI_HITL_EXPIRED: '确认已超时',
    USER_REJECTED: '已取消',
    AI_STATS_FIELD_NOT_ALLOWED: '字段不在白名单'
  };
  return map[code] || code;
});

const statusText = computed(() => {
  if (props.isPending) return '等待你确认';
  if (!props.result) return '执行中……';
  if (props.result.ok) {
    const dur = props.result.durationMs ?? 0;
    if (props.result.affectedRows != null) {
      return `已执行 · ${dur}ms · ${props.result.affectedRows} 行`;
    }
    return `已执行 · ${dur}ms`;
  }
  return `失败 · ${errorCodeFriendly.value}`;
});

const expanded = ref(false);

const argsEntries = computed<[string, unknown][]>(() => {
  if (!props.started.args || typeof props.started.args !== 'object') return [];
  return Object.entries(props.started.args);
});

function formatValue(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

const resultJson = computed(() => {
  if (!props.result?.result) return '';
  try {
    return JSON.stringify(props.result.result, null, 2);
  } catch {
    return String(props.result.result);
  }
});

// §12 场景 13: stats tool 返回 [{group, count}]，渲染三 tab 图表
type StatsGroup = { group: string; count: number };

const statsData = computed<StatsGroup[] | null>(() => {
  if (props.started.tool !== 'user.stats') return null;
  if (!props.result?.ok) return null;
  const data = props.result.result;
  if (!Array.isArray(data)) return null;
  return data.filter(
    (x): x is StatsGroup =>
      x != null && typeof x === 'object' && 'group' in x && 'count' in x && typeof x.count === 'number'
  );
});

// §8.7 chip 跳转：readonly tool 成功后展示 chip，跳到模块页带 ai_query_id
const CHIP_TARGETS: Record<string, string> = {
  'user.list': '/system/user',
  'user.count': '/system/user',
  'user.distinct': '/system/user',
  'role.count': '/system/role'
};

const chipTarget = computed<string | null>(() => {
  if (!props.result?.ok) return null;
  if (!props.started.traceId) return null;
  // stats tool 不显示 chip（数据已在卡片内）
  if (props.started.tool === 'user.stats') return null;
  return CHIP_TARGETS[props.started.tool] ?? null;
});

const chipHref = computed(() => {
  if (!chipTarget.value || !props.started.traceId) return null;
  return `${chipTarget.value}?ai_query_id=${encodeURIComponent(props.started.traceId)}`;
});

// §12 场景 4/5: HITL 倒计时（基于 expiresAt，每秒更新）
const URGENT_THRESHOLD_SEC = 30;
const remainingSec = ref(0);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

const isUrgent = computed(() => remainingSec.value > 0 && remainingSec.value < URGENT_THRESHOLD_SEC);

const formattedTime = computed(() => {
  const sec = Math.max(0, remainingSec.value);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

function startCountdown() {
  stopCountdown();
  if (!props.pendingExpiresAt) return;
  const expiresMs = Date.parse(props.pendingExpiresAt);
  if (Number.isNaN(expiresMs)) return;
  const tick = () => {
    remainingSec.value = Math.floor((expiresMs - Date.now()) / 1000);
  };
  tick();
  countdownTimer = setInterval(tick, 1000);
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

watch(
  () => props.isPending,
  v => {
    if (v) startCountdown();
    else stopCountdown();
  },
  { immediate: true }
);

onUnmounted(() => stopCountdown());

function onApprove() {
  emit('approve');
}

function onReject() {
  emit('reject');
}
</script>

<template>
  <div class="tool-card" :data-status="cardStatus">
    <div class="tool-card-head" @click="expanded = !expanded">
      <div class="tool-icon" :class="`tool-icon--${cardStatus}`">{{ iconChar }}</div>
      <span class="tool-name">{{ started.tool }}</span>
      <span v-if="toolDesc" class="tool-desc">{{ toolDesc }}</span>
      <span v-if="started.risk" class="tool-meta">
        <span class="risk-badge" :class="`risk-badge--${started.risk}`">{{ started.risk }}</span>
      </span>
      <span class="tool-status" :class="`tool-status--${cardStatus}`">
        <span class="dot"></span>
        <span class="tool-status-text">{{ statusText }}</span>
      </span>
      <span class="tool-chev" :class="{ rotated: expanded }">▶</span>
    </div>

    <div v-show="expanded" class="tool-card-body">
      <div class="tool-section">
        <div class="tool-section-title">
          参数
          <span class="hint">· args_summary（仅元信息）</span>
        </div>
        <div class="summary-line">{{ started.summary }}</div>
        <table v-if="argsEntries.length > 0" class="kv-table">
          <tr v-for="[key, value] in argsEntries" :key="key">
            <td class="kv-key">{{ key }}</td>
            <td class="kv-val">
              <code>{{ formatValue(value) }}</code>
            </td>
          </tr>
        </table>
      </div>
      <div v-if="result && result.ok && statsData" class="tool-section">
        <div class="tool-section-title">
          数据视图
          <span class="hint">· §2.9 stats 例外</span>
        </div>
        <ChatToolStatsTabs :data="statsData" />
      </div>
      <div v-else-if="result && result.ok" class="tool-section">
        <div class="tool-section-title">
          结果摘要
          <span class="hint">· result</span>
        </div>
        <pre class="tool-pre">{{ resultJson }}</pre>
      </div>
      <div v-if="result && !result.ok" class="tool-section tool-error">
        <div class="tool-section-title">错误</div>
        <div class="tool-error-code">{{ result.errorCode }}</div>
        <div v-if="result.errorMsg" class="tool-error-msg">{{ result.errorMsg }}</div>
      </div>
    </div>

    <!-- §8.7 chip 跳转：readonly tool 成功后展示 -->
    <div v-if="chipHref" class="chip-row">
      <a class="chip-link" :href="chipHref">📊 查看完整数据 →</a>
      <span class="chip-hint">跳转到「用户管理」页（已带筛选回放）</span>
    </div>

    <!-- §12 场景 4/5: HITL pending 内联倒计时 bar -->
    <div v-if="isPending" class="hitl-bar">
      <span>⏱</span>
      <span>剩余</span>
      <span class="timer" :class="{ urgent: isUrgent }">{{ formattedTime }}</span>
      <span class="hitl-hint">{{ isUrgent ? '即将超时' : '5 分钟后自动取消' }}</span>
      <div class="hitl-action">
        <button class="btn-mini btn-mini-ghost" @click.stop="onReject">取消</button>
        <button class="btn-mini btn-mini-primary" @click.stop="onApprove">立即确认</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-card {
  background: var(--n-color, #fff);
  border: 1px solid var(--n-border-color, #e5e7eb);
  border-radius: 8px;
  font-size: 13px;
  overflow: hidden;
  position: relative;
}

/* spec §12: 左侧 3px 状态色条 */
.tool-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
}
.tool-card[data-status='running']::before {
  background: #4d6bfe;
}
.tool-card[data-status='success']::before {
  background: #10b981;
}
.tool-card[data-status='failed']::before {
  background: #ef4444;
}
.tool-card[data-status='pending']::before {
  background: #f59e0b;
}

.tool-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
}
.tool-card-head:hover {
  background: rgba(0, 0, 0, 0.02);
}

.tool-icon {
  width: 22px;
  height: 22px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
  font-weight: 600;
}
.tool-icon--running {
  background: rgba(77, 107, 254, 0.08);
  color: #4d6bfe;
}
.tool-icon--success {
  background: rgba(16, 185, 129, 0.08);
  color: #10b981;
}
.tool-icon--failed {
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
}
.tool-icon--pending {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.tool-name {
  font-weight: 500;
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  color: var(--n-text-color, #1f1f1f);
}

.tool-desc {
  color: var(--n-text-color-2, #6b7280);
  font-size: 12px;
  margin-left: 4px;
}

.tool-meta {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 11px;
  color: var(--n-text-color-3, #9ca3af);
  padding: 2px 6px;
  background: var(--n-color-embedded, #f4f4f5);
  border-radius: 10px;
  margin-left: 6px;
}

.risk-badge {
  font-weight: 600;
  padding: 0 4px;
}
.risk-badge--low {
  color: #10b981;
}
.risk-badge--high {
  color: #f59e0b;
}
.risk-badge--destructive {
  color: #ef4444;
}

.tool-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--n-text-color-2, #6b7280);
  margin-left: auto;
  padding-right: 8px;
}
.tool-status .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.tool-status--running .dot {
  background: #4d6bfe;
  animation: pulse 1.4s infinite;
}
.tool-status--success .dot {
  background: #10b981;
}
.tool-status--failed .dot {
  background: #ef4444;
}
.tool-status--pending .dot {
  background: #f59e0b;
  animation: pulse 1.4s infinite;
}

.tool-status-text {
  color: var(--n-text-color-2, #6b7280);
}
.tool-status--running .tool-status-text {
  color: #4d6bfe;
}
.tool-status--success .tool-status-text {
  color: #10b981;
}
.tool-status--failed .tool-status-text {
  color: #ef4444;
}
.tool-status--pending .tool-status-text {
  color: #f59e0b;
}

.tool-chev {
  color: var(--n-text-color-3, #9ca3af);
  transition: transform 0.2s;
  font-size: 10px;
}
.tool-chev.rotated {
  transform: rotate(90deg);
}

/* Body */
.tool-card-body {
  border-top: 1px solid var(--n-border-color, #e5e7eb);
  padding: 12px;
  background: var(--n-color-embedded, #f5f7fb);
}

.tool-section {
  margin-bottom: 12px;
}
.tool-section:last-child {
  margin-bottom: 0;
}

.tool-section-title {
  font-size: 11px;
  color: var(--n-text-color-3, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.tool-section-title .hint {
  color: var(--n-text-color-3, #9ca3af);
  font-size: 10px;
  font-weight: normal;
  text-transform: none;
  letter-spacing: 0;
}

.summary-line {
  font-size: 11px;
  color: var(--n-text-color-3, #9ca3af);
  font-family: 'Menlo', 'Consolas', monospace;
  margin-bottom: 6px;
}

.kv-table {
  width: 100%;
  font-size: 12px;
  border-collapse: collapse;
  background: var(--n-color, #fff);
  border-radius: 6px;
  overflow: hidden;
}
.kv-table tr {
  border-bottom: 1px solid var(--n-border-color, #e5e7eb);
}
.kv-table tr:last-child {
  border-bottom: none;
}
.kv-table td {
  padding: 6px 10px;
  vertical-align: top;
}
.kv-key {
  width: 35%;
  color: var(--n-text-color-2, #6b7280);
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 11px;
}
.kv-val {
  color: var(--n-text-color, #1f1f1f);
  word-break: break-all;
}
.kv-val code {
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 11px;
}

.tool-pre {
  margin: 0;
  padding: 8px;
  background: #1a1b26;
  color: #a9b1d6;
  border-radius: 4px;
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 11px;
  line-height: 1.5;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
}

.tool-error {
  padding: 8px;
  background: rgba(239, 68, 68, 0.08);
  border-radius: 4px;
}

.tool-error-code {
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  color: #ef4444;
  font-weight: 500;
}

.tool-error-msg {
  font-size: 12px;
  color: var(--n-text-color-2, #6b7280);
  margin-top: 4px;
}

/* §8.7 chip 跳转行 */
.chip-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  flex-wrap: wrap;
  border-top: 1px solid var(--n-border-color, #e5e7eb);
}
.chip-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  background: var(--n-color, #fff);
  border: 1px solid #4d6bfe;
  border-radius: 14px;
  font-size: 12px;
  color: #4d6bfe;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s;
  font-weight: 500;
}
.chip-link:hover {
  background: #4d6bfe;
  color: #fff;
}
.chip-hint {
  font-size: 11px;
  color: var(--n-text-color-3, #9ca3af);
}

/* §12 场景 4/5: HITL 内联 bar */
.hitl-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.1);
  border-top: 1px solid rgba(245, 158, 11, 0.2);
  font-size: 12px;
  color: var(--n-text-color-2, #6b7280);
}
.hitl-bar .timer {
  font-family: 'Menlo', 'Consolas', monospace;
  font-weight: 600;
  color: #f59e0b;
}
.hitl-bar .timer.urgent {
  color: #ef4444;
}
.hitl-bar .hitl-hint {
  color: var(--n-text-color-3, #9ca3af);
  font-size: 11px;
}
.hitl-action {
  margin-left: auto;
  display: flex;
  gap: 6px;
}
.btn-mini {
  padding: 4px 10px;
  border-radius: 4px;
  border: none;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-mini-primary {
  background: #10b981;
  color: #fff;
}
.btn-mini-primary:hover {
  background: #059669;
}
.btn-mini-ghost {
  background: transparent;
  color: var(--n-text-color-2, #6b7280);
  border: 1px solid var(--n-border-color, #d1d5db);
}
.btn-mini-ghost:hover {
  background: rgba(0, 0, 0, 0.04);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

html.dark .tool-card {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
}
html.dark .tool-name {
  color: rgba(255, 255, 255, 0.88);
}
html.dark .tool-desc,
html.dark .tool-section-title {
  color: rgba(255, 255, 255, 0.45);
}
html.dark .tool-status-text,
html.dark .kv-key,
html.dark .summary-line {
  color: rgba(255, 255, 255, 0.65);
}
html.dark .kv-val {
  color: rgba(255, 255, 255, 0.88);
}
html.dark .tool-error-msg {
  color: rgba(255, 255, 255, 0.65);
}
html.dark .kv-table {
  background: rgba(255, 255, 255, 0.03);
}
html.dark .kv-table tr {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}
</style>
