<script setup lang="ts">
import { toRaw, ref } from 'vue';
import { jsonClone } from '@sa/utils';
import { enableStatusOptions } from '@/constants/business';
import { translateOptions } from '@/utils/common';
import { fetchGetAllDictTypes } from '@/service/api';
import { $t } from '@/locales';

defineOptions({
  name: 'DictDataSearch'
});

interface Emits {
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const model = defineModel<Api.SystemManage.DictDataSearchParams>('model', { required: true });

const defaultModel = jsonClone(toRaw(model.value));

const dictTypeOptions = ref<CommonType.Option<string>[]>([]);

async function loadDictTypes() {
  const { error, data } = await fetchGetAllDictTypes();
  if (!error) {
    dictTypeOptions.value = data.map(item => ({
      label: item.dictName,
      value: item.dictType
    }));
  }
}

function resetModel() {
  Object.assign(model.value, defaultModel);
}

function search() {
  emit('search');
}

loadDictTypes();
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <NCollapse :default-expanded-names="['dict-data-search']">
      <NCollapseItem :title="$t('common.search')" name="dict-data-search">
        <NForm :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi
              span="24 s:12 m:6"
              :label="$t('page.system.dict.dictTypeCode')"
              path="dictType"
              class="pr-24px"
            >
              <NSelect v-model:value="model.dictType" clearable :options="dictTypeOptions" />
            </NFormItemGi>

            <NFormItemGi span="24 s:12 m:6" :label="$t('page.system.dict.dictLabel')" path="dictLabel" class="pr-24px">
              <NInput v-model:value="model.dictLabel" clearable />
            </NFormItemGi>

            <NFormItemGi span="24 s:12 m:6" :label="$t('page.system.dict.dictValue')" path="dictValue" class="pr-24px">
              <NInput v-model:value="model.dictValue" clearable />
            </NFormItemGi>

            <NFormItemGi span="24 s:12 m:6" :label="$t('page.system.dict.status')" path="status" class="pr-24px">
              <NSelect v-model:value="model.status" clearable :options="translateOptions(enableStatusOptions)" />
            </NFormItemGi>

            <NFormItemGi span="24 s:12 m:6">
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
