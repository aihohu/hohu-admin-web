import type { App } from 'vue';
import { createI18n } from 'vue-i18n';
import { localStg } from '@/utils/storage';
import messages from './locale';

const i18n = createI18n({
  locale: supportedLocale(localStg.get('lang')) ? localStg.get('lang')! : 'zh-CN',
  fallbackLocale: 'en-US',
  messages,
  legacy: false
});

/**
 * Setup plugin i18n
 *
 * @param app
 */
export function setupI18n(app: App) {
  app.use(i18n);
}

export const $t = i18n.global.t as App.I18n.$T;

export function setLocale(locale: App.I18n.LangType) {
  i18n.global.locale.value = locale;

  document?.querySelector('html')?.setAttribute('lang', locale);
}

export function getLocale(): App.I18n.LangType {
  return i18n.global.locale.value as App.I18n.LangType;
}

/** Translate only explicitly owned built-in text; preserve arbitrary user content. */
export function localizedText(raw: string | null | undefined, key?: string | null): string {
  if (!key) return raw ?? '';
  const translated = i18n.global.t(key);
  return translated === key ? (raw ?? '') : translated;
}

export function supportedLocale(value: string | null | undefined): value is App.I18n.LangType {
  return Boolean(value && Object.hasOwn(messages, value));
}

export function setDefaultLocale(value: string) {
  const fallback = supportedLocale(value) ? value : 'en-US';
  i18n.global.fallbackLocale.value = [fallback, 'en-US'];
  return fallback;
}
