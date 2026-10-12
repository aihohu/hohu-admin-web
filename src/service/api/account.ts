import { request } from '../request';

export interface AccountCapabilities {
  registrationEnabled: boolean;
  passwordResetEnabled: boolean;
  emailEnabled: boolean;
  codeMinutes: number;
}
export interface AccountIdentity {
  tenantCode?: string;
  userName: string;
  email: string;
}
export interface CodeReceipt {
  expiresIn: number;
  retryAfter: number;
}
export function fetchAccountCapabilities(tenantCode?: string) {
  return request<AccountCapabilities>({ url: '/auth/capabilities', params: tenantCode ? { tenantCode } : {} });
}
export function sendAccountCode(data: AccountIdentity & { purpose: 'register' | 'reset' }) {
  return request<CodeReceipt>({ url: '/auth/email-code', method: 'post', data });
}
export function submitAccount(
  purpose: 'register' | 'reset',
  data: AccountIdentity & { code: string; password: string }
) {
  return request({ url: purpose === 'register' ? '/auth/register' : '/auth/password-reset', method: 'post', data });
}
export interface EmailStatus {
  email: string;
  verified: boolean;
  enabled: boolean;
  codeMinutes: number;
}
export function fetchEmailStatus() {
  return request<EmailStatus>({ url: '/auth/email' });
}
export function sendBindingCode(data: { email: string; password: string }) {
  return request<CodeReceipt>({ url: '/auth/email/code', method: 'post', data });
}
export function bindEmail(data: { email: string; password: string; code: string }) {
  return request({ url: '/auth/email', method: 'put', data });
}
