<script setup lang="ts">
import { toRaw } from 'vue';
import { jsonClone } from '@sa/utils';
import { $t } from '@/locales';

defineOptions({
  name: 'InstalledSearch'
});

interface Emits {
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

interface SearchParams {
  current: number;
  size: number;
  appSlug: string | null;
  status: string | null;
}

const model = defineModel<SearchParams>('model', { required: true });

const defaultModel = jsonClone(toRaw(model.value));

const statusOptions = [
  { label: $t('page.marketplace.installed.statusAll'), value: '' },
  { label: $t('page.marketplace.installed.statusEnabled'), value: 'enabled' },
  { label: $t('page.marketplace.installed.statusInstalled'), value: 'installed' },
  { label: $t('page.marketplace.installed.statusDisabled'), value: 'disabled' },
  { label: $t('page.marketplace.installed.statusUninstalled'), value: 'uninstalled' }
];

function resetModel() {
  Object.assign(model.value, defaultModel);
}

function search() {
  emit('search');
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper" data-testid="installed-search-card">
    <NCollapse :default-expanded-names="['installed-search']">
      <NCollapseItem :title="$t('common.search')" name="installed-search">
        <NForm :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi
              span="24 s:12 m:8"
              :label="$t('page.marketplace.installed.searchAppSlug')"
              path="appSlug"
              class="pr-24px"
            >
              <NInput
                v-model:value="model.appSlug"
                :placeholder="$t('page.marketplace.installed.searchAppSlugPlaceholder')"
                clearable
                data-testid="installed-search-slug"
              />
            </NFormItemGi>
            <NFormItemGi
              span="24 s:12 m:8"
              :label="$t('page.marketplace.installed.searchStatus')"
              path="status"
              class="pr-24px"
            >
              <NSelect
                v-model:value="model.status"
                :options="statusOptions"
                :placeholder="$t('page.marketplace.installed.searchStatus')"
                clearable
                data-testid="installed-search-status"
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:8">
              <NSpace class="w-full" justify="end">
                <NButton data-testid="installed-search-reset" @click="resetModel">
                  <template #icon>
                    <IconIcRoundRefresh class="text-icon" />
                  </template>
                  {{ $t('common.reset') }}
                </NButton>
                <NButton type="primary" ghost data-testid="installed-search-submit" @click="search">
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
