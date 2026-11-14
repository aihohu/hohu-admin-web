<script setup lang="ts">
import { toRaw, ref, computed, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { fetchGetAllDictTypes } from '@/service/api';
import { $t } from '@/locales';
import { fieldAllowed } from '@/hooks/business/ordinary-fields';
import { useAuth } from '@/hooks/business/auth';

const props = defineProps<{ allowedFields?: string[] }>();
const { hasAuth } = useAuth();
const canLoadOptions = computed(
  () => fieldAllowed(props.allowedFields, 'dictType') && hasAuth('system:dict-type:list')
);

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
  if (!error && canLoadOptions.value) {
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

watch(
  canLoadOptions,
  allowed => {
    dictTypeOptions.value = [];
    if (allowed) loadDictTypes();
  },
  { immediate: true }
);
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <NCollapse :default-expanded-names="['dict-data-search']">
      <NCollapseItem :title="$t('common.search')" name="dict-data-search">
        <NForm :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi
              v-if="fieldAllowed(allowedFields, 'dictType')"
              span="24 s:12 m:6"
              :label="$t('page.system.dict.dictTypeCode')"
              path="dictType"
              class="pr-24px"
            >
              <NSelect
                v-if="dictTypeOptions.length"
                v-model:value="model.dictType"
                clearable
                :options="dictTypeOptions"
              />
              <NInput v-else v-model:value="model.dictType" clearable />
            </NFormItemGi>

            <NFormItemGi
              v-if="fieldAllowed(allowedFields, 'dictLabel')"
              span="24 s:12 m:6"
              :label="$t('page.system.dict.dictLabel')"
              path="dictLabel"
              class="pr-24px"
            >
              <NInput v-model:value="model.dictLabel" clearable />
            </NFormItemGi>

            <NFormItemGi
              v-if="fieldAllowed(allowedFields, 'dictValue')"
              span="24 s:12 m:6"
              :label="$t('page.system.dict.dictValue')"
              path="dictValue"
              class="pr-24px"
            >
              <NInput v-model:value="model.dictValue" clearable />
            </NFormItemGi>

            <NFormItemGi span="24 s:12 m:6" class="pr-24px">
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
