<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { NImage } from 'naive-ui';
import { fetchChatImage } from '@/service/api';

const props = defineProps<{ src: string; alt?: string }>();
const { t } = useI18n();
const imageUrl = ref('');
const failed = ref(false);

watch(
  () => props.src,
  async (src, _previous, onCleanup) => {
    let active = true;
    let objectUrl = '';
    imageUrl.value = '';
    failed.value = false;
    onCleanup(() => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    });
    try {
      // Persisted local references are never opened anonymously, even for history.
      const { data, error } = await fetchChatImage(src);
      if (!active) return;
      if (error || !(data instanceof Blob) || !['image/png', 'image/jpeg'].includes(data.type)) {
        failed.value = true;
        return;
      }
      objectUrl = URL.createObjectURL(data);
      imageUrl.value = objectUrl;
    } catch {
      if (active) failed.value = true;
    }
  },
  { immediate: true }
);
</script>

<template>
  <span class="chat-image">
    <NImage v-if="imageUrl" :src="imageUrl" :alt="alt || t('page.ai.chat.imageConversation')" />
    <span v-else role="status">{{ t(failed ? 'page.ai.chat.imageUnavailable' : 'page.ai.chat.imageLoading') }}</span>
  </span>
</template>

<style scoped>
.chat-image {
  display: inline-flex;
  max-width: 100%;
}
.chat-image :deep(img) {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
}
</style>
