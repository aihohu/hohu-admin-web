import { CanceledError } from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/modules/auth';
import { localStg } from '@/utils/storage';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Local caller context; never a server authorization assertion. */
    hohuAuthSessionRevision?: string;
    hohuAuthSessionAuthenticated?: boolean;
  }
}

export function currentRequestSession(config?: AxiosRequestConfig): boolean {
  const revision = localStg.get('authSessionRevision') || '';
  return Boolean(
    config &&
    typeof config.hohuAuthSessionRevision === 'string' &&
    !revision.startsWith('changing:') &&
    config.hohuAuthSessionRevision === revision &&
    useAuthStore().authSessionRevision === revision &&
    config.hohuAuthSessionAuthenticated === Boolean(localStg.get('token'))
  );
}

export function assertRequestSession(config?: AxiosRequestConfig): void {
  if (!currentRequestSession(config)) throw new CanceledError('Authorization session changed');
}

export function bindRequestSession<T extends AxiosRequestConfig>(config: T): T {
  if (config.hohuAuthSessionRevision !== undefined) {
    assertRequestSession(config);
    return { ...config };
  }
  const bound = {
    ...config,
    hohuAuthSessionRevision: useAuthStore().authSessionRevision,
    hohuAuthSessionAuthenticated: Boolean(localStg.get('token'))
  };
  assertRequestSession(bound);
  return bound;
}
