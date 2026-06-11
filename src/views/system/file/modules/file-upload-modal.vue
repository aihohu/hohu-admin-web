<script setup lang="ts">
import { useBoolean } from '@sa/hooks';

defineOptions({ name: 'FileUploadModal' });

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const { bool: visible, setTrue: open, setFalse: close } = useBoolean();

function handleClose() {
  close();
  emit('success');
}

defineExpose({ open });
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="$t('page.system.file.uploadFile')"
    class="w-600px"
    :mask-closable="false"
    @after-leave="handleClose"
  >
    <FileUpload multiple>
      <NUploadDragger>
        <div class="mb-12px">
          <IconIcRoundCloudUpload class="text-48px text-gray-400" />
        </div>
        <NText>{{ $t('page.system.file.uploadDraggerTip') }}</NText>
        <NP depth="3" class="m-0 mt-8px">
          {{ $t('page.system.file.uploadDraggerDesc') }}
        </NP>
      </NUploadDragger>
    </FileUpload>
  </NModal>
</template>

<style scoped></style>
