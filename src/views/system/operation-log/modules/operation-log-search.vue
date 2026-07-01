<script setup lang="ts">
import { ref, toRaw } from 'vue';
import { jsonClone } from '@sa/utils';
import { $t } from '@/locales';

defineOptions({
  name: 'OperationLogSearch'
});

interface Emits {
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const model = defineModel<Api.SystemManage.OperationLogSearchParams>('model', { required: true });

const dateRange = ref<[number, number] | null>(null);

const moduleOptions = [
  { label: $t('page.system.operationLog.moduleSystem'), value: 'system' },
  { label: $t('page.system.operationLog.moduleAuth'), value: 'auth' },
  { label: $t('page.system.operationLog.moduleJob'), value: 'job' },
  { label: $t('page.system.operationLog.moduleAi'), value: 'ai' }
];

const actionOptions = [
  { label: $t('page.system.operationLog.actionCreate'), value: 'create' },
  { label: $t('page.system.operationLog.actionUpdate'), value: 'update' },
  { label: $t('page.system.operationLog.actionDelete'), value: 'delete' }
];

const statusCodeOptions = [
  { label: '2xx', value: 200 },
  { label: '4xx', value: 400 },
  { label: '5xx', value: 500 }
];

const defaultModel = jsonClone(toRaw(model.value));

function resetModel() {
  Object.assign(model.value, defaultModel);
  dateRange.value = null;
}

function search() {
  emit('search');
}

function handleDateRangeChange(value: [number, number] | null) {
  if (value) {
    // 后端 LocalNaiveDatetime 接受 unix ms timestamp，按服务器本地时区
    // 转 naive datetime，与 DB TIMESTAMP WITHOUT TIME ZONE 列对齐。
    // 不要用 toISOString()——会转 UTC 导致跨时区 8 小时偏差。
    model.value.startTime = value[0];
    model.value.endTime = value[1];
  } else {
    model.value.startTime = null;
    model.value.endTime = null;
  }
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <NCollapse :default-expanded-names="['operation-log-search']">
      <NCollapseItem :title="$t('common.search')" name="operation-log-search">
        <NForm :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi
              span="24 s:12 m:6"
              :label="$t('page.system.operationLog.module')"
              path="module"
              class="pr-24px"
            >
              <NSelect v-model:value="model.module" :options="moduleOptions" clearable />
            </NFormItemGi>
            <NFormItemGi
              span="24 s:12 m:6"
              :label="$t('page.system.operationLog.action')"
              path="action"
              class="pr-24px"
            >
              <NSelect v-model:value="model.action" :options="actionOptions" clearable />
            </NFormItemGi>
            <NFormItemGi
              span="24 s:12 m:6"
              :label="$t('page.system.operationLog.username')"
              path="username"
              class="pr-24px"
            >
              <NInput
                v-model:value="model.username"
                :placeholder="$t('page.system.operationLog.usernamePlaceholder')"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi
              span="24 s:12 m:6"
              :label="$t('page.system.operationLog.statusCode')"
              path="statusCode"
              class="pr-24px"
            >
              <NSelect v-model:value="model.statusCode" :options="statusCodeOptions" clearable />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" :label="$t('page.system.operationLog.createTime')" class="pr-24px">
              <NDatePicker
                v-model:value="dateRange"
                type="datetimerange"
                clearable
                class="w-full"
                @update:value="handleDateRangeChange"
              />
            </NFormItemGi>
            <NFormItemGi span="24 m:18">
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

<style scoped>
.card-wrapper {
  margin-bottom: 16px;
}
</style>
