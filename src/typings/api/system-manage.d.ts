declare namespace Api {
  /**
   * namespace SystemManage
   *
   * backend api module: "systemManage"
   */
  namespace SystemManage {
    type CommonSearchParams = Pick<Common.PaginatingCommonParams, 'current' | 'size'>;

    /** dict type */
    type DictType = Common.CommonRecord<{
      /** dict type id */
      dictTypeId: number;
      /** dict name */
      dictName: string;
      /** dict type code */
      dictType: string;
      /** status */
      status: Api.Common.EnableStatus;
      /** remark */
      remark: string | null;
    }>;

    /** dict type search params */
    type DictTypeSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.DictType, 'dictName' | 'dictType' | 'status'> & CommonSearchParams
    >;

    /** dict type list */
    type DictTypeList = Common.PaginatingQueryRecord<DictType>;

    /** dict type simple output */
    type DictTypeSimple = Pick<DictType, 'dictTypeId' | 'dictName' | 'dictType' | 'status'>;

    /** dict type create params */
    type DictTypeCreateParams = Pick<Api.SystemManage.DictType, 'dictName' | 'dictType' | 'status' | 'remark'>;

    /** dict data */
    type DictData = Common.CommonRecord<{
      /** dict data id */
      dictDataId: number;
      /** dict type */
      dictType: string;
      /** dict label */
      dictLabel: string;
      /** dict value */
      dictValue: string;
      /** dict sort */
      dictSort: number;
      /** css class */
      cssClass: string | null;
      /** list class */
      listClass: string | null;
      /** is default */
      isDefault: number | null;
    }>;

    /** dict data search params */
    type DictDataSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.DictData, 'dictType' | 'dictLabel' | 'dictValue' | 'status'> & CommonSearchParams
    >;

    /** dict data list */
    type DictDataList = Common.PaginatingQueryRecord<DictData>;

    /** dict data create params */
    type DictDataCreateParams = Pick<
      Api.SystemManage.DictData,
      'dictType' | 'dictLabel' | 'dictValue' | 'dictSort' | 'cssClass' | 'listClass' | 'isDefault' | 'status'
    >;

    /** role */
    type Role = Common.CommonRecord<{
      /** role id */
      roleId: string;
      /** role name */
      roleName: string;
      /** role code */
      roleCode: string;
      /** role description */
      roleDesc: string;
    }>;

    /** role model params */
    type CreateRoleParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.Role, 'roleName' | 'roleCode' | 'roleDesc' | 'status'> & CommonSearchParams
    >;

    /** role search params */
    type RoleSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.Role, 'roleName' | 'roleCode' | 'status'> & CommonSearchParams
    >;

    /** role list */
    type RoleList = Common.PaginatingQueryRecord<Role>;

    /** all role */
    type AllRole = Pick<Role, 'roleId' | 'roleName' | 'roleCode'>;

    /**
     * user gender
     *
     * - "1": "male"
     * - "2": "female"
     */
    type UserGender = '1' | '2';

    /** user */
    type User = Common.CommonRecord<{
      userId: string;
      /** user name */
      userName: string;
      password: string;
      /** user gender */
      userGender: UserGender | null;
      /** user nick name */
      nickname: string;
      /** user phone */
      userPhone: string;
      /** user email */
      userEmail: string;
      /** user role code collection */
      roles: string[];
    }>;

    type CreateUserParams = Pick<
      Api.SystemManage.User,
      'userName' | 'password' | 'userGender' | 'nickname' | 'userPhone' | 'userEmail' | 'roles' | 'status'
    >;

    /** user search params */
    type UserSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.User, 'userName' | 'userGender' | 'nickname' | 'userPhone' | 'userEmail' | 'status'> &
        CommonSearchParams
    >;

    /** user list */
    type UserList = Common.PaginatingQueryRecord<User>;

    /**
     * menu type
     *
     * - "m": Menu Directory
     * - "c": Component/Menu
     * - "f": Function/Button
     */
    type MenuType = 'M' | 'C';

    type MenuButton = {
      /**
       * button code
       *
       * it can be used to control the button permission
       */
      code: string;
      /** button description */
      desc: string;
    };

    /**
     * icon type
     *
     * - "1": iconify icon
     * - "2": local icon
     */
    type IconType = '1' | '2';

    type MenuPropsOfRoute = Pick<
      import('vue-router').RouteMeta,
      | 'i18nKey'
      | 'keepAlive'
      | 'constant'
      | 'order'
      | 'href'
      | 'hideInMenu'
      | 'activeMenu'
      | 'multiTab'
      | 'fixedIndexInTab'
      | 'query'
    >;

    type Menu = Common.CommonRecord<{
      menuId: string;
      /** parent menu id */
      parentId: string;
      /** menu type */
      menuType: MenuType;
      /** menu name */
      menuName: string;
      /** route name */
      routeName: string;
      /** route path */
      routePath: string;
      /** component */
      component?: string;
      /** iconify icon name or local icon name */
      icon: string;
      /** icon type */
      iconType: IconType;
      /** buttons */
      buttons?: MenuButton[] | null;
      /** children menu */
      children?: Menu[] | null;
    }> &
      MenuPropsOfRoute;

    /** menu list */
    type MenuList = Common.PaginatingQueryRecord<Menu>;

    type MenuTree = {
      id: string;
      label: string;
      pId: string;
      children?: MenuTree[];
    };

    type CreateMenuParams = Pick<
      Api.SystemManage.Menu,
      | 'menuType'
      | 'menuName'
      | 'routeName'
      | 'routePath'
      | 'component'
      | 'order'
      | 'i18nKey'
      | 'icon'
      | 'iconType'
      | 'status'
      | 'parentId'
      | 'keepAlive'
      | 'constant'
      | 'href'
      | 'hideInMenu'
      | 'activeMenu'
      | 'multiTab'
      | 'fixedIndexInTab'
    >;
  }
}
