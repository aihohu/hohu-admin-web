import { describe, expect, it } from 'vitest';
import { createI18n } from 'vue-i18n';
import en from '@/locales/langs/en-us';
import zh from '@/locales/langs/zh-cn';
import {
  buildConfirmationTechnicalFields,
  localizeConfirmationField,
  localizeConfirmationTool
} from '../confirmation-presentation-i18n';

describe.each(['zh', 'en'])('built-in confirmations (%s)', locale => {
  const { t } = createI18n({ legacy: false, locale, messages: { zh, en } }).global;

  it('names the cron operation and shows the bound job, schedule, and impact', () => {
    expect(localizeConfirmationTool('job.update_cron', t)).toBe(t('page.ai.chat.toolDescriptions.jobUpdateCron'));
    const target = { label: 'job_id', value: 'Nightly cleanup', rawValue: '9007199254740993' };
    expect(localizeConfirmationField('job.update_cron', target, t)).toMatchObject({
      displayLabel: t('page.system.job.jobName'),
      displayValue: 'Nightly cleanup'
    });
    expect(
      localizeConfirmationField('job.update_cron', { label: 'cron_expression', value: '0 2 * * *' }, t)
    ).toMatchObject({
      displayLabel: t('ai.tool.field.newCron'),
      displayValue: '0 2 * * *'
    });
    expect(buildConfirmationTechnicalFields('job.update_cron', [target], t)[0].value).toBe('9007199254740993');
    expect(localizeConfirmationField('job.update_cron', { label: 'affectedCount', value: 1 }, t).displayLabel).toBe(
      t('page.ai.chat.confirmAffected')
    );
  });

  it('labels the complete deletion list and keeps every name and exact ID', () => {
    const value = 'Alpha (ID: 9007199254740993); Bravo (ID: 9007199254740994)';
    const field = localizeConfirmationField('user.batch_delete', { label: 'user_ids', value }, t);
    expect(field.displayLabel).toBe(locale === 'zh' ? '待删除用户（完整名单）' : 'Users to delete (complete list)');
    expect(field.displayValue).toBe(value);
    expect(localizeConfirmationField('user.batch_delete', { label: 'affectedCount', value: 2 }, t).displayLabel).toBe(
      t('page.ai.chat.confirmAffected')
    );
  });
});
