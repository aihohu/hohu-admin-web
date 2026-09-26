<script setup lang="ts">
import logo from '@/assets/imgs/logo.png';
import { brandSettings } from '@/utils/runtime-settings';
</script>

<template>
  <div class="app-logo">
    <img :src="brandSettings.site_logo || logo" alt="" class="size-full" />
  </div>
</template>

<style scoped>
.app-logo {
  --logo-color-300: rgb(var(--primary-300-color));
  --logo-color-400: rgb(var(--primary-400-color));
  --logo-color-500: rgb(var(--primary-500-color));
  --logo-color-600: rgb(var(--primary-600-color));
  --logo-color-700: rgb(var(--primary-700-color));
}
</style>
