import { localStg } from '@/utils/storage';

/** Get token */
export function getToken() {
  return localStg.get('token') || '';
}

/** Clear auth storage */
export function clearAuthStorage() {
  return installAuthStorage(null);
}

/** Mark transitions before touching credentials; publish a fresh stable session last. */
export function installAuthStorage(credentials: Api.Auth.LoginToken | null) {
  const revision = crypto.randomUUID();
  localStg.set('authSessionRevision', 'changing:' + revision);
  if (credentials) localStg.set('token', credentials.token);
  else localStg.remove('token');
  if (credentials?.refreshToken) localStg.set('refreshToken', credentials.refreshToken);
  else localStg.remove('refreshToken');
  localStg.set('authSessionRevision', revision);
  return revision;
}

/** Observe login boundaries without clearing credentials installed by another tab. */
export function watchAuthSession(readSnapshot: () => string, onChange: () => void) {
  let accepted = readSnapshot();
  const accept = () => {
    accepted = readSnapshot();
  };
  const check = () => {
    const current = readSnapshot();
    if (current === accepted) return;
    accepted = current;
    onChange();
  };
  const events = ['storage', 'focus', 'pageshow'] as const;
  events.forEach(event => window.addEventListener(event, check));
  return {
    accept,
    stop: () => events.forEach(event => window.removeEventListener(event, check))
  };
}

/** Coalesce concurrent auth-boundary work without suppressing later runs. */
export function createSingleFlightAction(action: () => Promise<void>, readKey?: () => string): () => Promise<void> {
  let active: Promise<void> | null = null;
  let activeKey: string | undefined;

  return () => {
    if (active && (!readKey || activeKey === readKey())) return active;

    const current = action().finally(() => {
      if (active === current) active = null;
    });
    active = current;
    activeKey = readKey?.();
    return current;
  };
}
