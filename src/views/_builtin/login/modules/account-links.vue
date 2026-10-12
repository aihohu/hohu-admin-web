<script setup lang="ts">
import { $t } from '@/locales';
defineProps<{ registration: boolean; recovery: boolean }>();
defineEmits<{ navigate: [module: 'register' | 'reset-pwd'] }>();
</script>

<template>
  <div
    class="mt-16px min-h-28px w-full flex items-center gap-16px"
    :class="registration && recovery ? 'justify-between' : 'justify-end'"
  >
    <NButton v-if="recovery" text size="small" @click="$emit('navigate', 'reset-pwd')">
      {{ $t('page.login.pwdLogin.forgetPassword') }}
    </NButton>
    <NButton v-if="registration" text size="small" @click="$emit('navigate', 'register')">
      {{ $t('page.login.register.title') }}
    </NButton>
  </div>
</template>
