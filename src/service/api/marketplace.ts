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
    appSlug: string;
    appName: string;
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

  export interface Rating {
    id: string;
    appId: string;
    userId: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  }

  export interface RatingInput {
    rating: number; // 1..5
    comment?: string | null;
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
export function fetchInstalledApps(
  params: {
    current?: number;
    size?: number;
    status?: string | null;
    appSlug?: string | null;
  } = {}
) {
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

/** create a rating for an app (Phase 1: any logged-in user) */
export function createRating(appId: string, data: Marketplace.RatingInput) {
  return request<Marketplace.Rating>({
    url: '/marketplace/rating',
    method: 'post',
    data: { appId, ...data }
  });
}

/** update my rating for an app */
export function updateRating(appId: string, data: Marketplace.RatingInput) {
  return request<Marketplace.Rating>({
    url: `/marketplace/rating/${appId}`,
    method: 'put',
    data
  });
}

/** delete my rating for an app */
export function deleteRating(appId: string) {
  return request<null>({
    url: `/marketplace/rating/${appId}`,
    method: 'delete'
  });
}

// ============ Review (admin) ============

export namespace Review {
  export interface Item {
    id: string;
    appId: string;
    appName: string;
    appSlug: string;
    versionId: string;
    version: string;
    finalStatus: string;
    aiRiskLevel: string | null;
    reviewerId: string | null;
    createdAt: string;
    humanReviewedAt: string | null;
  }

  export interface Detail extends Item {
    manifest: Record<string, any>;
    fileSize: number | null;
    ruleCheckResult: Record<string, any> | null;
    aiReport: Record<string, any> | null;
    humanComment: string | null;
    changelog: string | null;
  }

  export interface ListResult {
    records: Item[];
    total: number;
    current: number;
    size: number;
  }
}

/** fetch pending/all reviews (admin) */
export function fetchReviews(
  params: {
    current?: number;
    size?: number;
    status?: string | null;
    appSlug?: string | null;
  } = {}
) {
  return request<Review.ListResult>({
    url: '/marketplace/admin/reviews',
    method: 'get',
    params
  });
}

/** fetch review detail with manifest */
export function fetchReviewDetail(reviewId: string) {
  return request<Review.Detail>({
    url: `/marketplace/admin/review/${reviewId}`,
    method: 'get'
  });
}

/** approve a review */
export function approveReview(reviewId: string, comment = '') {
  const formData = new FormData();
  formData.append('comment', comment);
  return request<null>({
    url: `/marketplace/admin/review/${reviewId}/approve`,
    method: 'post',
    data: formData
  });
}

/** reject a review */
export function rejectReview(reviewId: string, comment = '') {
  const formData = new FormData();
  formData.append('comment', comment);
  return request<null>({
    url: `/marketplace/admin/review/${reviewId}/reject`,
    method: 'post',
    data: formData
  });
}
