<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { fetchAgentAdminList, fetchGetUserInfo } from '@/service/api';
import { useAuthStore } from '@/store/modules/auth';
import { $t } from '@/locales';
import AgentOperateDrawer from './modules/agent-operate-drawer.vue';

const auth = useAuthStore();
const busy = ref(false);
const failed = ref(false);
const authorized = ref(false);
const keyword = ref('');
const agents = ref<Api.AiAgent.AdminListItem[]>([]);
const drawerVisible = ref(false);
const selected = ref<Api.AiAgent.AdminListItem | null>(null);
const filtered = computed(() =>
  agents.value.filter(a => `${a.name} ${a.code} ${a.description}`.toLowerCase().includes(keyword.value.toLowerCase()))
);
let sequence = 0;
function clearData() {
  sequence++;
  authorized.value = false;
  agents.value = [];
  selected.value = null;
  drawerVisible.value = false;
}
watch(() => [auth.token, auth.userInfo.userId, auth.userInfo.isSystemAdmin], clearData, { flush: 'sync' });
async function refresh() {
  if (busy.value) return;
  if (!auth.token || !auth.userInfo.isSystemAdmin) {
    clearData();
    return;
  }
  const current = ++sequence;
  busy.value = true;
  failed.value = false;
  try {
    const identity = await fetchGetUserInfo();
    if (current !== sequence) return;
    if (identity.error || !identity.data?.isSystemAdmin) {
      clearData();
      failed.value = Boolean(identity.error);
      if (identity.data) auth.userInfo.isSystemAdmin = false;
      return;
    }
    const result = await fetchAgentAdminList();
    if (current !== sequence) return;
    if (result.error || !result.data) {
      clearData();
      failed.value = true;
      return;
    }
    agents.value = result.data;
    authorized.value = true;
  } finally {
    busy.value = false;
  }
}
function openAgent(agent: Api.AiAgent.AdminListItem) {
  selected.value = agent;
  drawerVisible.value = true;
}
function onFocus() {
  void refresh();
}
onMounted(() => {
  void refresh();
  window.addEventListener('focus', onFocus);
});
onUnmounted(() => {
  clearData();
  window.removeEventListener('focus', onFocus);
});
</script>

<template>
  <div class="h-full overflow-auto space-y-4">
    <NCard :title="$t('page.ai.agent.title')">
      <NAlert v-if="!auth.userInfo.isSystemAdmin" type="error">{{ $t('platform.noPermission') }}</NAlert>
      <template v-else>
        <NAlert type="warning" class="mb-4">{{ $t('platform.scope') }}</NAlert>
        <div class="mb-4 flex flex-wrap gap-3">
          <NButton :loading="busy" @click="refresh">{{ $t('common.refresh') }}</NButton>
          <NInput
            v-model:value="keyword"
            class="max-w-400px"
            :placeholder="$t('common.keywordSearch')"
            :input-props="{ 'aria-label': $t('common.keywordSearch') }"
            clearable
          />
        </div>
        <NSpin :show="busy">
          <div v-if="authorized" class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <NCard v-for="agent in filtered" :key="agent.agentId" :title="agent.name">
              <template #header-extra>
                <NTag :type="agent.enabled ? 'success' : 'default'">
                  {{ $t(agent.enabled ? 'page.ai.agent.enabled' : 'page.ai.agent.disabled') }}
                </NTag>
              </template>
              <div class="mb-2 text-sm opacity-60">{{ agent.code }}</div>
              <p class="mb-4">{{ agent.description }}</p>
              <NButton @click="openAgent(agent)">{{ $t('common.edit') }}</NButton>
            </NCard>
          </div>
          <NEmpty v-if="authorized && !busy && !failed && !filtered.length" :description="$t('common.noData')" />
        </NSpin>
      </template>
      <NAlert v-if="failed" type="error">{{ $t('platform.requestFailed') }}</NAlert>
    </NCard>
    <AgentOperateDrawer
      v-if="authorized"
      v-model:visible="drawerVisible"
      :edit-row="selected"
      require-audit
      @submitted="refresh"
    />
  </div>
</template>
