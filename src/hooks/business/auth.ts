import { useAuthStore } from '@/store/modules/auth';

export function useAuth() {
  const authStore = useAuthStore();

  function hasAuth(codes: string | string[]) {
    if (!authStore.isLogin) {
      return false;
    }

    const { buttons } = authStore.userInfo;

    if (buttons.includes('*')) {
      return true;
    }

    if (typeof codes === 'string') {
      return buttons.includes(codes);
    }

    return codes.some(code => buttons.includes(code));
  }

  function hasRole(codes: string | string[]) {
    if (!authStore.isLogin) {
      return false;
    }

    const roleCodes = Array.isArray(codes) ? codes : [codes];
    return roleCodes.some(code => authStore.userInfo.roles.includes(code));
  }

  function hasSuperAdminAuth(code: string) {
    return hasRole('R_SUPER') && authStore.userInfo.buttons.includes(code);
  }

  return {
    hasAuth,
    hasRole,
    hasSuperAdminAuth
  };
}
