<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import { fetchRoleAgentBinding, fetchUpdateRoleAgentBinding } from '@/service/api';
import { $t } from '@/locales';

defineOptions({
  name: 'AiAgentAuthModal'
});

interface Props {
  /** the roleId */
  roleId: string;
}

const props = defineProps<Props>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const title = computed(() => 'AI Agent 授权');

const showSpin = shallowRef<boolean>(false);

const allAgents = shallowRef<Api.AiAgent.AgentRow[]>([]);
const checkedIds = shallowRef<string[]>([]);

async function loadBinding() {
  if (!props.roleId) return;
  showSpin.value = true;
  const { error, data } = await fetchRoleAgentBinding(props.roleId);
  if (!error) {
    allAgents.value = data.allAgents;
    checkedIds.value = [...data.boundAgentIds];
  }
  showSpin.value = false;
}

async function handleSubmit() {
  const { error } = await fetchUpdateRoleAgentBinding(props.roleId, checkedIds.value);
  if (!error) {
    window.$message?.success?.($t('common.modifySuccess'));
    visible.value = false;
  }
}

watch(visible, val => {
  if (val) {
    loadBinding();
  }
});

defineExpose({ handleSubmit, checkedIds, allAgents });
</script>

<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-480px">
    <NSpin :show="showSpin">
      <NCheckboxGroup v-model:value="checkedIds">
        <NSpace vertical>
          <div v-for="agent in allAgents" :key="agent.agentId" class="flex-y-center gap-12px">
            <NCheckbox :value="agent.agentId" :disabled="agent.isShared">{{ agent.name }} ({{ agent.code }})</NCheckbox>
            <NTag v-if="agent.isShared" size="small" type="info">shared 直通</NTag>
          </div>
        </NSpace>
      </NCheckboxGroup>
      <NAlert type="info" class="mt-12px" :bordered="false">shared Agent 直通所有用户，无需勾选。</NAlert>
    </NSpin>
    <template #footer>
      <NSpace justify="end">
        <NButton size="small" @click="visible = false">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" size="small" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
