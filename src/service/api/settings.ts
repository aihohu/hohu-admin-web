import { request } from '../request';

export interface SettingField {
  key: string;
  kind: 'text' | 'boolean' | 'integer' | 'select' | 'secret' | 'extensions';
  minimum: number | null;
  maximum: number | null;
  options: string[];
}
export interface SettingGroup {
  mailReady?: boolean;
  roleOptions?: { label: string; value: string }[];
  group: string;
  values: Record<string, string | number | boolean>;
  revision: string;
  fields: SettingField[];
  secretKeys: string[];
  configuredSecrets: string[];
}

export interface MailValues {
  enabled: boolean;
  host: string;
  port: number;
  security: 'TLS' | 'STARTTLS';
  username: string;
  password: string;
  fromEmail: string | null;
  fromName: string;
}
export interface MailConfiguration {
  values: MailValues;
  revision: string;
  configuredPassword: boolean;
  ready: boolean;
  lastTestAt: string | null;
  lastTestStatus: 'untested' | 'accepted' | 'failed';
}
export function fetchMailConfiguration() {
  return request<MailConfiguration>({ url: '/system/setting/mail' });
}
export function saveMailConfiguration(data: { values: MailValues; revision: string; clearPassword: boolean }) {
  return request<MailConfiguration>({ url: '/system/setting/mail', method: 'put', data });
}
export function testMailConfiguration(recipient: string) {
  return request<MailConfiguration>({ url: '/system/setting/mail/test', method: 'post', data: { recipient } });
}
export interface UploadPolicy {
  maxBytes: number;
  extensions: string[];
}
export interface RuntimeSettings {
  defaultLocale: string;
  brand: Record<string, string>;
  defaultAvatar: string;
  requirePrimaryDept: boolean;
  uploads: Record<'general' | 'image' | 'import' | 'ai_file', UploadPolicy>;
}
export function fetchSettingGroups() {
  return request<string[]>({ url: '/system/setting', method: 'get' });
}
export function fetchSettingGroup(group: string) {
  return request<SettingGroup>({ url: `/system/setting/${group}`, method: 'get' });
}
export function saveSettingGroup(group: string, data: Pick<SettingGroup, 'values' | 'revision'>) {
  return request<SettingGroup>({ url: `/system/setting/${group}`, method: 'put', data });
}
export function fetchPublicSettings() {
  return request<Record<string, string>>({ url: '/system/setting/public', method: 'get' });
}
export function fetchRuntimeSettings() {
  return request<RuntimeSettings>({ url: '/system/setting/runtime', method: 'get' });
}
