<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import { $t, localizedText } from '@/locales';
import { fetchRoleAgentBinding, fetchUpdateRoleAgentBinding } from '@/service/api';
import AgentToolDetail from './agent-tool-detail.vue';

defineOptions({ name: 'AiAgentAuthModal' });

const props = withDefaults(defineProps<{ roleId: string; canOpenMenuAuth?: boolean }>(), {
  canOpenMenuAuth: false
});
const emit = defineEmits<{ openMenuAuth: [roleId: string] }>();
const visible = defineModel<boolean>('visible', { default: false });

const allAgents = shallowRef<Api.AiAgent.AgentRow[]>([]);
const checkedIds = shallowRef<string[]>([]);
const savedIds = shallowRef<string[]>([]);
const expandedAgentId = shallowRef('');
const aiChatEntryGranted = shallowRef(false);
const showSpin = shallowRef(false);
const saving = shallowRef(false);
const loadFailed = shallowRef(false);
const dirty = computed(() => [...checkedIds.value].sort().join(',') !== [...savedIds.value].sort().join(','));

function missingPermissionCount(agent: Api.AiAgent.AgentRow): number {
  return new Set(
    agent.tools.flatMap(tool =>
      tool.requiredPermissions.filter(permission => !permission.granted).map(item => item.code)
    )
  ).size;
}

function agentStatus(agent: Api.AiAgent.AgentRow): string {
  if (!agent.enabled) return $t('page.ai.aiAgentAuth.globalDisabled');
  if (agent.tools.length === 0) return $t('page.ai.aiAgentAuth.noTools');
  const missing = missingPermissionCount(agent);
  if (missing > 0) return $t('page.ai.aiAgentAuth.missingCount', { count: missing });
  if (agent.tools.some(tool => !tool.enabled)) return $t('page.ai.aiAgentAuth.toolDisabled');
  return $t('page.ai.aiAgentAuth.permissionsReady');
}

function toggleAgentDetail(agentId: string) {
  expandedAgentId.value = expandedAgentId.value === agentId ? '' : agentId;
}

async function loadBinding() {
  if (!props.roleId) return;
  showSpin.value = true;
  loadFailed.value = false;
  allAgents.value = [];
  checkedIds.value = [];
  savedIds.value = [];
  expandedAgentId.value = '';
  aiChatEntryGranted.value = false;
  try {
    const { error, data } = await fetchRoleAgentBinding(props.roleId);
    if (error || !data) {
      loadFailed.value = true;
      return;
    }
    allAgents.value = data.allAgents;
    checkedIds.value = [...data.boundAgentIds];
    savedIds.value = [...data.boundAgentIds];
    aiChatEntryGranted.value = data.aiChatEntryGranted;
  } catch {
    loadFailed.value = true;
  } finally {
    showSpin.value = false;
  }
}

async function handleSubmit(): Promise<boolean> {
  if (saving.value || showSpin.value || loadFailed.value) return false;
  saving.value = true;
  try {
    const { error } = await fetchUpdateRoleAgentBinding(props.roleId, checkedIds.value);
    if (error) return false;
    savedIds.value = [...checkedIds.value];
    window.$message?.success?.($t('common.modifySuccess'));
    visible.value = false;
    return true;
  } catch {
    return false;
  } finally {
    saving.value = false;
  }
}

function closeModal() {
  if (saving.value) return;
  if (dirty.value && window.$dialog) {
    window.$dialog.warning({
      title: $t('page.ai.aiAgentAuth.discardTitle'),
      content: $t('page.ai.aiAgentAuth.discardContent'),
      positiveText: $t('page.ai.aiAgentAuth.discard'),
      negativeText: $t('page.ai.aiAgentAuth.keepEditing'),
      onPositiveClick: () => {
        visible.value = false;
      }
    });
    return;
  }
  visible.value = false;
}

async function handleOpenMenuAuth() {
  if (!props.canOpenMenuAuth) return;
  if (dirty.value && !(await handleSubmit())) return;
  visible.value = false;
  emit('openMenuAuth', props.roleId);
}

watch(visible, show => {
  if (show) loadBinding();
});

defineExpose({ handleSubmit, checkedIds, allAgents });
</script>

<template>
  <NModal
    :show="visible"
    :title="$t('page.ai.aiAgentAuth.title')"
    preset="card"
    class="max-w-[calc(100vw-24px)]"
    :style="{ width: '720px' }"
    data-testid="role-ai-agent-modal"
    @update:show="
      value => {
        if (!value) closeModal();
      }
    "
  >
    <NSpin :show="showSpin">
      <div class="agent-auth-intro">{{ $t('page.ai.aiAgentAuth.guidance') }}</div>
      <div v-if="!showSpin && !loadFailed" class="agent-entry-status">
        <span class="agent-entry-dot" :class="{ 'agent-entry-dot-missing': !aiChatEntryGranted }" />
        {{ $t(aiChatEntryGranted ? 'page.ai.aiAgentAuth.entryGranted' : 'page.ai.aiAgentAuth.entryMissing') }}
      </div>
      <NAlert v-if="loadFailed" type="error" class="mb-12px">{{ $t('page.ai.aiAgentAuth.loadFailed') }}</NAlert>
      <div v-else class="agent-auth-list">
        <NCheckboxGroup v-model:value="checkedIds">
          <div v-for="agent in allAgents" :key="agent.agentId" class="agent-auth-row">
            <div class="agent-auth-row-main">
              <NCheckbox :value="agent.agentId" :data-testid="`role-agent-checkbox-${agent.code}`">
                {{ localizedText(agent.name, agent.i18nKeys?.name) }}
              </NCheckbox>
              <span
                class="agent-auth-status"
                :class="{ 'agent-auth-status-missing': agent.enabled && missingPermissionCount(agent) > 0 }"
              >
                {{ agentStatus(agent) }}
              </span>
              <NButton
                v-if="agent.tools.length > 0"
                text
                size="small"
                :data-testid="`agent-detail-${agent.code}`"
                :aria-label="`${$t(expandedAgentId === agent.agentId ? 'page.ai.aiAgentAuth.hideDetails' : 'page.ai.aiAgentAuth.details')} ${localizedText(agent.name, agent.i18nKeys?.name)}`"
                :aria-expanded="expandedAgentId === agent.agentId"
                @click="toggleAgentDetail(agent.agentId)"
              >
                {{
                  $t(
                    expandedAgentId === agent.agentId
                      ? 'page.ai.aiAgentAuth.hideDetails'
                      : 'page.ai.aiAgentAuth.details'
                  )
                }}
              </NButton>
            </div>
            <div v-if="expandedAgentId === agent.agentId" class="agent-auth-expanded">
              <AgentToolDetail :agent="agent" />
            </div>
          </div>
        </NCheckboxGroup>
        <NEmpty v-if="allAgents.length === 0 && !showSpin" :description="$t('page.ai.aiAgentAuth.noAgents')" />
      </div>
      <div class="agent-auth-note">{{ $t('page.ai.aiAgentAuth.rolePermissionsOnly') }}</div>
    </NSpin>
    <template #footer>
      <div class="flex flex-wrap items-center justify-between gap-12px">
        <NButton
          v-if="canOpenMenuAuth"
          size="small"
          :disabled="showSpin || saving || loadFailed"
          data-testid="role-agent-menu-auth"
          @click="handleOpenMenuAuth"
        >
          {{ $t(dirty ? 'page.ai.aiAgentAuth.saveThenMenuAuth' : 'page.ai.aiAgentAuth.menuAuth') }}
        </NButton>
        <span v-else />
        <div class="flex gap-8px">
          <NButton size="small" :disabled="saving" @click="closeModal">{{ $t('common.cancel') }}</NButton>
          <NButton
            type="primary"
            size="small"
            :loading="saving"
            :disabled="showSpin || loadFailed"
            data-testid="role-agent-submit"
            @click="handleSubmit"
          >
            {{ $t('common.confirm') }}
          </NButton>
        </div>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
.agent-auth-intro {
  margin-bottom: 12px;
  opacity: 0.72;
  font-size: 13px;
}

.agent-entry-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 13px;
}

.agent-entry-dot {
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: 50%;
  background: #18a058;
}

.agent-entry-dot-missing {
  background: #f0a020;
}

.agent-auth-list {
  max-height: min(58vh, 540px);
  overflow-y: auto;
  border-top: 1px solid var(--n-border-color);
  border-bottom: 1px solid var(--n-border-color);
}

.agent-auth-row {
  padding: 12px 4px;
}

.agent-auth-row + .agent-auth-row {
  border-top: 1px solid var(--n-border-color);
}

.agent-auth-row-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 16px;
}

.agent-auth-status {
  opacity: 0.72;
  font-size: 12px;
  white-space: nowrap;
}

.agent-auth-status-missing {
  color: #d03050;
  opacity: 1;
}

.agent-auth-expanded {
  margin: 12px 0 2px 24px;
}

.agent-auth-note {
  margin-top: 12px;
  opacity: 0.65;
  font-size: 12px;
}

@media (max-width: 640px) {
  .agent-auth-row-main {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 4px 12px;
  }

  .agent-auth-status {
    grid-column: 1;
    grid-row: 2;
    padding-left: 24px;
  }

  .agent-auth-expanded {
    margin-left: 0;
  }
}
</style>
