<script setup lang="ts">
import { computed } from 'vue';
import { useAuth } from '@/hooks/business/auth';
import { $t } from '@/locales';

defineOptions({
  name: 'TableHeaderOperation'
});

interface Props {
  itemAlign?: NaiveUI.Align;
  disabledDelete?: boolean;
  loading?: boolean;
  /** 是否显示新增按钮。默认 true。设为 false 完全隐藏（如日志页不能新增） */
  showAdd?: boolean;
  /** 是否显示批量删除按钮。默认 true。设为 false 完全隐藏 */
  showDelete?: boolean;
  /** 新增按钮权限码。不传则不控制权限，按 showAdd 显隐 */
  addAuth?: string;
  /** 批量删除按钮权限码。不传则不控制权限，按 showDelete 显隐 */
  deleteAuth?: string;
}

const props = withDefaults(defineProps<Props>(), {
  showAdd: true,
  showDelete: true
});

interface Emits {
  (e: 'add'): void;
  (e: 'delete'): void;
  (e: 'refresh'): void;
}

const emit = defineEmits<Emits>();

const { hasAuth } = useAuth();

// 显隐 = showXxx 开关 && 权限通过（未传 auth 视为不控制）
const showAddButton = computed(() => props.showAdd && (!props.addAuth || hasAuth(props.addAuth)));
const showDeleteButton = computed(() => props.showDelete && (!props.deleteAuth || hasAuth(props.deleteAuth)));

const columns = defineModel<NaiveUI.TableColumnCheck[]>('columns', {
  default: () => []
});

function add() {
  emit('add');
}

function batchDelete() {
  emit('delete');
}

function refresh() {
  emit('refresh');
}
</script>

<template>
  <NSpace :align="itemAlign" wrap justify="end" class="lt-sm:w-200px">
    <slot name="prefix"></slot>
    <slot name="default">
      <NButton v-if="showAddButton" size="small" ghost type="primary" @click="add">
        <template #icon>
          <IconIcRoundPlus class="text-icon" />
        </template>
        {{ $t('common.add') }}
      </NButton>
      <NPopconfirm v-if="showDeleteButton" @positive-click="batchDelete">
        <template #trigger>
          <NButton size="small" ghost type="error" :disabled="disabledDelete">
            <template #icon>
              <IconIcRoundDelete class="text-icon" />
            </template>
            {{ $t('common.batchDelete') }}
          </NButton>
        </template>
        {{ $t('common.confirmDelete') }}
      </NPopconfirm>
    </slot>
    <NButton size="small" @click="refresh">
      <template #icon>
        <IconMdiRefresh class="text-icon" :class="{ 'animate-spin': loading }" />
      </template>
      {{ $t('common.refresh') }}
    </NButton>
    <TableColumnSetting v-model:columns="columns" />
    <slot name="suffix"></slot>
  </NSpace>
</template>

<style scoped></style>
