import { describe, expect, it } from 'vitest';
import {
  localizeConfirmationDryRun,
  localizeConfirmationField,
  localizeConfirmationSummary,
  localizeConfirmationTool
} from '../confirmation-presentation-i18n';

const zh: Record<string, string> = {
  'common.importModal.title': '批量导入用户',
  'common.importModal.confirmImport': '确认导入',
  'common.importHistoryDrawer.totalRowsLabel': '总行数',
  'common.importHistoryDrawer.summaryNewLabel': '将新增',
  'common.importHistoryDrawer.summaryExistsLabel': '已存在',
  'common.importHistoryDrawer.summaryConflictLabel': '冲突',
  'common.importHistoryDrawer.summaryOutOfScopeLabel': '越界',
  'common.importModal.onConflictLabel': '冲突处理',
  'common.importModal.syncModeLabel': '工号同步模式',
  'common.importModal.onConflictSkip': '跳过已存在（推荐）',
  'common.importModal.onConflictOverwrite': '覆盖已存在（仅更新白名单字段）',
  'common.importModal.onConflictFailFast': '首个冲突即终止',
  'common.importModal.syncModeCreateOnly': '仅新增（CREATE_ONLY，默认安全）',
  'common.importModal.syncModeUpdateProfile': '更新资料（UPDATE_PROFILE）',
  'common.importModal.syncModeFullSync': '完整同步（FULL_SYNC，含 user_name）',
  'common.exportModal.title': '导出用户列表',
  'common.exportModal.aiConfirmSummary': '将导出约 {count} 行用户数据到 xlsx 文件（30 天后过期清理）',
  'common.exportModal.reasonLabel': '业务理由',
  'common.exportModal.estimatedRowsLabel': '预计导出行数',
  'page.system.user.addUser': '新增用户',
  'page.system.user.editUser': '编辑用户',
  'page.ai.chat.updateUserDepartments': '调整用户部门',
  'page.ai.chat.updateUserRoles': '调整用户角色',
  'page.system.user.resetPwd.title': '重置密码',
  'page.system.user.userName': '用户名',
  'page.system.user.nickname': '昵称',
  'page.system.user.userPhone': '手机号',
  'page.system.user.userEmail': '邮箱',
  'page.system.user.userGender': '性别',
  'page.system.user.userStatus': '用户状态',
  'page.system.user.gender.unknown': '未知',
  'page.system.user.gender.male': '男',
  'page.system.user.gender.female': '女',
  'page.system.common.status.enable': '启用',
  'page.system.common.status.disable': '禁用',
  'page.system.user.primaryDept': '主部门',
  'page.ai.chat.confirmAffected': '预计影响',
  'page.ai.chat.userId': '用户 ID',
  'page.ai.chat.targetUser': '目标用户',
  'page.ai.chat.confirmCreateUserSummary': '将创建用户 {userName} 并应用系统默认密码与角色策略',
  'page.ai.chat.confirmResetPasswordSummary': '将把用户 {userId} 的密码重置为系统默认策略',
  'page.ai.chat.confirmUpdateUserSingleSummary': '将把用户“{userName}”的{fieldName}更新为“{value}”',
  'page.ai.chat.confirmUpdateUserMultipleSummary': '将更新用户“{userName}”的 {count} 个资料字段，请核对下方新值',
  'page.ai.chat.confirmUpdateDeptSummary': '将把用户“{userName}”的完整部门集合替换为下方新集合',
  'page.ai.chat.confirmUpdateRolesSummary': '将把用户“{userName}”的完整角色集合替换为下方新集合',
  'page.ai.chat.departmentAssignments': '完整部门集合',
  'page.ai.chat.roleAssignments': '完整角色集合'
};

const t = (key: string, params?: Record<string, string | number>) => {
  const template = zh[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name] ?? `{${name}}`));
};

describe('confirmation presentation i18n', () => {
  it('localizes the user import tool, summary, field labels and enum values', () => {
    expect(localizeConfirmationTool('user.import_execute', t)).toBe('批量导入用户 (user.import_execute)');
    expect(localizeConfirmationSummary('user.import_execute', '确认导入用户', t)).toBe('确认导入');
    expect(localizeConfirmationField('user.import_execute', { label: 'total', value: 3 }, t)).toEqual({
      label: 'total',
      value: 3,
      displayLabel: '总行数',
      displayValue: 3
    });
    expect(localizeConfirmationField('user.import_execute', { label: 'onConflict', value: 'skip' }, t)).toMatchObject({
      displayLabel: '冲突处理',
      displayValue: '跳过已存在（推荐）'
    });
    expect(
      localizeConfirmationField('user.import_execute', { label: 'syncMode', value: 'CREATE_ONLY' }, t)
    ).toMatchObject({ displayLabel: '工号同步模式', displayValue: '仅新增（CREATE_ONLY，默认安全）' });
  });

  it('keeps unknown tools, labels and values readable', () => {
    expect(localizeConfirmationTool('other.execute', t)).toBe('other.execute');
    expect(localizeConfirmationSummary('other.execute', 'Raw summary', t)).toBe('Raw summary');
    expect(
      localizeConfirmationField('user.import_execute', { label: 'futurePolicy', value: 'FUTURE' }, t)
    ).toMatchObject({ displayLabel: 'futurePolicy', displayValue: 'FUTURE' });
  });

  it('localizes user export while preserving the original reason and numeric count', () => {
    const fields: Api.Ai.ConfirmationPresentationField[] = [
      { label: 'reason', value: '用户要求导出全部用户列表' },
      { label: 'affectedCount', value: 12, tone: 'warning' }
    ];

    expect(localizeConfirmationTool('user.export', t)).toBe('导出用户列表 (user.export)');
    expect(localizeConfirmationSummary('user.export', 'raw backend summary', t, fields)).toBe(
      '将导出约 12 行用户数据到 xlsx 文件（30 天后过期清理）'
    );
    expect(localizeConfirmationField('user.export', fields[0], t)).toMatchObject({
      displayLabel: '业务理由',
      displayValue: '用户要求导出全部用户列表'
    });
    expect(localizeConfirmationField('user.export', fields[1], t)).toMatchObject({
      displayLabel: '预计导出行数',
      displayValue: 12
    });
  });

  it('localizes user create and reset-password confirmations without exposing a password value', () => {
    const createFields: Api.Ai.ConfirmationPresentationField[] = [
      { label: 'user_name', value: 'lisi' },
      { label: 'primary_dept_id', value: 'AI 产品部（81001）' },
      { label: 'affectedCount', value: 1, tone: 'warning' }
    ];
    const resetFields: Api.Ai.ConfirmationPresentationField[] = [
      { label: 'user_id', value: '82002' },
      { label: 'affectedCount', value: 1, tone: 'warning' }
    ];

    expect(localizeConfirmationTool('user.create', t)).toBe('新增用户 (user.create)');
    expect(localizeConfirmationSummary('user.create', 'raw backend summary', t, createFields)).toBe(
      '将创建用户 lisi 并应用系统默认密码与角色策略'
    );
    expect(localizeConfirmationField('user.create', createFields[0], t)).toMatchObject({
      displayLabel: '用户名',
      displayValue: 'lisi'
    });
    expect(localizeConfirmationField('user.create', createFields[1], t)).toMatchObject({
      displayLabel: '主部门',
      displayValue: 'AI 产品部（81001）'
    });

    expect(localizeConfirmationTool('user.reset_password', t)).toBe('重置密码 (user.reset_password)');
    expect(localizeConfirmationSummary('user.reset_password', 'raw backend summary', t, resetFields)).toBe(
      '将把用户 82002 的密码重置为系统默认策略'
    );
    expect(localizeConfirmationField('user.reset_password', resetFields[0], t)).toMatchObject({
      displayLabel: '用户 ID',
      displayValue: '82002'
    });
    expect(JSON.stringify({ createFields, resetFields })).not.toContain('AiPolicy123');

    expect(
      localizeConfirmationDryRun(
        'user.create',
        {
          summary: '后端中文影响摘要',
          affectedCount: 1,
          affectedExamples: ['账号：lisi', '密码策略：系统默认密码']
        },
        t,
        createFields
      )
    ).toEqual({
      summary: '将创建用户 lisi 并应用系统默认密码与角色策略',
      affectedCount: 1,
      affectedExamples: []
    });
  });

  it('localizes user update target, changed field, new value and enum values', () => {
    const nicknameFields: Api.Ai.ConfirmationPresentationField[] = [
      { label: 'user_id', value: '十四篇（7493097707360227328）' },
      { label: 'nickname', value: '十四篇' },
      { label: 'affectedCount', value: 1, tone: 'warning' }
    ];

    expect(localizeConfirmationTool('user.update', t)).toBe('编辑用户 (user.update)');
    expect(localizeConfirmationSummary('user.update', 'raw backend summary', t, nicknameFields)).toBe(
      '将把用户“十四篇（7493097707360227328）”的昵称更新为“十四篇”'
    );
    expect(localizeConfirmationField('user.update', nicknameFields[0], t)).toMatchObject({
      displayLabel: '目标用户',
      displayValue: '十四篇（7493097707360227328）'
    });
    expect(localizeConfirmationField('user.update', nicknameFields[1], t)).toMatchObject({
      displayLabel: '昵称',
      displayValue: '十四篇'
    });
    expect(localizeConfirmationField('user.update', { label: 'status', value: '2' }, t)).toMatchObject({
      displayLabel: '用户状态',
      displayValue: '禁用'
    });
    expect(localizeConfirmationField('user.update', { label: 'user_gender', value: '1' }, t)).toMatchObject({
      displayLabel: '性别',
      displayValue: '男'
    });
    expect(
      localizeConfirmationDryRun(
        'user.update',
        { summary: '后端摘要', affectedCount: 1, affectedExamples: ['nickname: old → 十四篇'] },
        t,
        nicknameFields
      )
    ).toEqual({
      summary: '',
      affectedCount: 1,
      affectedExamples: []
    });
  });

  it('localizes the complete user department replacement confirmation', () => {
    const fields: Api.Ai.ConfirmationPresentationField[] = [
      { label: 'user_id', value: '十四篇（7493097707360227328）' },
      { label: 'dept_assignments', value: '★ Old (81001) → ★ New (81002)' },
      { label: 'affectedCount', value: 1, tone: 'warning' }
    ];

    expect(localizeConfirmationTool('user.update_dept', t)).toBe('调整用户部门 (user.update_dept)');
    expect(localizeConfirmationSummary('user.update_dept', 'raw backend summary', t, fields)).toBe(
      '将把用户“十四篇（7493097707360227328）”的完整部门集合替换为下方新集合'
    );
    expect(localizeConfirmationField('user.update_dept', fields[0], t)).toMatchObject({
      displayLabel: '目标用户',
      displayValue: '十四篇（7493097707360227328）'
    });
    expect(localizeConfirmationField('user.update_dept', fields[1], t)).toMatchObject({
      displayLabel: '完整部门集合',
      displayValue: '★ Old (81001) → ★ New (81002)'
    });
    expect(
      localizeConfirmationDryRun(
        'user.update_dept',
        {
          summary: '后端中文摘要',
          affectedCount: 1,
          affectedExamples: ['原部门：旧部门', '新部门：新部门']
        },
        t,
        fields
      )
    ).toEqual({
      summary: '将把用户“十四篇（7493097707360227328）”的完整部门集合替换为下方新集合',
      affectedCount: 1,
      affectedExamples: []
    });
  });

  it('localizes the complete user role replacement confirmation', () => {
    const fields: Api.Ai.ConfirmationPresentationField[] = [
      { label: 'user_id', value: '十四篇（7493097707360227328）' },
      { label: 'role_ids', value: 'Old (R_OLD / 801) → New (R_NEW / 901)' },
      { label: 'affectedCount', value: 1, tone: 'warning' }
    ];

    expect(localizeConfirmationTool('user.update_roles', t)).toBe('调整用户角色 (user.update_roles)');
    expect(localizeConfirmationSummary('user.update_roles', 'raw backend summary', t, fields)).toBe(
      '将把用户“十四篇（7493097707360227328）”的完整角色集合替换为下方新集合'
    );
    expect(localizeConfirmationField('user.update_roles', fields[0], t)).toMatchObject({
      displayLabel: '目标用户',
      displayValue: '十四篇（7493097707360227328）'
    });
    expect(localizeConfirmationField('user.update_roles', fields[1], t)).toMatchObject({
      displayLabel: '完整角色集合',
      displayValue: 'Old (R_OLD / 801) → New (R_NEW / 901)'
    });
    expect(
      localizeConfirmationDryRun(
        'user.update_roles',
        {
          summary: '后端中文摘要',
          affectedCount: 1,
          affectedExamples: ['原角色：Old', '新角色：New']
        },
        t,
        fields
      )
    ).toEqual({
      summary: '将把用户“十四篇（7493097707360227328）”的完整角色集合替换为下方新集合',
      affectedCount: 1,
      affectedExamples: []
    });
  });

  it('keeps unknown dry-run presentations unchanged', () => {
    const dryRun: Api.Ai.DryRunSummary = {
      summary: 'raw summary',
      affectedCount: 2,
      affectedExamples: ['raw example']
    };

    expect(localizeConfirmationDryRun('unknown.tool', dryRun, t)).toEqual(dryRun);
  });
});
