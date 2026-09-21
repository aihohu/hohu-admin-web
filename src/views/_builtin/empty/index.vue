<script setup lang="ts">
import { useAuthStore } from '@/store/modules/auth';
import { useRouterPush } from '@/hooks/common/router';
import { fetchLogout } from '@/service/api';
import { localStg } from '@/utils/storage';
import { $t } from '@/locales';

defineOptions({ name: 'Empty' });

const authStore = useAuthStore();
const { routerPushByKey } = useRouterPush();

async function handleLogout() {
  const refreshToken = localStg.get('refreshToken') || undefined;
  await fetchLogout(refreshToken).catch(() => {});
  await authStore.resetStore();
  routerPushByKey('login');
}
</script>

<template>
  <div class="size-full min-h-520px flex-col-center gap-24px overflow-hidden p-24px">
    <div class="flex text-160px text-primary">
      <SvgIcon local-icon="empty-data" />
    </div>
    <h2 class="text-20px font-semibold">{{ $t('route.empty') }}</h2>
    <p class="max-w-480px text-center text-14px opacity-70">{{ $t('page.empty.tip') }}</p>
    <NButton type="primary" @click="handleLogout">{{ $t('page.empty.logout') }}</NButton>
  </div>
</template>

<style scoped></style>
