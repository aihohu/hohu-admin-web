import { request } from '@/service/request';

export interface AppContributeMenu {
  app_slug: string;
  app_name: string;
  title: string;
  icon: string | null;
  parent: string | null;
  order: number;
}

export interface AppContributePage {
  app_slug: string;
  key: string;
  title: string;
  page_type: string;
}

export interface AppContributes {
  menus: AppContributeMenu[];
  pages: AppContributePage[];
}

/** 获取 contributes 缓存（前端初始化时调用） */
export function fetchAppContributes() {
  return request<AppContributes>({
    url: '/api/v1/contributes/',
    method: 'get'
  });
}

/** 获取应用详情（含 manifest） */
export function fetchAppDetail(slug: string) {
  return request<Record<string, any>>({
    url: `/marketplace/detail/${slug}`,
    method: 'get'
  });
}

/** 获取应用当前版本的完整 manifest */
export function fetchAppManifest(slug: string) {
  return request<Record<string, any>>({
    url: `/marketplace/${slug}/manifest`,
    method: 'get'
  });
}

/** 动态数据 CRUD */
export function fetchAppData(slug: string, model: string, params: Record<string, any> = {}) {
  return request<{
    records: any[];
    total: number;
    current: number;
    size: number;
  }>({
    url: `/api/v1/app-data/${slug}/${model}`,
    method: 'get',
    params
  });
}

export function createAppData(slug: string, model: string, data: Record<string, any>) {
  return request<Record<string, any>>({
    url: `/api/v1/app-data/${slug}/${model}`,
    method: 'post',
    data
  });
}

export function updateAppData(slug: string, model: string, id: string | number, data: Record<string, any>) {
  return request<Record<string, any>>({
    url: `/api/v1/app-data/${slug}/${model}/${id}`,
    method: 'put',
    data
  });
}

export function deleteAppData(slug: string, model: string, id: string | number) {
  return request<null>({
    url: `/api/v1/app-data/${slug}/${model}/${id}`,
    method: 'delete'
  });
}

export function getAppData(slug: string, model: string, id: string | number) {
  return request<Record<string, any>>({
    url: `/api/v1/app-data/${slug}/${model}/${id}`,
    method: 'get'
  });
}
