import { request } from '../request';

/** get role list */
export function fetchGetRoleList(params?: Api.SystemManage.RoleSearchParams) {
  return request<Api.SystemManage.RoleList>({
    url: '/system/role/list',
    method: 'get',
    params
  });
}

export function fetchGetRoleMenuList(roleId: string) {
  return request<string[]>({
    url: `/system/role/menus/${roleId}`,
    method: 'get'
  });
}

export function fetchSaveRole(data: Api.SystemManage.CreateRoleParams) {
  return request<App.Service.Response<any>>({
    url: '/system/role/add',
    method: 'post',
    data
  });
}

export function fetchUpdateRole(roleId: string, data: Api.SystemManage.CreateRoleParams) {
  return request<App.Service.Response<any>>({
    url: `/system/role/${roleId}`,
    method: 'put',
    data
  });
}

export function fetchUpdateRoleMenu(roleId: string, data: Array<string | number>) {
  return request<App.Service.Response<any>>({
    url: `/system/role/menu/${roleId}`,
    method: 'put',
    data
  });
}

export function fetchDeleteRole(roleId: string) {
  return request({
    url: `/system/role/${roleId}`,
    method: 'delete'
  });
}

export function fetchBatchDeleteRole(data: string[]) {
  return request({
    url: `/system/role/batch-delete`,
    method: 'post',
    data
  });
}

/**
 * get all roles
 *
 * these roles are all enabled
 */
export function fetchGetAllRoles() {
  return request<Api.SystemManage.AllRole[]>({
    url: '/system/role/all',
    method: 'get'
  });
}

/** get user list */
export function fetchGetUserList(params?: Api.SystemManage.UserSearchParams) {
  return request<Api.SystemManage.UserList>({
    url: '/system/user/list',
    method: 'get',
    params
  });
}

export function fetchSaveUser(data: Api.SystemManage.CreateUserParams) {
  return request<App.Service.Response<any>>({
    url: '/system/user/add',
    method: 'post',
    data
  });
}

export function fetchUpdateUser(userId: string, data: Api.SystemManage.CreateUserParams) {
  return request<App.Service.Response<any>>({
    url: `/system/user/${userId}`,
    method: 'put',
    data
  });
}

export function fetchDeleteUser(userId: string) {
  return request({
    url: `/system/user/${userId}`,
    method: 'delete'
  });
}

export function fetchBatchDeleteUser(data: string[]) {
  return request({
    url: `/system/user/batch-delete`,
    method: 'post',
    data
  });
}

/** get menu list */
export function fetchGetMenuList() {
  return request<Api.SystemManage.MenuList>({
    url: '/system/menu/tree-list',
    method: 'get'
  });
}

/** get all pages */
export function fetchGetAllPages() {
  return request<string[]>({
    url: '/system/menu/getAllPages',
    method: 'get'
  });
}

/** get menu tree */
export function fetchGetMenuTree() {
  return request<Api.SystemManage.MenuTree[]>({
    url: '/system/menu/tree-option',
    method: 'get'
  });
}

export function fetchSaveMenu(data: Api.SystemManage.CreateMenuParams) {
  return request<App.Service.Response<any>>({
    url: '/system/menu/add',
    method: 'post',
    data
  });
}

export function fetchUpdateMenu(menuId: string, data: Api.SystemManage.CreateMenuParams) {
  return request<App.Service.Response<any>>({
    url: `/system/menu/${menuId}`,
    method: 'put',
    data
  });
}

export function fetchDeleteMenu(menuId: string) {
  return request({
    url: `/system/menu/${menuId}`,
    method: 'delete'
  });
}

export function fetchBatchDeleteMenu(data: string[]) {
  return request({
    url: `/system/menu/batch-delete`,
    method: 'post',
    data
  });
}

/** get dict type list */
export function fetchGetDictTypeList(params?: Api.SystemManage.DictTypeSearchParams) {
  return request<Api.SystemManage.DictTypeList>({
    url: '/system/dict-type/list',
    method: 'get',
    params
  });
}

/**
 * get all dict types
 *
 * these dict types are all enabled
 */
export function fetchGetAllDictTypes() {
  return request<Api.SystemManage.DictTypeSimple[]>({
    url: '/system/dict-type/all',
    method: 'get'
  });
}

/** save dict type */
export function fetchSaveDictType(data: Api.SystemManage.DictTypeCreateParams) {
  return request<App.Service.Response<any>>({
    url: '/system/dict-type/add',
    method: 'post',
    data
  });
}

/** update dict type */
export function fetchUpdateDictType(typeId: number, data: Api.SystemManage.DictTypeCreateParams) {
  return request<App.Service.Response<any>>({
    url: `/system/dict-type/${typeId}`,
    method: 'put',
    data
  });
}

/** delete dict type */
export function fetchDeleteDictType(typeId: number) {
  return request({
    url: `/system/dict-type/${typeId}`,
    method: 'delete'
  });
}

/** batch delete dict type */
export function fetchBatchDeleteDictType(data: string[]) {
  return request({
    url: '/system/dict-type/batch-delete',
    method: 'post',
    data
  });
}

/** get dict data list */
export function fetchGetDictDataList(params?: Api.SystemManage.DictDataSearchParams) {
  return request<Api.SystemManage.DictDataList>({
    url: '/system/dict-data/list',
    method: 'get',
    params
  });
}

/** get dict data by dict type */
export function fetchGetDictDataByType(dictType: string) {
  return request<Api.SystemManage.DictData[]>({
    url: `/system/dict-data/type/${dictType}`,
    method: 'get'
  });
}

/** save dict data */
export function fetchSaveDictData(data: Api.SystemManage.DictDataCreateParams) {
  return request<App.Service.Response<any>>({
    url: '/system/dict-data/add',
    method: 'post',
    data
  });
}

/** update dict data */
export function fetchUpdateDictData(dictCode: string, data: Api.SystemManage.DictDataCreateParams) {
  return request<App.Service.Response<any>>({
    url: `/system/dict-data/${dictCode}`,
    method: 'put',
    data
  });
}

/** delete dict data */
export function fetchDeleteDictData(dictCode: string) {
  return request({
    url: `/system/dict-data/${dictCode}`,
    method: 'delete'
  });
}

/** batch delete dict data */
export function fetchBatchDeleteDictData(data: string[]) {
  return request({
    url: '/system/dict-data/batch-delete',
    method: 'post',
    data
  });
}

/** get dept tree */
export function fetchGetDeptTree(params?: Api.SystemManage.DeptSearchParams) {
  return request<Api.SystemManage.DeptTree[]>({
    url: '/system/dept/tree',
    method: 'get',
    params
  });
}

/** get dept tree option */
export function fetchGetDeptTreeOption() {
  return request<Api.SystemManage.DeptTreeOption[]>({
    url: '/system/dept/tree-option',
    method: 'get'
  });
}

/** save dept */
export function fetchSaveDept(data: Api.SystemManage.DeptCreateParams) {
  return request<App.Service.Response<any>>({
    url: '/system/dept/add',
    method: 'post',
    data
  });
}

/** update dept */
export function fetchUpdateDept(deptId: string, data: Api.SystemManage.DeptCreateParams) {
  return request<App.Service.Response<any>>({
    url: `/system/dept/${deptId}`,
    method: 'put',
    data
  });
}

/** delete dept */
export function fetchDeleteDept(deptId: string) {
  return request({
    url: `/system/dept/${deptId}`,
    method: 'delete'
  });
}

/** batch delete dept */
export function fetchBatchDeleteDept(data: string[]) {
  return request({
    url: '/system/dept/batch-delete',
    method: 'post',
    data
  });
}
