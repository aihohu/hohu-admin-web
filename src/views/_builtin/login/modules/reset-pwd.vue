<script setup lang="ts">
import AccountForm from './account-form.vue';
import type { AccountCapabilities } from '@/service/api/account';
defineProps<{ tenantCode?: string; capabilities: AccountCapabilities | null }>();
</script>

<template><AccountForm purpose="reset" :tenant-code="tenantCode" :capabilities="capabilities" /></template>
