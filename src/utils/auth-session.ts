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

/** Bind delayed UI work to the identity already accepted by this tab. */
export function createClientSessionGuard(readAcceptedRevision: () => string) {
  const session = readClientSession();
  const revision = readAcceptedRevision();
  const accepted = revision === session.revision;
  return () => accepted && readAcceptedRevision() === revision && sameClientSession(session);
}
