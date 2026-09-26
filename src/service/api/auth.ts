import { request } from '../request';
import { buildLoginPayload } from '@/utils/tenant-auth';

/**
 * Login
 *
 * @param userName User name
 * @param password Password
 * @param tenantCode Optional pre-auth tenant locator for hosted deployments
 */
export function fetchLogin(userName: string, password: string, tenantCode?: string) {
  return request<Api.Auth.LoginToken>({
    url: '/auth/login',
    method: 'post',
    data: buildLoginPayload(userName, password, tenantCode)
  });
}

/** Get user info */
export function fetchGetUserInfo() {
  return request<Api.Auth.UserInfo>({ url: '/auth/getUserInfo' });
}

/** Logout: 把当前 token 加入黑名单，立即失效 */
export function fetchLogout(refreshToken?: string) {
  return request<App.Service.Response<any>>({
    url: '/auth/logout',
    method: 'post',
    data: refreshToken ? { refreshToken } : {}
  });
}

/** Refresh token: 用 refresh token 换取新的 access + refresh token 对 */
export function fetchRefreshToken(refreshToken: string) {
  return request<Api.Auth.LoginToken>({
    url: '/auth/refreshToken',
    method: 'post',
    data: { refreshToken }
  });
}

/**
 * return custom backend error
 *
 * @param code error code
 * @param msg error message
 */
export function fetchCustomBackendError(code: string, msg: string) {
  return request({ url: '/auth/error', params: { code, msg } });
}

export function fetchLoginOptions() {
  return request<{ defaultLocale: string; tenantMode: 'single' | 'hosted'; tenantLocator: 'code' | 'host' }>({
    url: '/auth/login-options'
  });
}
