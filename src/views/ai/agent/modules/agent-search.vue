<script setup lang="ts">
import { toRaw } from 'vue';
import { jsonClone } from '@sa/utils';
import { $t } from '@/locales';

defineOptions({
  name: 'AgentSearch'
});

interface Emits {
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const model = defineModel<Api.AiAgent.AdminListSearchParams>('model', { required: true });

const enabledFilterOptions = [
  { label: $t('page.ai.agent.all'), value: 'all' },
  { label: $t('page.ai.agent.enabledValue'), value: 'enabled' },
  { label: $t('page.ai.agent.disabled'), value: 'disabled' }
];

const defaultModel = jsonClone(toRaw(model.value));

function resetModel() {
  Object.assign(model.value, defaultModel);
}

function search() {
  emit('search');
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <NCollapse :default-expanded-names="['agent-search']">
      <NCollapseItem :title="$t('common.search')" name="agent-search">
        <NForm :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi span="24 s:12 m:6" :label="$t('page.ai.agent.keyword')" path="keyword" class="pr-24px">
              <NInput
                v-model:value="model.keyword"
                :placeholder="$t('page.ai.agent.code') + ' / ' + $t('page.ai.agent.name')"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi
              span="24 s:12 m:6"
              :label="$t('page.ai.agent.enabledFilter')"
              path="enabledFilter"
              class="pr-24px"
            >
              <NSelect v-model:value="model.enabledFilter" :options="enabledFilterOptions" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6">
              <NSpace class="w-full" justify="end">
                <NButton @click="resetModel">
                  <template #icon>
                    <IconIcRoundRefresh class="text-icon" />
                  </template>
                  {{ $t('common.reset') }}
                </NButton>
                <NButton type="primary" ghost @click="search">
                  <template #icon>
                    <IconIcRoundSearch class="text-icon" />
                  </template>
                  {{ $t('common.search') }}
                </NButton>
              </NSpace>
            </NFormItemGi>
          </NGrid>
        </NForm>
      </NCollapseItem>
    </NCollapse>
  </NCard>
</template>

<style scoped></style>
