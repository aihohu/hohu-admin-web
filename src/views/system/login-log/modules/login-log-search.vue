<script setup lang="ts">
import { ref, toRaw } from 'vue';
import { jsonClone } from '@sa/utils';
import { $t } from '@/locales';

defineOptions({
  name: 'LoginLogSearch'
});

interface Emits {
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const model = defineModel<Api.SystemManage.LoginLogSearchParams>('model', { required: true });

const dateRange = ref<[number, number] | null>(null);

const statusOptions = [
  { label: $t('page.system.loginLog.statusSuccess'), value: '1' },
  { label: $t('page.system.loginLog.statusFailed'), value: '2' },
  { label: $t('page.system.loginLog.statusLocked'), value: '3' }
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
    model.value.startTime = new Date(value[0]).toISOString();
    model.value.endTime = new Date(value[1]).toISOString();
  } else {
    model.value.startTime = null;
    model.value.endTime = null;
  }
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <NCollapse :default-expanded-names="['login-log-search']">
      <NCollapseItem :title="$t('common.search')" name="login-log-search">
        <NForm :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi
              span="24 s:12 m:6"
              :label="$t('page.system.loginLog.username')"
              path="username"
              class="pr-24px"
            >
              <NInput
                v-model:value="model.username"
                :placeholder="$t('page.system.loginLog.usernamePlaceholder')"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" :label="$t('page.system.loginLog.status')" path="status" class="pr-24px">
              <NSelect v-model:value="model.status" :options="statusOptions" clearable />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="IP" path="ip" class="pr-24px">
              <NInput v-model:value="model.ip" :placeholder="$t('page.system.loginLog.ipPlaceholder')" clearable />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" :label="$t('page.system.loginLog.loginTime')" class="pr-24px">
              <NDatePicker
                v-model:value="dateRange"
                type="datetimerange"
                clearable
                class="w-full"
                @update:value="handleDateRangeChange"
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" class="pr-24px">
              <NSpace class="w-full" justify="end">
                <NButton @click="resetModel">
                  <template #icon>
                    <icon-ic-round-refresh class="text-icon" />
                  </template>
                  {{ $t('common.reset') }}
                </NButton>
                <NButton type="primary" ghost @click="search">
                  <template #icon>
                    <icon-ic-round-search class="text-icon" />
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
