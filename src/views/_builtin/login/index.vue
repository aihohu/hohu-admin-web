<script setup lang="ts">
import { computed, onMounted, shallowRef, watch } from 'vue';
import type { Component } from 'vue';
import { getPaletteColorByNumber, mixColor } from '@sa/color';
import { loginModuleRecord } from '@/constants/app';
import { useAppStore } from '@/store/modules/app';
import { useThemeStore } from '@/store/modules/theme';
import { $t } from '@/locales';
import { brandSettings, refreshPublicSettings } from '@/utils/runtime-settings';
import { fetchLoginOptions } from '@/service/api/auth';
import { fetchAccountCapabilities } from '@/service/api/account';
import type { AccountCapabilities } from '@/service/api/account';
import { shouldShowTenantCodeInput } from '@/utils/tenant-auth';
import PwdLogin from './modules/pwd-login.vue';
import Register from './modules/register.vue';
import ResetPwd from './modules/reset-pwd.vue';
import BindWechat from './modules/bind-wechat.vue';

interface Props {
  /** The login module */
  module?: UnionKey.LoginModule;
}

const props = defineProps<Props>();

const tenantCode = shallowRef('default');
const capabilities = shallowRef<AccountCapabilities | null>(null);
const showTenantCode = shallowRef(
  shouldShowTenantCodeInput(import.meta.env.VITE_TENANT_MODE, import.meta.env.VITE_TENANT_LOCATOR)
);
let sequence = 0;
async function loadCapabilities() {
  const current = ++sequence;
  capabilities.value = null;
  if (showTenantCode.value && !tenantCode.value.trim()) return;
  const { data, error } = await fetchAccountCapabilities(showTenantCode.value ? tenantCode.value.trim() : undefined);
  if (current === sequence && !error) capabilities.value = data;
}
watch(tenantCode, () => {
  capabilities.value = null;
  sequence++;
});
const appStore = useAppStore();
const themeStore = useThemeStore();
onMounted(async () => {
  const { data } = await fetchLoginOptions();
  if (data) showTenantCode.value = shouldShowTenantCodeInput(data.tenantMode, data.tenantLocator);
  await loadCapabilities();
  const values = await refreshPublicSettings();
  if (values.default_locale) appStore.applyDefaultLocale(values.default_locale);
});

interface LoginModule {
  label: App.I18n.I18nKey;
  component: Component;
}

const moduleMap: Record<UnionKey.LoginModule, LoginModule> = {
  'pwd-login': { label: loginModuleRecord['pwd-login'], component: PwdLogin },
  register: { label: loginModuleRecord.register, component: Register },
  'reset-pwd': { label: loginModuleRecord['reset-pwd'], component: ResetPwd },
  'bind-wechat': { label: loginModuleRecord['bind-wechat'], component: BindWechat }
};

const activeModule = computed(() => moduleMap[props.module || 'pwd-login'] || moduleMap['pwd-login']);

const bgThemeColor = computed(() =>
  themeStore.darkMode ? getPaletteColorByNumber(themeStore.themeColor, 600) : themeStore.themeColor
);

const bgColor = computed(() => {
  const COLOR_WHITE = '#ffffff';

  const ratio = themeStore.darkMode ? 0.5 : 0.2;

  return mixColor(COLOR_WHITE, themeStore.themeColor, ratio);
});
</script>

<template>
  <div class="relative size-full flex overflow-x-hidden overflow-y-auto p-12px" :style="{ backgroundColor: bgColor }">
    <WaveBg :theme-color="bgThemeColor" />
    <NCard :bordered="false" content-style="padding: 0" class="relative z-4 m-auto w-448px max-w-full shrink-0 rd-12px">
      <div class="w-full p-24px sm:py-32px">
        <header class="flex-y-center justify-between">
          <SystemLogo class="size-64px lt-sm:size-48px" />
          <h3 class="text-28px text-primary font-500 lt-sm:text-22px">
            {{ brandSettings.site_name || $t('system.title') }}
          </h3>
          <div class="i-flex-col">
            <ThemeSchemaSwitch
              :theme-schema="themeStore.themeScheme"
              :show-tooltip="false"
              class="text-20px lt-sm:text-18px"
              @switch="themeStore.toggleThemeScheme"
            />
            <LangSwitch
              v-if="themeStore.header.multilingual.visible"
              :lang="appStore.locale"
              :lang-options="appStore.localeOptions"
              :show-tooltip="false"
              @change-lang="appStore.changeLocale"
            />
          </div>
        </header>
        <main class="pt-24px">
          <h3 class="text-18px text-primary font-medium">{{ $t(activeModule.label) }}</h3>
          <NFormItem v-if="showTenantCode" :label="$t('page.login.common.tenantCodePlaceholder')" class="mt-16px">
            <NInput v-model:value="tenantCode" @blur="loadCapabilities" @keyup.enter="loadCapabilities" />
          </NFormItem>
          <div class="pt-24px">
            <Transition :name="themeStore.page.animateMode" mode="out-in" appear>
              <component
                :is="activeModule.component"
                :tenant-code="showTenantCode ? tenantCode.trim() : undefined"
                :capabilities="capabilities"
              />
            </Transition>
          </div>
        </main>
      </div>
    </NCard>
  </div>
</template>

<style scoped></style>
