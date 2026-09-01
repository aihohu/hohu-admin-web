import { describe, expect, it } from 'vitest';
import { buildLoginPayload, shouldShowTenantCodeInput } from '../tenant-auth';

describe('tenant login capability', () => {
  it('keeps the existing single-mode login surface unchanged', () => {
    expect(shouldShowTenantCodeInput(undefined, undefined)).toBe(false);
    expect(shouldShowTenantCodeInput('single', 'code')).toBe(false);
    expect(buildLoginPayload('alice', 'secret')).toEqual({
      userName: 'alice',
      password: 'secret'
    });
  });

  it('shows and submits a tenant code only for hosted code-locator deployments', () => {
    expect(shouldShowTenantCodeInput('hosted', 'code')).toBe(true);
    expect(shouldShowTenantCodeInput('hosted', 'host')).toBe(false);
    expect(buildLoginPayload('alice', 'secret', ' tenant-b ')).toEqual({
      userName: 'alice',
      password: 'secret',
      tenantCode: 'tenant-b'
    });
  });
});
