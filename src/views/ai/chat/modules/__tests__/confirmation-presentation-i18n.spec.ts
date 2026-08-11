import { describe, expect, it } from 'vitest';
import {
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
  'common.exportModal.estimatedRowsLabel': '预计导出行数'
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
});
