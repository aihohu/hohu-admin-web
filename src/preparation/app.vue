<script setup lang="ts">
import { NConfigProvider } from 'naive-ui';
import { themeSettings } from '@/theme/settings';
import { addThemeVarsToGlobal, createThemeToken, getNaiveTheme } from '@/store/modules/theme/shared';
import AppProvider from '@/components/common/app-provider.vue';
import { getLocale } from '@/locales';
import { naiveLocales, naiveDateLocales } from '@/locales/naive';
import RolePreparation from './role-preparation.vue';
const colors = {
  primary: themeSettings.themeColor,
  ...themeSettings.otherColor,
  info: themeSettings.isInfoFollowPrimary ? themeSettings.themeColor : themeSettings.otherColor.info
};
const { themeTokens, darkThemeTokens } = createThemeToken(colors, themeSettings.tokens, themeSettings.recommendColor);
addThemeVarsToGlobal(themeTokens, darkThemeTokens);
const theme = getNaiveTheme(colors, themeSettings);
</script>

<template>
  <NConfigProvider
    :theme-overrides="theme"
    :locale="naiveLocales[getLocale()]"
    :date-locale="naiveDateLocales[getLocale()]"
    class="min-h-full bg-layout"
  >
    <AppProvider><RolePreparation /></AppProvider>
  </NConfigProvider>
</template>
