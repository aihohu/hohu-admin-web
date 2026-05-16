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

export function fetchResetUserPassword(userId: string, data: { newPassword: string }) {
  return request<App.Service.Response<any>>({
    url: `/system/user/${userId}/reset-password`,
    method: 'put',
    data
  });
}

export function fetchGetUserProfile() {
  return request<Api.SystemManage.UserProfile>({
    url: '/system/user/profile',
    method: 'get'
  });
}

export function fetchUpdateUserProfile(data: {
  nickname?: string;
  userAvatar?: string | null;
  userGender?: Api.SystemManage.UserGender | null;
  userPhone?: string | null;
  userEmail?: string | null;
}) {
  return request<App.Service.Response<boolean>>({
    url: '/system/user/profile',
    method: 'put',
    data
  });
}

export function fetchChangePassword(data: { oldPassword: string; newPassword: string }) {
  return request<App.Service.Response<boolean>>({
    url: '/system/user/change-password',
    method: 'put',
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

/** upload file */
export function fetchUploadFile(file: File, businessType?: string, businessId?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (businessType) {
    formData.append('business_type', businessType);
  }
  if (businessId) {
    formData.append('business_id', businessId);
  }
  return request<Api.SystemManage.FileRecord>({
    url: '/system/file/upload',
    method: 'post',
    data: formData
  });
}

/** batch upload files */
export function fetchBatchUploadFiles(files: File[], businessType?: string, businessId?: string) {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  if (businessType) {
    formData.append('business_type', businessType);
  }
  if (businessId) {
    formData.append('business_id', businessId);
  }
  return request<Api.SystemManage.FileRecord[]>({
    url: '/system/file/batch-upload',
    method: 'post',
    data: formData
  });
}

/** get file list */
export function fetchGetFileList(params?: Api.SystemManage.FileSearchParams) {
  return request<Api.SystemManage.FileList>({
    url: '/system/file/list',
    method: 'get',
    params
  });
}

/** delete file */
export function fetchDeleteFile(fileId: string) {
  return request({
    url: `/system/file/${fileId}`,
    method: 'delete'
  });
}

/** batch delete file */
export function fetchBatchDeleteFile(data: string[]) {
  return request({
    url: '/system/file/batch-delete',
    method: 'post',
    data
  });
}

/** get job list */
export function fetchGetJobList(params?: Api.SystemManage.JobSearchParams) {
  return request<Api.SystemManage.JobList>({
    url: '/system/job/list',
    method: 'get',
    params
  });
}

/** get registered tasks */
export function fetchGetRegisteredTasks() {
  return request<Api.SystemManage.RegisteredTask[]>({
    url: '/system/job/registered',
    method: 'get'
  });
}

/** save job */
export function fetchSaveJob(data: Api.SystemManage.JobCreateParams) {
  return request<App.Service.Response<any>>({
    url: '/system/job/add',
    method: 'post',
    data
  });
}

/** update job */
export function fetchUpdateJob(data: Api.SystemManage.JobCreateParams & { jobId: string }) {
  return request<App.Service.Response<any>>({
    url: '/system/job/update',
    method: 'put',
    data
  });
}

/** update job status */
export function fetchUpdateJobStatus(jobId: string, status: string) {
  return request<App.Service.Response<any>>({
    url: '/system/job/status',
    method: 'put',
    params: { jobId, status }
  });
}

/** delete job */
export function fetchDeleteJob(jobId: string) {
  return request({
    url: `/system/job/${jobId}`,
    method: 'delete'
  });
}

/** batch delete job */
export function fetchBatchDeleteJob(data: string[]) {
  return request({
    url: '/system/job/batch-delete',
    method: 'post',
    data
  });
}

/** run job now */
export function fetchRunJobNow(jobId: string) {
  return request<App.Service.Response<any>>({
    url: `/system/job/run/${jobId}`,
    method: 'post'
  });
}

/** get job log list */
export function fetchGetJobLogList(params?: Api.SystemManage.JobLogSearchParams) {
  return request<Api.SystemManage.JobLogList>({
    url: '/system/job-log/list',
    method: 'get',
    params
  });
}

/** clean job log */
export function fetchCleanJobLog(days: number) {
  return request<App.Service.Response<any>>({
    url: '/system/job-log/clean',
    method: 'delete',
    params: { days }
  });
}

/** batch delete job log */
export function fetchBatchDeleteJobLog(data: string[]) {
  return request({
    url: '/system/job-log/batch-delete',
    method: 'post',
    data
  });
}

/** get config list */
export function fetchGetConfigList(params?: Api.SystemManage.ConfigSearchParams) {
  return request<Api.SystemManage.ConfigList>({
    url: '/system/config/list',
    method: 'get',
    params
  });
}

/** save config */
export function fetchSaveConfig(data: Api.SystemManage.ConfigCreateParams) {
  return request<App.Service.Response<any>>({
    url: '/system/config/add',
    method: 'post',
    data
  });
}

/** update config */
export function fetchUpdateConfig(configId: string, data: Api.SystemManage.ConfigCreateParams) {
  return request<App.Service.Response<any>>({
    url: `/system/config/${configId}`,
    method: 'put',
    data
  });
}

/** delete config */
export function fetchDeleteConfig(configId: string) {
  return request({
    url: `/system/config/${configId}`,
    method: 'delete'
  });
}

/** batch delete config */
export function fetchBatchDeleteConfig(data: string[]) {
  return request({
    url: '/system/config/batch-delete',
    method: 'post',
    data
  });
}
