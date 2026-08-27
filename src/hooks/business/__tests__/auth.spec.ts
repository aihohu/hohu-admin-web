import { beforeEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  isLogin: true,
  userInfo: {
    roles: ['R_SUPER'],
    buttons: ['*']
  }
}));

vi.mock('@/store/modules/auth', () => ({
  useAuthStore: () => authState
}));

import { useAuth } from '../auth';

describe('useAuth destructive permission composition', () => {
  beforeEach(() => {
    authState.isLogin = true;
    authState.userInfo.roles = ['R_SUPER'];
    authState.userInfo.buttons = ['*'];
  });

  it('does not treat the wildcard as an exact destructive permission', () => {
    const { hasAuth, hasSuperAdminAuth } = useAuth();

    expect(hasAuth('system:role:delete')).toBe(true);
    expect(hasSuperAdminAuth('system:role:delete')).toBe(false);
  });

  it('requires both R_SUPER and the explicit permission', () => {
    authState.userInfo.buttons = ['*', 'system:role:delete'];
    const { hasSuperAdminAuth } = useAuth();

    expect(hasSuperAdminAuth('system:role:delete')).toBe(true);
    authState.userInfo.roles = ['R_ADMIN'];
    expect(hasSuperAdminAuth('system:role:delete')).toBe(false);
  });

  it('evaluates logged-out, exact, and any-of permission and role checks', () => {
    const { hasAuth, hasRole } = useAuth();
    authState.isLogin = false;
    expect(hasAuth('system:role:list')).toBe(false);
    expect(hasRole('R_SUPER')).toBe(false);

    authState.isLogin = true;
    authState.userInfo.buttons = ['system:role:list'];
    authState.userInfo.roles = ['R_AUDITOR'];
    expect(hasAuth('system:role:list')).toBe(true);
    expect(hasAuth('system:role:delete')).toBe(false);
    expect(hasAuth(['system:role:delete', 'system:role:list'])).toBe(true);
    expect(hasAuth(['system:role:delete'])).toBe(false);
    expect(hasRole('R_AUDITOR')).toBe(true);
    expect(hasRole(['R_SUPER', 'R_AUDITOR'])).toBe(true);
    expect(hasRole(['R_SUPER'])).toBe(false);
  });
});
