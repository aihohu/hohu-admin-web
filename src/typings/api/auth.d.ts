declare namespace Api {
  /**
   * namespace Auth
   *
   * backend api module: "auth"
   */
  namespace Auth {
    interface LoginParams {
      userName: string;
      password: string;
      tenantCode?: string;
    }

    interface LoginToken {
      token: string;
      refreshToken: string;
    }

    interface UserInfo {
      userId: string;
      userName: string;
      userAvatar: string;
      roles: string[];
      buttons: string[];
      isSystemAdmin?: boolean;
    }
  }
}
