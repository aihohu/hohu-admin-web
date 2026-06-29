<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NGridItem, NPagination } from 'naive-ui';
import { $t } from '@/locales';
import { fetchMarketplaceApps, type Marketplace } from '@/service/api/marketplace';

const router = useRouter();
const loading = ref(false);
const apps = ref<Marketplace.App[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(12);

const keyword = ref('');
const category = ref<string | null>('');
const sort = ref('download');

const categoryOptions = computed(() => [
  { label: $t('page.marketplace.browse.categoryAll'), value: '' },
  { label: $t('page.marketplace.browse.categoryBusiness'), value: 'business' },
  { label: $t('page.marketplace.browse.categoryTool'), value: 'tool' },
  { label: $t('page.marketplace.browse.categoryAnalytics'), value: 'analytics' },
  { label: $t('page.marketplace.browse.categoryAiAgent'), value: 'ai-agent' },
  { label: $t('page.marketplace.browse.categoryAiSkill'), value: 'ai-skill' },
  { label: $t('page.marketplace.browse.categoryMcpAdapter'), value: 'mcp-adapter' },
  { label: $t('page.marketplace.browse.categoryIntegration'), value: 'integration' },
  { label: $t('page.marketplace.browse.categoryTheme'), value: 'theme' }
]);

const sortOptions = computed(() => [
  { label: $t('page.marketplace.browse.sortDownload'), value: 'download' },
  { label: $t('page.marketplace.browse.sortLatest'), value: 'latest' },
  { label: $t('page.marketplace.browse.sortRating'), value: 'rating' }
]);

const categoryLabelMap: Record<string, App.I18n.I18nKey> = {
  business: 'page.marketplace.browse.categoryBusiness',
  tool: 'page.marketplace.browse.categoryTool',
  analytics: 'page.marketplace.browse.categoryAnalytics',
  'ai-agent': 'page.marketplace.browse.categoryAiAgent',
  'ai-skill': 'page.marketplace.browse.categoryAiSkill',
  'mcp-adapter': 'page.marketplace.browse.categoryMcpAdapter',
  integration: 'page.marketplace.browse.categoryIntegration',
  theme: 'page.marketplace.browse.categoryTheme'
};

function categoryLabel(value: string) {
  const key = categoryLabelMap[value];
  return key ? $t(key) : value;
}

async function loadData() {
  loading.value = true;
  try {
    // Backend /marketplace/list already supports keyword (AppQuery.keyword),
    // so we can pass everything in one call and preserve category/sort filters
    // while searching. The dedicated /search endpoint is keyword-only and
    // would silently drop them.
    const { data, error } = await fetchMarketplaceApps({
      current: currentPage.value,
      size: pageSize.value,
      keyword: keyword.value.trim() || undefined,
      category: category.value || undefined,
      sort: sort.value
    });
    if (!error) {
      apps.value = data.records;
      total.value = data.total;
    }
  } finally {
    loading.value = false;
  }
}

function onSearch() {
  currentPage.value = 1;
  loadData();
}

function onCategoryChange() {
  currentPage.value = 1;
  loadData();
}

function onSortChange() {
  currentPage.value = 1;
  loadData();
}

function onPageChange(page: number) {
  currentPage.value = page;
  loadData();
}

function goToDetail(slug: string) {
  router.push(`/marketplace/detail?id=${slug}`);
}

function goToInstalled() {
  router.push('/marketplace/installed');
}

function goToUpload() {
  router.push('/marketplace/upload');
}

onMounted(loadData);
</script>

<template>
  <div class="flex-col-stretch gap-4 p-4">
    <!-- Header -->
    <NCard>
      <NSpace justify="space-between" align="center">
        <NSpace align="center" size="large">
          <NInput
            v-model:value="keyword"
            :placeholder="$t('page.marketplace.browse.searchPlaceholder')"
            clearable
            data-testid="marketplace-search-input"
            style="width: 300px"
            @keyup.enter="onSearch"
          />
          <NButton type="primary" data-testid="marketplace-search-btn" @click="onSearch">
            {{ $t('common.search') }}
          </NButton>
          <NSelect
            v-model:value="category"
            :options="categoryOptions"
            data-testid="marketplace-category-select"
            style="width: 150px"
            @update:value="onCategoryChange"
          />
          <NSelect
            v-model:value="sort"
            :options="sortOptions"
            data-testid="marketplace-sort-select"
            style="width: 130px"
            @update:value="onSortChange"
          />
        </NSpace>
        <NSpace>
          <NButton quaternary data-testid="marketplace-nav-upload" @click="goToUpload">
            {{ $t('page.marketplace.browse.navUpload') }}
          </NButton>
          <NButton quaternary data-testid="marketplace-nav-installed" @click="goToInstalled">
            {{ $t('page.marketplace.browse.navInstalled') }}
          </NButton>
        </NSpace>
      </NSpace>
    </NCard>

    <!-- App Grid -->
    <NSpin :show="loading">
      <NGrid v-if="apps.length > 0" :cols="4" :x-gap="16" :y-gap="16" responsive="screen">
        <NGridItem v-for="app in apps" :key="app.id">
          <NCard
            hoverable
            class="cursor-pointer h-full"
            :data-testid="`marketplace-app-card-${app.slug}`"
            @click="goToDetail(app.slug)"
          >
            <template #header>
              <NSpace align="center">
                <NAvatar v-if="app.icon" :src="app.icon" :size="40" round />
                <NAvatar v-else :size="40" round>{{ app.name.charAt(0) }}</NAvatar>
                <div>
                  <div class="font-bold">{{ app.name }}</div>
                  <div class="text-gray-400 text-xs">
                    {{ app.authorName || $t('page.marketplace.browse.unknownAuthor') }}
                  </div>
                </div>
              </NSpace>
            </template>
            <p class="text-sm text-gray-500 line-clamp-2" style="min-height: 40px">
              {{ app.description || $t('page.marketplace.browse.noDescription') }}
            </p>
            <template #footer>
              <NSpace justify="space-between" align="center">
                <NTag size="small" :type="app.category === 'business' ? 'success' : 'info'">
                  {{ categoryLabel(app.category) }}
                </NTag>
                <NSpace size="small">
                  <span class="text-xs text-gray-400">⬇ {{ app.downloadCount }}</span>
                  <span class="text-xs text-gray-400">⭐ {{ app.avgRating.toFixed(1) }}</span>
                </NSpace>
              </NSpace>
            </template>
          </NCard>
        </NGridItem>
      </NGrid>
      <NEmpty v-else :description="$t('page.marketplace.browse.empty')" class="py-20" data-testid="marketplace-empty" />
    </NSpin>

    <!-- Pagination -->
    <NPagination
      v-if="total > pageSize"
      :page="currentPage"
      :page-count="Math.ceil(total / pageSize)"
      @update:page="onPageChange"
    />
  </div>
</template>
