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

/** parse and classify a user spreadsheet without writing users */
export function fetchDryRunImportUsers(
  file: File,
  reason: string,
  onConflict: Api.SystemManage.UserImportConflictStrategy = 'skip'
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('reason', reason);
  formData.append('on_conflict', onConflict);
  formData.append('dry_run', 'true');
  return request<Api.SystemManage.UserImportDryRunResult>({
    url: '/system/user/import',
    method: 'post',
    data: formData
  });
}

/** execute a previously validated user import preview */
export function fetchExecuteImportUsers(
  file: File,
  reason: string,
  previewToken: string,
  onConflict: Api.SystemManage.UserImportConflictStrategy = 'skip',
  syncMode: Api.SystemManage.UserImportSyncMode = 'CREATE_ONLY'
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('reason', reason);
  formData.append('preview_token', previewToken);
  formData.append('on_conflict', onConflict);
  formData.append('sync_mode', syncMode);
  return request<Api.SystemManage.UserImportExecuteResult>({
    url: '/system/user/import',
    method: 'post',
    data: formData
  });
}

/** cancel a preview immediately or request cooperative cancellation for a running batch */
export function fetchCancelImportBatch(batchId: string, reason?: string) {
  return request<{ cancelledAt: string }>({
    url: `/system/user/import/${batchId}/cancel`,
    method: 'post',
    data: reason ? { reason } : undefined
  });
}

/** download the validated multi-sheet user import template */
export function fetchDownloadImportTemplate() {
  return request<Blob>({
    url: '/system/user/import/template',
    method: 'get',
    responseType: 'blob' as any
  });
}

/** list import batches with status, operator and time filters */
export function fetchGetImportBatchList(params?: Api.SystemManage.UserImportBatchQuery) {
  return request<Api.SystemManage.UserImportBatchList>({
    url: '/system/user/import',
    method: 'get',
    params
  });
}

/** get an import batch by ID */
export function fetchGetImportBatchDetail(batchId: string) {
  return request<Api.SystemManage.UserImportBatch>({
    url: `/system/user/import/${batchId}`,
    method: 'get'
  });
}

/** list audited events for an import batch */
export function fetchGetImportBatchLogs(batchId: string, params?: Api.SystemManage.UserImportBatchLogQuery) {
  return request<Api.SystemManage.UserImportBatchLogList>({
    url: `/system/user/import/${batchId}/logs`,
    method: 'get',
    params
  });
}

/** export filtered users to an XLSX Blob with an audit reason */
export function fetchExportUsers(data: Api.SystemManage.UserExportRequest) {
  return request<Blob>({
    url: '/system/user/export',
    method: 'post',
    data,
    responseType: 'blob' as any
  });
}

/**
 * Download an already-generated export file.
 * Tool cards call this endpoint with the same `system:user:export` permission as a direct export.
 */
export function fetchDownloadExportFile(exportId: string) {
  return request<Blob>({
    url: `/system/user/export/${exportId}/download`,
    method: 'get',
    responseType: 'blob' as any
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

/** get dept users (members + candidates) */
export function fetchGetDeptUsers(deptId: string) {
  return request<Api.SystemManage.DeptUsersOut>({
    url: `/system/dept/${deptId}/users`,
    method: 'get'
  });
}

/** update dept users (final member ids) */
export function fetchUpdateDeptUsers(deptId: string, data: Api.SystemManage.DeptUsersUpdateParams) {
  return request<App.Service.Response<any>>({
    url: `/system/dept/${deptId}/users`,
    method: 'put',
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

/** export config to excel */
export function fetchExportConfig(params?: Api.SystemManage.ConfigSearchParams) {
  return request<Blob>({
    url: '/system/config/export',
    method: 'get',
    params,
    responseType: 'blob' as any
  });
}

/** import config from excel */
export function fetchImportConfig(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request({
    url: '/system/config/import',
    method: 'post',
    data: formData
  });
}

/** get operation log list */
export function fetchGetOperationLogList(params?: Api.SystemManage.OperationLogSearchParams) {
  return request<Api.SystemManage.OperationLogList>({
    url: '/system/operation-log/list',
    method: 'get',
    params
  });
}

/** clean operation log */
export function fetchCleanOperationLog(days: number) {
  return request<App.Service.Response<any>>({
    url: '/system/operation-log/clean',
    method: 'delete',
    params: { days }
  });
}

/** batch delete operation log */
export function fetchBatchDeleteOperationLog(data: string[]) {
  return request({
    url: '/system/operation-log/batch-delete',
    method: 'post',
    data
  });
}

/** get login log list */
export function fetchGetLoginLogList(params?: Api.SystemManage.LoginLogSearchParams) {
  return request<Api.SystemManage.LoginLogList>({
    url: '/system/login-log/list',
    method: 'get',
    params
  });
}

/** clean login log */
export function fetchCleanLoginLog(days: number) {
  return request<App.Service.Response<any>>({
    url: '/system/login-log/clean',
    method: 'delete',
    params: { days }
  });
}

/** batch delete login log */
export function fetchBatchDeleteLoginLog(data: string[]) {
  return request({
    url: '/system/login-log/batch-delete',
    method: 'post',
    data
  });
}

/** get data scope demo list (applies data scope filter) */
export function fetchGetDataScopeDemoList(params?: Api.SystemManage.DataScopeDemoSearchParams) {
  return request<Api.SystemManage.DataScopeDemoList>({
    url: '/system/data-scope-demo/list',
    method: 'get',
    params
  });
}

/** create data scope demo */
export function fetchCreateDataScopeDemo(data: Api.SystemManage.DataScopeDemoCreateParams) {
  return request<App.Service.Response<Api.SystemManage.DataScopeDemo>>({
    url: '/system/data-scope-demo/add',
    method: 'post',
    data
  });
}

/** update data scope demo */
export function fetchUpdateDataScopeDemo(demoId: string, data: Api.SystemManage.DataScopeDemoUpdateParams) {
  return request<App.Service.Response<Api.SystemManage.DataScopeDemo>>({
    url: `/system/data-scope-demo/${demoId}`,
    method: 'put',
    data
  });
}

/** delete data scope demo */
export function fetchDeleteDataScopeDemo(demoId: string) {
  return request<App.Service.Response<any>>({
    url: `/system/data-scope-demo/${demoId}`,
    method: 'delete'
  });
}
