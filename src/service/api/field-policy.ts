import { request } from '../request';
import { FieldPolicyError, createFieldPolicyRepository } from './field-policy-contract';

export const fieldPolicyRepository = createFieldPolicyRepository(
  async <T>(url: string, data?: object, signal?: AbortSignal) => {
    const result = await request<T>({ url, method: data ? 'post' : 'get', data, signal });
    if (result.error) {
      const body = result.error.response?.data as { errorCode?: string } | undefined;
      throw new FieldPolicyError(body?.errorCode ?? 'FIELD_POLICY_UNAVAILABLE', result.error.response?.status);
    }
    return result.data as T;
  }
);
