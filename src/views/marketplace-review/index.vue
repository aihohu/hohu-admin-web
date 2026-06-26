<script setup lang="tsx">
import { reactive, shallowRef } from 'vue';
import { NButton, NTag } from 'naive-ui';
import { $t } from '@/locales';
import { fetchReviews, type Review } from '@/service/api/marketplace';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import ReviewSearch from './modules/review-search.vue';
import ReviewDetailDrawer from './modules/review-detail-drawer.vue';

const searchParams = reactive({
  current: 1,
  size: 10,
  status: 'pending' as 'pending' | 'approved' | 'rejected' | 'all',
  appSlug: null as string | null
});

const drawerVisible = shallowRef(false);
const currentReviewId = shallowRef<string | null>(null);

const statusConfig: Record<
  string,
  { key: App.I18n.I18nKey; type: 'warning' | 'success' | 'error' | 'default' }
> = {
  pending: { key: 'page.marketplace.review.statusPending', type: 'warning' },
  approved: { key: 'page.marketplace.review.statusApproved', type: 'success' },
  rejected: { key: 'page.marketplace.review.statusRejected', type: 'error' }
};

const { columns, columnChecks, data, loading, getData, getDataByPage, mobilePagination } = useNaivePaginatedTable({
  api: () => fetchReviews(searchParams),
  transform: response => defaultTransform(response),
  onPaginationParamsChange: params => {
    searchParams.current = params.page ?? 1;
    searchParams.size = params.pageSize ?? 10;
  },
  columns: () => [
    {
      key: 'index',
      title: $t('common.index'),
      width: 64,
      align: 'center',
      render: (_, index) => index + 1
    },
    {
      key: 'appName',
      title: $t('page.marketplace.review.colApp'),
      minWidth: 200,
      render: row => (
        <div>
          <div class="font-bold">{row.appName}</div>
          <div class="text-xs text-gray-400">{row.appSlug}</div>
        </div>
      )
    },
    { key: 'version', title: $t('page.marketplace.review.colVersion'), align: 'center', width: 100 },
    {
      key: 'finalStatus',
      title: $t('page.marketplace.review.colStatus'),
      align: 'center',
      width: 100,
      render: row => {
        const s = statusConfig[row.finalStatus] || { key: ('route.' + row.finalStatus) as App.I18n.I18nKey, type: 'default' as const };
        return <NTag type={s.type} size="small">{$t(s.key)}</NTag>;
      }
    },
    {
      key: 'aiRiskLevel',
      title: $t('page.marketplace.review.colRisk'),
      align: 'center',
      width: 90,
      render: row => row.aiRiskLevel || '-'
    },
    { key: 'createdAt', title: $t('page.marketplace.review.colCreatedAt'), width: 170 },
    {
      key: 'operate',
      title: $t('page.marketplace.review.colActions'),
      align: 'center',
      width: 220,
      fixed: 'right',
      render: row => (
        <div class="flex-center gap-8px">
          <NButton size="small" type="info" ghost onClick={() => openDetail(row)}>
            {$t('page.marketplace.review.btnDetail')}
          </NButton>
        </div>
      )
    }
  ]
});

function openDetail(row: Review.Item) {
  currentReviewId.value = row.id;
  drawerVisible.value = true;
}

function onReviewed() {
  getData();
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <ReviewSearch v-model:model="searchParams" @search="getDataByPage" />
    <NCard
      :title="$t('page.marketplace.review.title')"
      :bordered="false"
      size="small"
      class="card-wrapper sm:flex-1-hidden"
      data-testid="review-list-card"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :hide-add="true"
          :hide-delete="true"
          :loading="loading"
          @refresh="getData"
        />
      </template>
      <NDataTable
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="true"
        :scroll-x="1000"
        :loading="loading"
        remote
        :row-key="(row: Review.Item) => row.id"
        :pagination="mobilePagination"
        data-testid="review-list-table"
        class="sm:h-full"
      />
    </NCard>

    <ReviewDetailDrawer v-model:visible="drawerVisible" :review-id="currentReviewId" @reviewed="onReviewed" />
  </div>
</template>

<style scoped></style>
