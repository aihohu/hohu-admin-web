<script setup lang="ts">
import { brandSettings } from '@/utils/runtime-settings';
defineOptions({
  name: 'GlobalFooter'
});
</script>

<template>
  <DarkModeContainer class="h-full flex-center">
    <span v-if="brandSettings.site_copyright">{{ brandSettings.site_copyright }}</span>
    <span v-if="brandSettings.site_icp" class="ml-8px">{{ brandSettings.site_icp }}</span>
    <a
      v-else-if="!brandSettings.site_copyright"
      href="https://github.com/aihohu/hohu-admin-web/blob/main/LICENSE"
      target="_blank"
      rel="noopener noreferrer"
    >
      Copyright MIT © 2025 HoHu
    </a>
  </DarkModeContainer>
</template>

<style scoped></style>
