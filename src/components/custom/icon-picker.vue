<script setup lang="ts">
import { ref } from 'vue';
import { Icon } from '@iconify/vue';
import { useBoolean } from '@sa/hooks';
import { useThemeVars } from 'naive-ui';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({ name: 'IconPicker' });

withDefaults(defineProps<{ value?: string }>(), {
  value: ''
});

const emit = defineEmits<{
  (e: 'update:value', val: string): void;
}>();

const themeVars = useThemeVars();
const { bool: visible, setTrue: open, setFalse: close } = useBoolean();

const DEFAULT_ICONS = [
  // 导航与布局
  'mdi:home',
  'mdi:menu',
  'mdi:view-dashboard',
  'mdi:arrow-left',
  'mdi:arrow-right',
  // 用户与社交
  'mdi:account',
  'mdi:account-circle',
  'mdi:account-group',
  'mdi:bell',
  'mdi:email',
  'mdi:phone',
  'mdi:share-variant',
  // 操作
  'mdi:plus',
  'mdi:minus',
  'mdi:close',
  'mdi:check',
  'mdi:pencil',
  'mdi:delete',
  'mdi:content-copy',
  'mdi:download',
  'mdi:upload',
  'mdi:refresh',
  'mdi:link',
  // 文件与数据
  'mdi:folder',
  'mdi:folder-open',
  'mdi:file-document',
  'mdi:database',
  'mdi:server',
  'mdi:cloud',
  'mdi:api',
  'mdi:tag',
  'mdi:format-list-bulleted',
  // 搜索与筛选
  'mdi:magnify',
  'mdi:filter',
  'mdi:sort',
  // 状态与安全
  'mdi:eye',
  'mdi:eye-off',
  'mdi:lock',
  'mdi:lock-open',
  'mdi:shield',
  'mdi:shield-check',
  'mdi:alert',
  'mdi:information',
  'mdi:help-circle',
  'mdi:cog',
  // 图表与媒体
  'mdi:chart-bar',
  'mdi:chart-line',
  'mdi:camera',
  'mdi:image',
  'mdi:palette',
  // 日期与位置
  'mdi:calendar',
  'mdi:clock',
  'mdi:map-marker',
  // 开发
  'mdi:code-tags',
  'mdi:bug',
  'mdi:wrench',
  'mdi:keyboard',
  'mdi:web',
  'mdi:translate',
  // 收藏
  'mdi:star',
  'mdi:heart',
  // Carbon 系列
  'carbon:home',
  'carbon:user',
  'carbon:settings',
  'carbon:search',
  'carbon:add',
  'carbon:close',
  'carbon:edit',
  'carbon:trash-can',
  // Phosphor 系列
  'ph:house',
  'ph:user',
  'ph:gear-six',
  // Tabler 系列
  'tabler:home',
  'tabler:user',
  'tabler:settings',
  // Remix 系列
  'ri:home-line',
  'ri:user-line',
  'ri:settings-3-line',
  // Lucide 系列
  'lucide:home',
  'lucide:user',
  'lucide:settings'
];

const keyword = ref('');
const icons = ref<string[]>(DEFAULT_ICONS);
const loading = ref(false);

const API_BASE = import.meta.env.VITE_ICONIFY_URL || 'https://api.iconify.design';

let timer: ReturnType<typeof setTimeout> | null = null;

function handleKeywordInput() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(doSearch, 300);
}

async function doSearch() {
  const q = keyword.value.trim();
  if (!q) {
    icons.value = DEFAULT_ICONS;
    return;
  }
  loading.value = true;
  try {
    const res = await fetch(`${API_BASE}/search?query=${encodeURIComponent(q)}&limit=200`);
    const data = await res.json();
    icons.value = data.icons || [];
  } catch {
    // keep current icons on error
  } finally {
    loading.value = false;
  }
}

function handleOpen() {
  open();
  keyword.value = '';
  icons.value = DEFAULT_ICONS;
}

function handleSelect(icon: string) {
  emit('update:value', icon);
  close();
}

function handleClear() {
  emit('update:value', '');
}
</script>

<template>
  <div class="flex items-center gap-8px w-full">
    <NInput
      :value="value"
      :placeholder="$t('page.system.menu.form.icon')"
      class="flex-1"
      @update:value="(val: string) => emit('update:value', val)"
    >
      <template #suffix>
        <SvgIcon v-if="value" :icon="value" class="text-icon" />
      </template>
    </NInput>
    <NButton @click="handleOpen">
      <template #icon>
        <IconIcRoundAppRegistration class="text-icon" />
      </template>
    </NButton>
  </div>

  <NModal v-model:show="visible" preset="card" class="w-800px" :title="$t('page.system.menu.iconPicker.title')">
    <div class="flex flex-col gap-12px">
      <NInput
        v-model:value="keyword"
        :placeholder="$t('page.system.menu.iconPicker.search')"
        clearable
        @input="handleKeywordInput"
      >
        <template #prefix>
          <IconIcRoundSearch class="text-icon" />
        </template>
      </NInput>

      <NScrollbar class="h-400px">
        <NSpin :show="loading">
          <div v-if="icons.length" class="icon-grid">
            <div
              v-for="icon in icons"
              :key="icon"
              class="icon-cell"
              :class="{ selected: icon === value }"
              :title="icon"
              @click="handleSelect(icon)"
            >
              <Icon :icon="icon" class="text-22px" />
              <span class="icon-name">{{ icon.split(':')[1] }}</span>
            </div>
          </div>
          <NEmpty v-else :description="$t('page.system.menu.iconPicker.empty')" class="py-40px" />
        </NSpin>
      </NScrollbar>
    </div>
    <template #footer>
      <NSpace justify="space-between" align="center">
        <NButton size="small" @click="handleClear">{{ $t('common.clear') }}</NButton>
        <NButton size="small" @click="close">{{ $t('common.cancel') }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  gap: 4px;
}

.icon-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.icon-cell:hover {
  background: rgba(0, 0, 0, 0.04);
}

html.dark .icon-cell:hover {
  background: rgba(255, 255, 255, 0.08);
}

.icon-cell.selected {
  background: rgba(0, 0, 0, 0.06);
  border-color: v-bind('themeVars.primaryColor');
}

html.dark .icon-cell.selected {
  background: rgba(255, 255, 255, 0.12);
  border-color: v-bind('themeVars.primaryColor');
}

.icon-name {
  font-size: 10px;
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.5;
}
</style>
