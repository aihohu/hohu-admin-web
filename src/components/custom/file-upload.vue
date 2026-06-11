<script setup lang="ts">
import { computed, watch } from 'vue';
import type { UploadFileInfo } from 'naive-ui';
import { fetchUploadFile } from '@/service/api';

defineOptions({ name: 'FileUpload' });

interface Props {
  /** v-model 绑定的 fileId，单文件为 string，多文件为 string[] */
  value?: string | string[];
  /** 业务类型（如 product、avatar） */
  businessType?: string;
  /** 业务记录 ID */
  businessId?: string;
  /** 限制文件类型（如 image/*） */
  accept?: string;
  /** 是否允许多文件 */
  multiple?: boolean;
  /** 最大文件数量 */
  max?: number;
  /** 列表展示类型 */
  listType?: 'text' | 'image' | 'image-card';
  /** 是否禁用 */
  disabled?: boolean;
  /** 编辑回显时的 fileId -> fileUrl 映射，用于图片预览 */
  fileUrls?: Record<string, string>;
}

const props = withDefaults(defineProps<Props>(), {
  value: undefined,
  businessType: undefined,
  businessId: undefined,
  accept: undefined,
  multiple: false,
  max: undefined,
  listType: 'text',
  disabled: false,
  fileUrls: undefined
});

interface FileUploadResult {
  fileId: string;
  fileUrl: string;
  fileName: string;
}

const emit = defineEmits<{
  (e: 'update:value', value: string | string[] | undefined): void;
  (e: 'change', result: FileUploadResult): void;
}>();

const isImageMode = computed(() => props.listType === 'image' || props.listType === 'image-card');

const isMultiple = computed(() => props.multiple || (props.max !== undefined && props.max > 1));

// 内部维护的 fileList，同时存储 fileId 映射
const fileIdMap = new Map<string, string>(); // file.id -> fileId
const fileList = defineModel<UploadFileInfo[]>('fileList', { default: () => [] });

function handleCustomRequest({ file, onFinish, onError }: any) {
  fetchUploadFile(file.file as File, props.businessType, props.businessId)
    .then(({ data, error }) => {
      if (!error && data) {
        fileIdMap.set(file.id, data.fileId);
        // 让 NUpload 用 fileUrl 做预览
        onFinish(data.fileUrl);
        emitValue();
        emit('change', { fileId: data.fileId, fileUrl: data.fileUrl, fileName: data.originalName });
      } else {
        onError();
      }
    })
    .catch(() => onError());
}

function emitValue() {
  const ids: string[] = [];
  for (const f of fileList.value) {
    if (f.status === 'finished' && fileIdMap.has(f.id)) {
      ids.push(fileIdMap.get(f.id)!);
    }
  }
  if (isMultiple.value) {
    emit('update:value', ids);
  } else {
    emit('update:value', ids[0] ?? undefined);
  }
}

function handleRemove({ file }: { file: UploadFileInfo }) {
  fileIdMap.delete(file.id);
  emitValue();
}

// 外部 value 变化时同步 fileList（用于编辑回显）
watch(
  () => props.value,
  newVal => {
    if (!newVal || (Array.isArray(newVal) && newVal.length === 0)) {
      fileList.value = [];
      fileIdMap.clear();
      return;
    }

    const newIds = Array.isArray(newVal) ? newVal : [newVal];

    // 上传中时不覆盖，避免打断
    const hasUploading = fileList.value.some(f => f.status !== 'finished');
    if (hasUploading) return;

    // 已经一致则跳过（比较 fileId，而非 URL）
    const currentIds = fileList.value
      .filter(f => f.status === 'finished' && fileIdMap.has(f.id))
      .map(f => fileIdMap.get(f.id)!);
    const matches = currentIds.length === newIds.length && currentIds.every((id, i) => newIds[i] === id);
    if (matches) return;

    // 值变了，重新初始化
    fileList.value = newIds.map(id => ({
      id: `echo-${id}`,
      name: id,
      status: 'finished' as const,
      url: props.fileUrls?.[id] ?? id
    }));
    fileIdMap.clear();
    newIds.forEach(id => fileIdMap.set(`echo-${id}`, id));
  },
  { immediate: true }
);
</script>

<template>
  <NUpload
    v-model:file-list="fileList"
    :custom-request="handleCustomRequest"
    :accept="accept"
    :max="max"
    :multiple="multiple"
    :list-type="listType"
    :disabled="disabled"
    @remove="handleRemove"
  >
    <slot>
      <NButton v-if="!isImageMode" size="small" :disabled="disabled">
        <template #icon>
          <IconIcRoundCloudUpload class="text-icon" />
        </template>
        {{ $t('page.system.file.uploadFile') }}
      </NButton>
    </slot>
  </NUpload>
</template>

<style scoped></style>
