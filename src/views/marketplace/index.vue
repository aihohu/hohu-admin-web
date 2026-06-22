<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NGridItem, NPagination } from 'naive-ui';
import { fetchMarketplaceApps, fetchSearchApps, type Marketplace } from '@/service/api/marketplace';

defineOptions({ name: 'Marketplace', meta: { title: '应用市场', i18nKey: 'route.marketplace' } });

const router = useRouter();
const loading = ref(false);
const apps = ref<Marketplace.App[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(12);

const keyword = ref('');
const category = ref<string | null>('');
const sort = ref('download');

const categoryOptions = [
  { label: '全部分类', value: '' },
  { label: '业务管理', value: 'business' },
  { label: '效率工具', value: 'tool' },
  { label: '数据分析', value: 'analytics' },
  { label: 'AI Agent', value: 'ai-agent' },
  { label: 'AI Skill', value: 'ai-skill' },
  { label: 'MCP 适配器', value: 'mcp-adapter' },
  { label: '系统集成', value: 'integration' },
  { label: '主题外观', value: 'theme' }
];

const sortOptions = [
  { label: '最多下载', value: 'download' },
  { label: '最新发布', value: 'latest' },
  { label: '评分最高', value: 'rating' }
];

const categoryLabels: Record<string, string> = {
  business: '业务管理',
  tool: '效率工具',
  analytics: '数据分析',
  'ai-agent': 'AI Agent',
  'ai-skill': 'AI Skill',
  'mcp-adapter': 'MCP 适配器',
  integration: '系统集成',
  theme: '主题外观'
};

async function loadData() {
  loading.value = true;
  try {
    if (keyword.value.trim()) {
      const { data, error } = await fetchSearchApps(keyword.value.trim(), currentPage.value, pageSize.value);
      if (!error) {
        apps.value = data.records;
        total.value = data.total;
      }
    } else {
      const { data, error } = await fetchMarketplaceApps({
        current: currentPage.value,
        size: pageSize.value,
        category: category.value || undefined,
        sort: sort.value
      });
      if (!error) {
        apps.value = data.records;
        total.value = data.total;
      }
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
            placeholder="搜索应用..."
            clearable
            style="width: 300px"
            @keyup.enter="onSearch"
          />
          <NButton type="primary" @click="onSearch">搜索</NButton>
          <NSelect
            v-model:value="category"
            :options="categoryOptions"
            style="width: 150px"
            @update:value="onCategoryChange"
          />
          <NSelect v-model:value="sort" :options="sortOptions" style="width: 130px" @update:value="onSortChange" />
        </NSpace>
        <NSpace>
          <NButton quaternary @click="goToUpload">上传应用</NButton>
          <NButton quaternary @click="goToInstalled">已安装管理</NButton>
        </NSpace>
      </NSpace>
    </NCard>

    <!-- App Grid -->
    <NSpin :show="loading">
      <NGrid v-if="apps.length > 0" :cols="4" :x-gap="16" :y-gap="16" responsive="screen">
        <NGridItem v-for="app in apps" :key="app.id">
          <NCard hoverable class="cursor-pointer h-full" @click="goToDetail(app.slug)">
            <template #header>
              <NSpace align="center">
                <NAvatar v-if="app.icon" :src="app.icon" :size="40" round />
                <NAvatar v-else :size="40" round>{{ app.name.charAt(0) }}</NAvatar>
                <div>
                  <div class="font-bold">{{ app.name }}</div>
                  <div class="text-gray-400 text-xs">{{ app.authorName || '未知' }}</div>
                </div>
              </NSpace>
            </template>
            <p class="text-sm text-gray-500 line-clamp-2" style="min-height: 40px">
              {{ app.description || '暂无描述' }}
            </p>
            <template #footer>
              <NSpace justify="space-between" align="center">
                <NTag size="small" :type="app.category === 'business' ? 'success' : 'info'">
                  {{ categoryLabels[app.category] || app.category }}
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
      <NEmpty v-else description="暂无应用" class="py-20" />
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
