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
