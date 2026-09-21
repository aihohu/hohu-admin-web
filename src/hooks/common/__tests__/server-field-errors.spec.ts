import { describe, expect, it } from 'vitest';
import { parseServerFieldErrors } from '../server-field-errors';

describe('parseServerFieldErrors', () => {
  it('prefers structured fieldErrors (all fields)', () => {
    const error = {
      response: {
        data: {
          code: 422,
          msg: '参数错误: userEmail value is not a valid email address',
          data: {
            fieldErrors: [
              { field: 'userEmail', message: 'value is not a valid email address' },
              { field: 'userPhone', message: '手机号格式不正确' }
            ]
          }
        }
      }
    };

    expect(parseServerFieldErrors(error)).toEqual({
      userEmail: 'value is not a valid email address',
      userPhone: '手机号格式不正确'
    });
  });

  it('normalizes snake_case field names to camelCase form keys', () => {
    const error = {
      response: {
        data: {
          code: 422,
          msg: '参数错误: interval_value interval 模式必须提供间隔值和间隔单位',
          data: {
            fieldErrors: [
              { field: 'interval_value', message: 'interval 模式必须提供间隔值和间隔单位' },
              { field: 'intervalUnit', message: '同上' }
            ]
          }
        }
      }
    };

    const parsed = parseServerFieldErrors(error);
    expect(Object.keys(parsed)).toContain('intervalValue');
    expect(Object.keys(parsed)).toContain('intervalUnit');
  });

  it('falls back to parsing the legacy msg (first field only)', () => {
    const error = {
      response: {
        data: {
          code: 422,
          msg: '参数错误: userPhone Value error, 手机号格式不正确',
          data: null
        }
      }
    };

    expect(parseServerFieldErrors(error)).toEqual({
      userPhone: 'Value error, 手机号格式不正确'
    });
  });

  it('returns an empty map for non-field errors', () => {
    expect(parseServerFieldErrors(null)).toEqual({});
    expect(parseServerFieldErrors({})).toEqual({});
    expect(parseServerFieldErrors({ response: { data: { msg: '权限不足' } } })).toEqual({});
    expect(parseServerFieldErrors({ response: { data: { msg: '参数错误', data: { fieldErrors: [] } } } })).toEqual({});
  });
});
