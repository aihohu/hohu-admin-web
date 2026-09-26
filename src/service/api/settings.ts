import { request } from '../request';

export interface SettingField {
  key: string;
  kind: 'text' | 'boolean' | 'integer' | 'select' | 'secret' | 'extensions';
  minimum: number | null;
  maximum: number | null;
  options: string[];
}
export interface SettingGroup {
  group: string;
  values: Record<string, string | number | boolean>;
  revision: string;
  fields: SettingField[];
  secretKeys: string[];
  configuredSecrets: string[];
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
