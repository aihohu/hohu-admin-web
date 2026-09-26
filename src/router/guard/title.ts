import type { Router } from 'vue-router';
import { useTitle } from '@vueuse/core';
import { localizedText } from '@/locales';

export function createDocumentTitleGuard(router: Router) {
  router.afterEach(to => {
    const { i18nKey, title } = to.meta;

    const documentTitle = localizedText(title, i18nKey);

    useTitle(documentTitle);
  });
}
