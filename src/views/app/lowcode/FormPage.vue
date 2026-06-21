<script setup lang="ts">
defineProps<{
  manifest: Record<string, any>;
  page: Record<string, any>;
  dataSchema: Record<string, any> | null;
  uiSchema: Record<string, any>;
  breakpoint: string;
}>();
</script>

<template>
  <NCard title="表单页（Task 11 实现）">
    <NEmpty description="待实现" />
  </NCard>
</template>
