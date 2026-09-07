import { localStg } from '@/utils/storage';

/** Get token */
export function getToken() {
  return localStg.get('token') || '';
}

/** Clear auth storage */
export function clearAuthStorage() {
  localStg.remove('token');
  localStg.remove('refreshToken');
}

/** Coalesce concurrent auth-boundary work without suppressing later runs. */
export function createSingleFlightAction(action: () => Promise<void>): () => Promise<void> {
  let active: Promise<void> | null = null;

  return () => {
    if (active) return active;

    const current = action().finally(() => {
      if (active === current) active = null;
    });
    active = current;
    return current;
  };
}
