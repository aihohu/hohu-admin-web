import { createFlatRequest } from '@sa/axios';
import type { AxiosResponse } from 'axios';
import { usePlatformStore } from '@/store/modules/platform';
import { getServiceBaseURL } from '@/utils/service';
import { $t } from '@/locales';

const { baseURL } = getServiceBaseURL(import.meta.env, import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y');
const revisions = new WeakMap<object, number>();

/** Platform credentials and failures must never enter tenant refresh/logout handling. */
export const platformRequest = createFlatRequest(
  { baseURL, timeout: 30000 },
  {
    onRequest(config) {
      const store = usePlatformStore();
      revisions.set(config, store.revision);
      if (config.url !== '/platform/auth/login') config.headers.Authorization = `Bearer ${store.token}`;
      return config;
    },
    isBackendSuccess: (response: AxiosResponse<App.Service.Response<unknown>>) => String(response.data.code) === '200',
    transform(response: AxiosResponse<App.Service.Response<unknown>>) {
      if (revisions.get(response.config) !== usePlatformStore().revision) throw new Error('PLATFORM_SESSION_CHANGED');
      return response.data.data;
    },
    onError(error) {
      const store = usePlatformStore();
      const config = error.response?.config || error.config;
      if (config && revisions.get(config) !== store.revision) return;
      const status = error.response?.status;
      if ((status === 401 || status === 403) && config?.url !== '/platform/auth/login') store.setToken('');
      window.$message?.error($t(status === 401 || status === 403 ? 'platform.accessDenied' : 'platform.requestFailed'));
    }
  }
);
