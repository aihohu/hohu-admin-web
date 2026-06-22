import { request } from '@/service/request';

export namespace Marketplace {
  export interface App {
    id: string;
    name: string;
    slug: string;
    type: string;
    category: string;
    description: string | null;
    icon: string | null;
    authorName: string | null;
    status: string;
    homepage: string | null;
    license: string | null;
    downloadCount: number;
    avgRating: number;
    ratingCount: number;
    createdAt: string;
    updatedAt: string;
  }

  export interface AppDetail extends App {
    currentVersionId: string | null;
    tags: string[];
  }

  export interface AppListResult {
    records: App[];
    total: number;
    current: number;
    size: number;
  }

  export interface Install {
    id: string;
    appId: string;
    installedVersion: string;
    status: string;
    config: Record<string, any> | null;
    installedAt: string;
    updatedAt: string;
  }

  export interface InstallListResult {
    records: Install[];
    total: number;
    current: number;
    size: number;
  }

  export interface Query {
    current?: number;
    size?: number;
    keyword?: string;
    category?: string;
    status?: string | null;
    sort?: string;
  }
}

/** fetch marketplace apps (published) */
export function fetchMarketplaceApps(params: Marketplace.Query = {}) {
  return request<Marketplace.AppListResult>({
    url: '/marketplace/list',
    method: 'get',
    params: { status: 'published', sort: 'download', ...params }
  });
}

/** search apps by keyword */
export function fetchSearchApps(keyword: string, current = 1, size = 10) {
  return request<Marketplace.AppListResult>({
    url: '/marketplace/search',
    method: 'get',
    params: { keyword, current, size }
  });
}

/** fetch app detail by slug */
export function fetchAppDetail(slug: string) {
  return request<Marketplace.AppDetail>({
    url: `/marketplace/detail/${slug}`,
    method: 'get'
  });
}

/** fetch app manifest */
export function fetchAppManifest(slug: string) {
  return request<Record<string, any>>({
    url: `/marketplace/${slug}/manifest`,
    method: 'get'
  });
}

/** install an app */
export function installApp(data: { appSlug: string; approvedPermissions?: any[] }) {
  return request<Marketplace.Install>({
    url: '/marketplace/install',
    method: 'post',
    data
  });
}

/** uninstall an app */
export function uninstallApp(slug: string) {
  return request<null>({
    url: `/marketplace/uninstall/${slug}`,
    method: 'post'
  });
}

/** enable an installed app */
export function enableApp(slug: string) {
  return request<Marketplace.Install>({
    url: `/marketplace/enable/${slug}`,
    method: 'post'
  });
}

/** disable an installed app */
export function disableApp(slug: string) {
  return request<Marketplace.Install>({
    url: `/marketplace/disable/${slug}`,
    method: 'post'
  });
}

/** fetch installed apps */
export function fetchInstalledApps(params: { current?: number; size?: number; status?: string } = {}) {
  return request<Marketplace.InstallListResult>({
    url: '/marketplace/installed',
    method: 'get',
    params
  });
}

/** upload app package (developer) */
export function uploadApp(file: File, manifestJson: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('manifest_json', manifestJson);
  return request<Record<string, any>>({
    url: '/marketplace/developer/upload',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

/** fetch my uploaded apps (developer) */
export function fetchMyApps() {
  return request<Marketplace.App[]>({
    url: '/marketplace/developer/my-apps',
    method: 'get'
  });
}
