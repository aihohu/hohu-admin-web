import { createFlatRequest } from '@sa/axios';
import { FieldPolicyError, createFieldPolicyRepository } from '../api/field-policy-contract';

type Envelope = { code: number; data: unknown; errorCode?: string };
type Session = { token: string; expiresIn: number; tenantId: string; actorId: string; protocol: string };

export function createPreparationClient(onExpired: () => void) {
  let token = '';
  const transport = createFlatRequest<Envelope, unknown, Record<string, unknown>>(
    { baseURL: window.location.origin, timeout: 25000 },
    {
      onRequest(config) {
        if (token) config.headers.set('Authorization', `Bearer ${token}`);
        return config;
      },
      isBackendSuccess: response => response.data.code === 200,
      transform: response => response.data.data,
      onError(error) {
        if (error.response?.status === 401 && token) {
          token = '';
          onExpired();
        }
      }
    }
  );
  async function call<T>(url: string, data?: object, signal?: AbortSignal): Promise<T> {
    const result = await transport<T>({ url, method: data ? 'post' : 'get', data, signal });
    if (result.error)
      throw new FieldPolicyError(
        result.error.response?.data.errorCode ?? 'FIELD_POLICY_UNAVAILABLE',
        result.error.response?.status
      );
    return result.data as T;
  }
  return {
    repository: createFieldPolicyRepository(call),
    async login(credentials: { tenantCode: string; userName: string; password: string }) {
      token = '';
      const session = await call<Session>('/policy-prepare/login', credentials);
      if (session.protocol !== 'field-management/1')
        throw new FieldPolicyError('FIELD_POLICY_CLIENT_INCOMPATIBLE', 409);
      token = session.token;
      return { tenantId: session.tenantId, actorId: session.actorId, expiresIn: session.expiresIn };
    },
    async logout() {
      try {
        await call('/policy-prepare/logout', {});
      } finally {
        token = '';
        transport.cancelAllRequest();
      }
    },
    async finish() {
      await call('/policy-prepare/finish', {});
      token = '';
      transport.cancelAllRequest();
    },
    dispose() {
      token = '';
      transport.cancelAllRequest();
    }
  };
}
