<script setup lang="ts">
import { $t } from '@/locales';

defineProps<{ agent: Api.AiAgent.AgentRow }>();
</script>

<template>
  <section class="tool-detail" data-testid="role-agent-tool-detail">
    <NEmpty v-if="agent.tools.length === 0" :description="$t('page.ai.aiAgentAuth.noTools')" class="py-16px" />
    <template v-else>
      <div class="tool-detail-head">
        <span>{{ $t('page.ai.aiAgentAuth.toolName') }}</span>
        <span>{{ $t('page.ai.aiAgentAuth.requiredMenuPermissions') }}</span>
      </div>
      <div v-for="tool in agent.tools" :key="tool.name" class="tool-detail-row">
        <div class="tool-identity">
          <strong class="tool-name">{{ tool.name }}</strong>
          <span class="tool-kind">
            {{ $t(tool.readonly ? 'page.ai.aiAgentAuth.readonlyTool' : 'page.ai.aiAgentAuth.writeTool') }}
          </span>
          <span v-if="!tool.enabled" class="tool-disabled">{{ $t('page.ai.aiAgentAuth.toolDisabled') }}</span>
        </div>
        <div class="tool-permissions">
          <div v-for="permission in tool.requiredPermissions" :key="permission.code" class="tool-permission">
            <code>{{ permission.code }}</code>
            <span :class="permission.granted ? 'permission-granted' : 'permission-missing'">
              {{
                $t(
                  permission.granted ? 'page.ai.aiAgentAuth.permissionGranted' : 'page.ai.aiAgentAuth.permissionMissing'
                )
              }}
            </span>
          </div>
          <span v-if="tool.requiredPermissions.length === 0" class="tool-empty-permission">
            {{ $t('page.ai.aiAgentAuth.noExtraPermission') }}
          </span>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.tool-detail {
  font-size: 12px;
}

.tool-detail-head,
.tool-detail-row {
  display: grid;
  grid-template-columns: minmax(150px, 34%) minmax(0, 1fr);
  gap: 16px;
}

.tool-detail-head {
  padding: 7px 12px;
  background: rgb(128 128 128 / 8%);
  opacity: 0.72;
}

.tool-detail-row {
  padding: 10px 12px;
  border-bottom: 1px solid var(--n-border-color);
}

.tool-detail-row:last-child {
  border-bottom: 0;
}

.tool-identity,
.tool-permissions {
  min-width: 0;
}

.tool-name {
  display: block;
  overflow-wrap: anywhere;
  font-size: 13px;
  font-weight: 600;
}

.tool-kind,
.tool-disabled {
  margin-right: 8px;
  opacity: 0.72;
}

.tool-disabled,
.permission-missing {
  color: #d03050;
}

.tool-permission {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  line-height: 1.7;
}

.tool-permission code {
  overflow-wrap: anywhere;
}

.tool-permission span {
  flex: none;
}

.permission-granted {
  color: #18a058;
}

.tool-empty-permission {
  opacity: 0.72;
}

@media (max-width: 560px) {
  .tool-detail-head {
    display: none;
  }

  .tool-detail-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
}
</style>
