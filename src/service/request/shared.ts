import { useAuthStore } from '@/store/modules/auth';
import { localStg } from '@/utils/storage';
import { fetchRefreshToken } from '../api';
import type { RequestInstanceState } from './type';

export function getAuthorization() {
  const token = localStg.get('token');
  const Authorization = token ? `Bearer ${token}` : null;

  return Authorization;
}

/**
 * Handle token expired: 用 refresh token 换新 access token，失败则登出。
 *
 * 单飞语义：refreshTokenPromise 保证并发请求只触发一次 refresh。
 */
async function handleRefreshToken(revision: string, rToken: string) {
  const { resetStore } = useAuthStore();
  const current = () =>
    (localStg.get('authSessionRevision') || '') === revision && (localStg.get('refreshToken') || '') === rToken;
  if (!rToken) {
    if (current()) resetStore();
    return false;
  }

  const { error, data } = await fetchRefreshToken(rToken);
  if (!current()) return false;
  if (!error) {
    localStg.set('token', data.token);
    localStg.set('refreshToken', data.refreshToken);
    return true;
  }

  resetStore();
  return false;
}

export async function handleExpiredRequest(
  state: RequestInstanceState,
  revision = localStg.get('authSessionRevision') || ''
) {
  if (revision.startsWith('changing:') || (localStg.get('authSessionRevision') || '') !== revision) return false;
  if (!state.refreshTokenPromise || state.refreshTokenSessionRevision !== revision) {
    state.refreshTokenSessionRevision = revision;
    state.refreshTokenPromise = handleRefreshToken(revision, localStg.get('refreshToken') || '');
  }
  const pending = state.refreshTokenPromise;
  try {
    const result = await pending;
    return result && (localStg.get('authSessionRevision') || '') === revision;
  } finally {
    if (state.refreshTokenPromise === pending) {
      state.refreshTokenPromise = null;
      state.refreshTokenSessionRevision = undefined;
    }
  }
}

export function showErrorMsg(state: RequestInstanceState, message: string) {
  if (!state.errMsgStack?.length) {
    state.errMsgStack = [];
  }

  const isExist = state.errMsgStack.includes(message);

  if (!isExist) {
    state.errMsgStack.push(message);

    window.$message?.error(message, {
      onLeave: () => {
        state.errMsgStack = state.errMsgStack.filter(msg => msg !== message);

        setTimeout(() => {
          state.errMsgStack = [];
        }, 5000);
      }
    });
  }
}
