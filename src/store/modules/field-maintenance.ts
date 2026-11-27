import { defineStore } from 'pinia';
import { markRaw, onScopeDispose, shallowRef } from 'vue';
import { createPreparationClient } from '@/service/request/policy-preparation';
import { isMaintenanceConsole } from '@/utils/maintenance-console';

export const useFieldMaintenance = defineStore('field-maintenance', () => {
  const identity = shallowRef('');
  const ended = shallowRef(false);
  let expiry: ReturnType<typeof setTimeout> | undefined;
  const client = createPreparationClient(clear);
  function clear() {
    clearTimeout(expiry);
    client.dispose();
    identity.value = '';
  }
  async function login(userName: string, password: string, tenantCode = 'default') {
    if (!isMaintenanceConsole() || ended.value) throw new Error('Maintenance session unavailable');
    clear();
    const session = await client.login({ userName, password, tenantCode });
    identity.value = [session.tenantId, session.actorId, crypto.randomUUID()].join('/');
    expiry = setTimeout(clear, session.expiresIn * 1000);
  }
  async function logout() {
    try {
      await client.logout();
    } finally {
      clear();
    }
  }
  async function finish() {
    await client.finish();
    ended.value = true;
    clear();
  }
  onScopeDispose(clear);
  return { identity, ended, repository: markRaw(client.repository), login, logout, finish };
});
