declare namespace Api {
  /**
   * namespace SystemManage
   *
   * backend api module: "systemManage"
   */
  namespace SystemManage {
    type CommonSearchParams = Pick<Common.PaginatingCommonParams, 'current' | 'size'>;

    type OrdinaryCapabilities = {
      read?: string[];
      query?: string[];
      create?: string[];
      update?: string[];
      canCreate?: boolean;
    };
    type OrdinaryPage<T> = Common.PaginatingQueryRecord<T> & { fieldPolicy: OrdinaryCapabilities };
    type RelationFormQuery = { mode: 'create' | 'update'; recordId?: string; parentId?: string };
    type RelationCapabilities = Required<OrdinaryCapabilities> & {
      readLevels: Record<string, 'plain' | 'masked' | 'hidden'>;
      specialCreate: string[];
      specialUpdate: string[];
      complete: Record<string, boolean>;
    };
    type RelationFormContext<T> = { record: Partial<T> | null; fieldPolicy: RelationCapabilities };
    type ControlCapabilities = RelationCapabilities & {
      controlActions: { canImport: boolean; canExport: boolean; canRun: boolean };
    };
    type ControlFormQuery = { mode: 'create' | 'update'; recordId?: string };
    type ControlFormContext<T> = Omit<RelationFormContext<T>, 'fieldPolicy'> & {
      fieldPolicy: ControlCapabilities;
      formReceipt: string;
      publicationRevision?: string;
      revocationRevision?: string;
    };
    type DictTypeCreateParams = {
      dictName: string;
      dictType: string;
      status: Common.EnableStatus;
      remark: string | null;
    };
    type DictType = Partial<DictTypeCreateParams> & {
      dictTypeId: string;
      createTime?: string;
      fieldPolicy?: OrdinaryCapabilities;
    };
    type DictTypeSearchParams = CommonType.RecordNullable<
      Pick<DictTypeCreateParams, 'dictName' | 'dictType' | 'status'> & CommonSearchParams
    >;
    type DictTypeList = OrdinaryPage<DictType>;
    type DictTypeSimple = Pick<DictType, 'dictTypeId' | 'status'> & Required<Pick<DictType, 'dictName' | 'dictType'>>;
    type DictDataCreateParams = {
      dictType: string;
      dictLabel: string;
      dictValue: string;
      dictSort: number;
      cssClass: string | null;
      listClass: string | null;
      isDefault: 'Y' | 'N';
      status: Common.EnableStatus;
    };
    type DictData = Partial<DictDataCreateParams> & {
      dictCode: string;
      createTime?: string;
      fieldPolicy?: OrdinaryCapabilities;
    };
    type DictDataSearchParams = CommonType.RecordNullable<
      Pick<DictDataCreateParams, 'dictType' | 'dictLabel' | 'dictValue' | 'status'> & CommonSearchParams
    >;
    type DictDataList = OrdinaryPage<DictData>;

    type CreateRoleParams = {
      roleName: string;
      roleCode: string;
      roleDesc: string | null;
      dataScope: '1' | '2' | '3' | '4' | '5';
      status: Common.EnableStatus;
      deptIds?: string[];
    };
    type UpdateRoleParams = Partial<Omit<CreateRoleParams, 'roleCode'>>;
    type Role = Partial<CreateRoleParams> & {
      roleId: string;
      i18nKeys?: Record<string, string> | null;
      createTime?: string;
      fieldPolicy?: RelationCapabilities;
    };
    type RoleSummary = Pick<
      Role,
      'roleId' | 'roleName' | 'roleCode' | 'dataScope' | 'status' | 'i18nKeys' | 'fieldPolicy'
    > & {
      delegable: boolean;
      blockedReasonCode: string | null;
    };

    /** role search params */
    type RoleSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.Role, 'roleName' | 'roleCode' | 'dataScope' | 'status' | 'i18nKeys'> & CommonSearchParams
    >;

    /** role list */
    type RoleList = OrdinaryPage<RoleSummary>;

    /** all role */
    type AllRole = RoleSummary;

    /**
     * user gender
     *
     * - "0": "unknown"
     * - "1": "male"
     * - "2": "female"
     */
    type UserGender = '0' | '1' | '2';

    type UserFieldAccess = {
      read: 'plain' | 'masked' | 'hidden';
      maskId: string | null;
      create: boolean;
      update: boolean;
      replace: boolean;
      queryOps: string[];
    };

    /** user dept association item */
    type UserDeptItem = {
      /** dept id */
      deptId: string;
      /** whether this is the primary dept */
      isPrimary: boolean;
    };

    /** user */
    type User = { userId: string } & Partial<
      Common.CommonRecord<{
        fieldAccess?: Record<string, UserFieldAccess>;
        userId: string;
        /** user name */
        userName: string;
        password: string;
        /** user gender */
        userGender: UserGender | null;
        /** user nick name */
        nickname: string;
        /** user phone */
        userPhone: string | null;
        /** user email */
        userEmail: string | null;
        /** user role code collection */
        roles: Array<string | null>;
        /** user role name display */
        roleNameKeys?: Array<string | null>;
        roleNames: Array<string | null>;
        /** user dept id list (display) */
        deptIds: string[];
        /** user dept names joined string */
        deptNames: string;
        /** primary dept id */
        primaryDept: string | null;
        /** full user-dept associations */
        userDepts: UserDeptItem[];
      }>
    >;

    type UserProfileParams = {
      userName: string;
      nickname: string;
      userGender: UserGender | null;
      userPhone: string | null;
      userEmail: string | null;
      status: Common.EnableStatus;
    };

    type CreateUserParams = UserProfileParams & {
      password: string;
      /** explicit complete role set; omission uses the backend default role */
      roleIds?: string[];
      /** dept associations (required: at least one primary if non-empty) */
      deptIds: Api.SystemManage.UserDeptItem[];
    };

    type UpdateUserParams = UserProfileParams;

    type UserRoleUpdateParams = {
      roleIds: string[];
    };

    type UserDepartmentUpdateParams = {
      deptAssignments: UserDeptItem[];
    };

    type AssignableRole = {
      roleId: string;
      roleCode: string;
      roleName: string;
      i18nKeys?: Record<string, string> | null;
      dataScope: string;
    };

    /** user search params */
    type UserSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.User, 'userName' | 'userGender' | 'nickname' | 'userPhone' | 'userEmail' | 'status'> & {
        roleCode: string | null;
      } & CommonSearchParams
    >;

    /** user list */
    type UserList = Common.PaginatingQueryRecord<User>;

    /** action taken when an imported user already exists */
    type UserImportConflictStrategy = 'skip' | 'overwrite' | 'fail_fast';

    /** fields that an import is allowed to create or update */
    type UserImportSyncMode = 'CREATE_ONLY' | 'UPDATE_PROFILE' | 'FULL_SYNC';

    /** normalized record parsed from one spreadsheet row */
    type UserImportRecord = {
      rowNum: number;
      userName: string;
      employeeNo: string | null;
      nickname: string | null;
      userEmail: string | null;
      userPhone: string | null;
      deptInput: string;
      roleInput: string | null;
      userGender: '0' | '1' | '2';
      status: '0' | '1';
    };

    /** validation or scope failure associated with one imported row */
    type UserImportFailedRow = {
      rowNum: number;
      field: string;
      value: string;
      reason: string;
      errorCode: string;
    };

    /** classified preview returned before an import is executed */
    type UserImportDryRunResult = {
      total: number;
      newRecords: UserImportRecord[];
      existsRecords: UserImportRecord[];
      conflictRecords: UserImportFailedRow[];
      outOfScopeRecords: UserImportFailedRow[];
      newRecordsTruncated: boolean;
      existsRecordsTruncated: boolean;
      conflictRecordsTruncated: boolean;
      outOfScopeRecordsTruncated: boolean;
      conflictRecordsFile: string | null;
      outOfScopeRecordsFile: string | null;
      /** complete category totals; preview record arrays may be truncated */
      newCount: number;
      existsCount: number;
      conflictCount: number;
      outOfScopeCount: number;
      /** preview batch identifier used by cancellation; absent values disable cancellation defensively */
      batchId?: string;
      previewToken: string;
      expiresAt: string;
    };

    /** final result returned after executing an import preview */
    type UserImportExecuteResult = {
      batchId: string;
      status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
      successCount: number;
      skippedCount: number;
      overwrittenCount: number;
      failedCount: number;
      failedRowsFile: string | null;
      failedRowsPreview: UserImportFailedRow[];
      idempotentReplay: boolean;
    };

    /** import batch lifecycle state */
    type UserImportBatchStatus =
      | 'CREATED'
      | 'PREVIEW_DONE'
      | 'RUNNING'
      | 'SUCCESS'
      | 'PARTIAL_SUCCESS'
      | 'FAILED'
      | 'EXPIRED'
      | 'CANCELLED';

    /** import batch summary returned by list and detail endpoints */
    type TransferCapabilities = { read: string[]; query: string[]; canDownload: boolean; canCancel: boolean };
    type UserImportBatch = { batchId: string; fieldPolicy?: TransferCapabilities } & Partial<{
      batchId: string;
      status: UserImportBatchStatus;
      filename: string | null;
      operatorId: string;
      operatorName: string | null;
      totalRows: number;
      summaryNew: number;
      summaryExists: number;
      summaryConflict: number;
      summaryOutOfScope: number;
      successCount: number;
      skippedCount: number;
      overwrittenCount: number;
      failedCount: number;
      failedRowsFile: string | null;
      onConflict: UserImportConflictStrategy;
      syncMode: UserImportSyncMode;
      createdAt: string;
      startedAt: string | null;
      finishedAt: string | null;
      expiresAt: string | null;
    }>;

    /** import batch list filters */
    type UserImportBatchQuery = CommonSearchParams & {
      status?: UserImportBatchStatus | null;
      operatorId?: string | null;
      startTime?: number | null;
      endTime?: number | null;
    };

    /** paginated import batch list */
    type UserImportBatchList = Common.PaginatingQueryRecord<UserImportBatch> & { fieldPolicy?: TransferCapabilities };

    /** audited import batch transition or action */
    type UserImportBatchLog = { logId: string; fieldPolicy?: TransferCapabilities } & Partial<{
      logId: string;
      batchId: string;
      event: string;
      fromStatus: UserImportBatchStatus | null;
      toStatus: UserImportBatchStatus | null;
      detail: Record<string, unknown> | null;
      counts: Record<string, number> | null;
      operatorId: string | null;
      operatorName: string | null;
      createdAt: string;
    }>;

    /** import batch log filters */
    type UserImportBatchLogQuery = CommonSearchParams & {
      event?: string | null;
    };

    /** paginated batch log list */
    type UserImportBatchLogList = Common.PaginatingQueryRecord<UserImportBatchLog> & {
      fieldPolicy?: TransferCapabilities;
    };

    /** user export filters and mandatory audit reason */
    type UserExportRequest = {
      /** Exact account list to combine into one export, intersected with other filters. */
      userNames?: string[];
      userName?: string | null;
      nickname?: string | null;
      userEmail?: string | null;
      userPhone?: string | null;
      deptId?: string | null;
      status?: Api.Common.EnableStatus | null;
      reason: string;
    };

    /** user export task lifecycle state */
    type UserExportTaskStatus = 'CREATED' | 'SUCCESS' | 'FAILED';

    /** persisted user export task */
    type UserExportTask = { exportId: string; fieldPolicy?: TransferCapabilities } & Partial<{
      exportId: string;
      operatorId: string;
      operatorName: string | null;
      status: UserExportTaskStatus;
      filterSnapshot: Record<string, unknown> | null;
      rowCount: number;
      fileUrl: string | null;
      reason: string;
      errorMessage: string | null;
      createdAt: string;
      finishedAt: string | null;
      expiresAt: string | null;
    }>;

    /** export task list filters */
    type UserExportTaskQuery = CommonSearchParams & {
      status?: UserExportTaskStatus | null;
      operatorId?: string | null;
    };

    /** paginated export task list */
    type UserExportTaskList = Common.PaginatingQueryRecord<UserExportTask> & { fieldPolicy?: TransferCapabilities };

    /** user profile */
    type UserProfile = { userId: string } & Partial<{
      fieldAccess?: Record<string, UserFieldAccess>;
      userId: string;
      userName: string;
      nickname: string;
      userGender: UserGender | null;
      userPhone: string;
      userEmail: string;
      userAvatar: string;
      status: string;
      roles: Array<string | null>;
      createTime: string;
    }>;

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

    type MenuRecord = Common.CommonRecord<{
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

    type Menu = Partial<Omit<MenuRecord, 'menuId'>> & { menuId: string; fieldPolicy?: RelationCapabilities };
    /** menu list */
    type MenuList = OrdinaryPage<Menu>;

    type MenuTree = {
      id: string;
      label: string;
      i18nKey?: string | null;
      pId: string;
      children?: MenuTree[];
    };

    type CreateMenuParams = Pick<
      MenuRecord,
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
      | 'query'
      | 'buttons'
    >;

    type DeptCreateParams = {
      parentId: string | null;
      deptName: string;
      orderNum: number;
      leader: string | null;
      phone: string | null;
      email: string | null;
      status: Common.EnableStatus;
    };
    type Dept = Partial<DeptCreateParams> & {
      deptId: string;
      ancestors?: string | null;
      createTime?: string;
      fieldPolicy?: RelationCapabilities;
    };

    /** dept tree node */
    type DeptTree = Dept & {
      children: DeptTree[];
    };

    /** dept tree select option */
    type DeptTreeOption = {
      id: string;
      label: string;
      i18nKey?: string | null;
      pId: string;
      children?: DeptTreeOption[];
    };

    /** dept search params */
    type DeptSearchParams = CommonType.RecordNullable<Pick<Api.SystemManage.Dept, 'deptName' | 'status' | 'leader'>>;

    type DeptUpdateParams = Partial<Omit<DeptCreateParams, 'parentId'>>;

    /** dept user item (for dept-users management) */
    type DeptUserItem = { userId: string } & Partial<{
      fieldAccess?: Record<string, UserFieldAccess>;
      userId: string;
      userName: string;
      nickname: string | null;
      status: string;
      isMember: boolean;
      isPrimary: boolean;
    }>;

    /** dept users management data */
    type DeptUsersOut = Common.PaginatingQueryRecord<DeptUserItem> & { authorizationEpoch: string };

    type DeptUsersQuery = Pick<CommonSearchParams, 'current' | 'size'> & {
      query?: string;
    };

    /** dept users update params */
    type DeptUsersUpdateParams = {
      userIds: string[];
    };

    /** file record */
    type FileRecord = { fileId: string; fieldPolicy: FileCapabilities } & Partial<{
      /** file id */
      /** original filename */
      originalName: string;
      /** access url */
      /** file size in bytes */
      fileSize: number;
      /** file extension */
      fileExt: string;
      /** mime type */
      mimeType: string | null;
      /** business type */
      businessType: string | null;
      /** business id */
      businessId: string | null;
      /** uploader */
      createBy: string | null;
      ownerName: string | null;
      /** upload time */
      createTime: string;
    }>;

    type FileCapabilities = RelationCapabilities & { canDownload: boolean };
    type FileUploadReceipt = Omit<FileRecord, 'fieldPolicy'> & { fileUrl: string };

    /** file search params */
    type FileSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.FileRecord, 'originalName' | 'businessType' | 'fileExt'> & CommonSearchParams
    >;

    /** file list */
    type FileList = Common.PaginatingQueryRecord<FileRecord> & { fieldPolicy: FileCapabilities };

    /** job status */
    type JobStatus = Api.Common.EnableStatus;

    /** job log status */
    type JobLogStatus = '1' | '2' | '3';

    /** job concurrent strategy */
    type JobConcurrent = '1' | '2';

    /** scheduled job */
    type JobRecord = {
      jobId: string;
      jobName: string;
      jobKey: string;
      cronExpression: string | null;
      triggerType: 'cron' | 'interval';
      intervalValue: number | null;
      intervalUnit: 'seconds' | 'minutes' | 'hours' | 'days' | null;
      jobArgs: string | null;
      status: JobStatus;
      concurrent: JobConcurrent;
      /** per-execution timeout in seconds, null = unlimited */
      timeoutSeconds: number | null;
      /** max retries on failure, 0 = no retry */
      maxRetries: number;
      /** run immediately once when enabled (does not affect subsequent scheduled runs) */
      runOnEnable: boolean;
      remark: string | null;
      createBy: string | null;
      createTime: string;
      updateBy: string | null;
      updateTime: string;
      /** computed at runtime, null when disabled or trigger misconfigured */
      nextRunTime: string | null;
    };

    type Job = Partial<Omit<JobRecord, 'jobId'>> & { jobId: string; fieldPolicy?: ControlCapabilities };

    /** job search params */
    type JobSearchParams = CommonType.RecordNullable<Pick<Job, 'jobName' | 'jobKey' | 'status'> & CommonSearchParams>;

    /** job list */
    type JobList = Common.PaginatingQueryRecord<Job> & { fieldPolicy: ControlCapabilities };

    /** job create params */
    type JobCreateParams = Pick<
      JobRecord,
      | 'jobName'
      | 'jobKey'
      | 'cronExpression'
      | 'triggerType'
      | 'intervalValue'
      | 'intervalUnit'
      | 'jobArgs'
      | 'status'
      | 'concurrent'
      | 'timeoutSeconds'
      | 'maxRetries'
      | 'runOnEnable'
      | 'remark'
    >;
    type JobMetadataParams = Partial<Pick<JobRecord, 'jobName' | 'remark'>> & { jobId: string; formReceipt: string };
    type JobScheduleParams = Partial<Omit<JobCreateParams, 'jobName' | 'jobKey' | 'status' | 'remark'>> & {
      jobId: string;
    };
    type JobDelivery = { notificationStatus: 'notified' | 'unconfirmed' } | null;

    /** registered task */
    type RegisteredTask = {
      key: string;
      labelKey: string;
      parameters: Record<string, unknown>;
    };

    /** job log */
    type JobLog = { jobLogId: string; fieldPolicy?: Common.DeliveryCapabilities } & Partial<{
      jobLogId: string;
      jobId: string;
      jobName: string;
      jobKey: string;
      status: JobLogStatus;
      errorMsg: string | null;
      startTime: string;
      endTime: string | null;
      duration: number | null;
      attemptCount: number;
    }>;

    /** job log search params */
    type JobLogSearchParams = CommonType.RecordNullable<
      Pick<JobLog, 'jobId' | 'jobKey' | 'status'> & {
        startTime: number | null;
        endTime: number | null;
      } & CommonSearchParams
    >;

    /** job log list */
    type JobLogList = Common.PaginatingQueryRecord<JobLog> & { fieldPolicy: Common.DeliveryCapabilities };

    /** system config */
    type ConfigRecord = Common.CommonRecord<{
      /** config id */
      configId: string;
      /** config name */
      configName: string;
      /** config key */
      configKey: string;
      /** config value */
      configValue: string;
      /** config type */
      configType: string;
      /** config group */
      configGroup: string;
      /** is public */
      isPublic: boolean;
      /** remark */
      remark: string | null;
    }>;
    type Config = Partial<Omit<ConfigRecord, 'configId'>> & { configId: string; fieldPolicy?: ControlCapabilities };

    /** config search params */
    type ConfigSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.Config, 'configName' | 'configKey' | 'configGroup' | 'status'> & CommonSearchParams
    >;

    /** config list */
    type ConfigList = Common.PaginatingQueryRecord<Config> & { fieldPolicy: ControlCapabilities };

    /** config create params */
    type ConfigCreateParams = Pick<
      Api.SystemManage.ConfigRecord,
      'configName' | 'configKey' | 'configValue' | 'configType' | 'configGroup' | 'status' | 'remark'
    >;

    /** operation log */
    type OperationLog = { operationLogId: string; fieldPolicy?: Common.DeliveryCapabilities } & Partial<{
      operationLogId: string;
      userId: string;
      username: string;
      module: string;
      action: string;
      method: string;
      path: string;
      requestParams: string | null;
      statusCode: number | null;
      ip: string | null;
      duration: number | null;
      createTime: string;
    }>;

    /** operation log search params */
    type OperationLogSearchParams = CommonType.RecordNullable<
      Pick<OperationLog, 'module' | 'action' | 'username'> & {
        statusCode: number | null;
        startTime: number | null;
        endTime: number | null;
      } & CommonSearchParams
    >;

    /** operation log list */
    type OperationLogList = Common.PaginatingQueryRecord<OperationLog> & { fieldPolicy: Common.DeliveryCapabilities };

    /** login log status */
    type LoginLogStatus = '1' | '2' | '3';

    /** login log */
    type LoginLog = { loginLogId: string; fieldPolicy?: Common.DeliveryCapabilities } & Partial<{
      loginLogId: string;
      userId: string | null;
      username: string;
      ip: string | null;
      userAgent: string | null;
      status: LoginLogStatus;
      message: string | null;
      loginTime: string;
    }>;

    /** login log search params */
    type LoginLogSearchParams = CommonType.RecordNullable<
      Pick<LoginLog, 'username' | 'status' | 'ip'> & {
        startTime: number | null;
        endTime: number | null;
      } & CommonSearchParams
    >;

    /** login log list */
    type LoginLogList = Common.PaginatingQueryRecord<LoginLog> & { fieldPolicy: Common.DeliveryCapabilities };

    type DataScopeDemoCreateParams = { title: string; content: string | null; status: Common.EnableStatus };
    type DataScopeDemo = Partial<DataScopeDemoCreateParams> & {
      demoId: string;
      deptId?: string;
      createBy?: string;
      createTime?: string | null;
      updateTime?: string | null;
      fieldPolicy?: OrdinaryCapabilities;
    };
    type DataScopeDemoSearchParams = CommonType.RecordNullable<
      Pick<DataScopeDemoCreateParams, 'title' | 'status'> & CommonSearchParams
    >;
    type DataScopeDemoList = OrdinaryPage<DataScopeDemo>;
    type DataScopeDemoUpdateParams = Partial<DataScopeDemoCreateParams>;
  }
}
