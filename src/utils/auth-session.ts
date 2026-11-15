import { localStg } from '@/utils/storage';

export function readClientSession() {
  return {
    revision: localStg.get('authSessionRevision') || '',
    authenticated: Boolean(localStg.get('token'))
  };
}

export function sameClientSession(expected: ReturnType<typeof readClientSession>): boolean {
  const current = readClientSession();
  return (
    !current.revision.startsWith('changing:') &&
    current.revision === expected.revision &&
    current.authenticated === expected.authenticated
  );
}
