<script setup lang="ts">
import Dashboard from '../dashboard/index.vue';

// Compatibility for existing tenant menus and grants that still refer to view.home.
// This route retains the dashboard behavior; it never grants access to AI chat.
defineOptions({ name: 'Home' });
</script>

<template>
  <Dashboard />
</template>
