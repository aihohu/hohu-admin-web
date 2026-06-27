<script setup lang="ts">
import { $t } from '@/locales';
import type { FilterFieldDef } from '../composables/useTableFilters';

defineOptions({ name: 'LowcodeTableSearch' });

interface Emits {
  (e: 'search'): void;
  (e: 'reset'): void;
}

const emit = defineEmits<Emits>();

defineProps<{ fields: FilterFieldDef[] }>();

/** 双向绑定的 filter state（父组件持有，搜索按钮触发时才应用到查询） */
const state = defineModel<Record<string, any>>('model', { required: true, default: () => ({}) });

function onSearch() {
  emit('search');
}

function onReset() {
  emit('reset');
}

/** Range 字段（gte/lte 对）以 `{ gte, lte }` 形式存储；此 helper 让模板写起来更短 */
function setRangeGte(key: string, v: number | null) {
  if (!state.value[key]) state.value[key] = { gte: null, lte: null };
  state.value[key] = { ...state.value[key], gte: v };
}
function setRangeLte(key: string, v: number | null) {
  if (!state.value[key]) state.value[key] = { gte: null, lte: null };
  state.value[key] = { ...state.value[key], lte: v };
}
function setRangeFromTs(key: string, range: [number, number] | null) {
  if (!range) {
    state.value[key] = { gte: null, lte: null };
    return;
  }
  state.value[key] = { gte: range[0], lte: range[1] };
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper mb-12px" data-testid="lowcode-table-search-card">
    <NCollapse :default-expanded-names="['lowcode-table-search']">
      <NCollapseItem :title="$t('common.search')" name="lowcode-table-search">
        <NForm :model="state" label-placement="left" :label-width="100">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi
              v-for="f in fields"
              :key="f.key"
              span="24 s:12 m:8"
              :label="f.label"
              :path="f.key"
              class="pr-24px"
            >
              <NSelect
                v-if="f.widget === 'NSelect'"
                v-model:value="state[f.key]"
                :options="f.options"
                clearable
                :data-testid="`lowcode-table-search-${f.key}`"
              />
              <NSpace v-else-if="f.widget === 'NInputNumberPair'" :wrap="false" :size="8">
                <NInputNumber
                  :value="state[f.key]?.gte ?? null"
                  :placeholder="$t('page.marketplace.lowcode.rangeMin')"
                  clearable
                  :data-testid="`lowcode-table-search-${f.key}-gte`"
                  @update:value="(v: number | null) => setRangeGte(f.key, v)"
                />
                <NInputNumber
                  :value="state[f.key]?.lte ?? null"
                  :placeholder="$t('page.marketplace.lowcode.rangeMax')"
                  clearable
                  :data-testid="`lowcode-table-search-${f.key}-lte`"
                  @update:value="(v: number | null) => setRangeLte(f.key, v)"
                />
              </NSpace>
              <NDatePicker
                v-else-if="f.widget === 'NDatePickerRange'"
                type="datetimerange"
                clearable
                :data-testid="`lowcode-table-search-${f.key}`"
                @update:value="(v: [number, number] | null) => setRangeFromTs(f.key, v)"
              />
              <NInput v-else v-model:value="state[f.key]" clearable :data-testid="`lowcode-table-search-${f.key}`" />
            </NFormItemGi>

            <NFormItemGi span="24 s:12 m:8">
              <NSpace class="w-full" justify="end">
                <NButton data-testid="lowcode-table-search-reset" @click="onReset">
                  <template #icon>
                    <IconIcRoundRefresh class="text-icon" />
                  </template>
                  {{ $t('common.reset') }}
                </NButton>
                <NButton type="primary" ghost data-testid="lowcode-table-search-submit" @click="onSearch">
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
