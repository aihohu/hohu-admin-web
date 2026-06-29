<script setup lang="ts">
import { toRaw } from 'vue';
import { jsonClone } from '@sa/utils';
import { $t } from '@/locales';

defineOptions({
  name: 'ReviewSearch'
});

interface Emits {
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

interface SearchParams {
  current: number;
  size: number;
  status: string;
  appSlug: string | null;
}

const model = defineModel<SearchParams>('model', { required: true });

const defaultModel = jsonClone(toRaw(model.value));

const statusOptions = [
  { label: $t('page.marketplace.review.statusAll'), value: 'all' },
  { label: $t('page.marketplace.review.statusPending'), value: 'pending' },
  { label: $t('page.marketplace.review.statusApproved'), value: 'approved' },
  { label: $t('page.marketplace.review.statusRejected'), value: 'rejected' }
];

function resetModel() {
  Object.assign(model.value, defaultModel);
}

function search() {
  emit('search');
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper" data-testid="review-search-card">
    <NCollapse :default-expanded-names="['review-search']">
      <NCollapseItem :title="$t('common.search')" name="review-search">
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
                data-testid="review-search-slug"
              />
            </NFormItemGi>
            <NFormItemGi
              span="24 s:12 m:8"
              :label="$t('page.marketplace.review.colStatus')"
              path="status"
              class="pr-24px"
            >
              <NSelect
                v-model:value="model.status"
                :options="statusOptions"
                :placeholder="$t('page.marketplace.review.colStatus')"
                data-testid="review-search-status"
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:8">
              <NSpace class="w-full" justify="end">
                <NButton data-testid="review-search-reset" @click="resetModel">
                  <template #icon>
                    <IconIcRoundRefresh class="text-icon" />
                  </template>
                  {{ $t('common.reset') }}
                </NButton>
                <NButton type="primary" ghost data-testid="review-search-submit" @click="search">
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
