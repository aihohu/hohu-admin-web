import { platformRequest } from '@/service/request/platform';

export function fetchPlatformLogin(principalName: string, password: string) {
  return platformRequest<{ token: string }>({
    url: '/platform/auth/login',
    method: 'post',
    data: { principalName, password }
  });
}

export function fetchPlatformIdentity() {
  return platformRequest<Api.Platform.Identity>({ url: '/platform/auth/me' });
}

export function platformAuditHeaders(audit?: Api.Platform.AuditContext) {
  const correlation = crypto.randomUUID();
  return {
    'X-Platform-Reason': encodeURIComponent(audit?.reason.trim() || 'Review Agent configuration in platform console'),
    'X-Platform-Reason-Encoding': 'uri-component',
    'X-Platform-Ticket': audit?.ticket.trim() || `UI-${correlation}`,
    'X-Correlation-ID': correlation
  };
}
