<script setup lang="ts">
import { ref, toRaw } from 'vue';
import { jsonClone } from '@sa/utils';
import { $t } from '@/locales';

defineOptions({
  name: 'JobLogSearch'
});

interface Emits {
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const model = defineModel<Api.SystemManage.JobLogSearchParams>('model', { required: true });

const dateRange = ref<[number, number] | null>(null);

const jobLogStatusOptions = [
  { label: $t('page.system.jobLog.statusSuccess'), value: '1' },
  { label: $t('page.system.jobLog.statusFailed'), value: '2' },
  { label: $t('page.system.jobLog.statusRunning'), value: '3' }
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
    <NCollapse :default-expanded-names="['job-log-search']">
      <NCollapseItem :title="$t('common.search')" name="job-log-search">
        <NForm :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi span="24 s:12 m:6" :label="$t('page.system.jobLog.jobKey')" path="jobKey" class="pr-24px">
              <NInput v-model:value="model.jobKey" :placeholder="$t('page.system.job.form.jobKey')" clearable />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" :label="$t('page.system.jobLog.status')" path="status" class="pr-24px">
              <NSelect v-model:value="model.status" :options="jobLogStatusOptions" clearable />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" :label="$t('page.system.jobLog.startTime')" class="pr-24px">
              <NDatePicker
                v-model:value="dateRange"
                type="datetimerange"
                clearable
                class="w-full"
                @update:value="handleDateRangeChange"
              />
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

<style scoped>
.card-wrapper {
  margin-bottom: 16px;
}
</style>
