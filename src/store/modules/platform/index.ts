import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

const TOKEN_KEY = 'hohu.platform.session';

export const usePlatformStore = defineStore('platform-session', () => {
  const token = ref(sessionStorage.getItem(TOKEN_KEY) || '');
  const identity = ref<Api.Platform.Identity | null>(null);
  const revision = ref(0);
  const canRead = computed(() => Boolean(identity.value?.permissions.includes('platform:ai:read')));
  const canWrite = computed(() => canRead.value && Boolean(identity.value?.permissions.includes('platform:ai:write')));
  function setToken(value: string) {
    revision.value++;
    token.value = value;
    identity.value = null;
    if (value) sessionStorage.setItem(TOKEN_KEY, value);
    else sessionStorage.removeItem(TOKEN_KEY);
  }
  return { token, identity, revision, canRead, canWrite, setToken };
});
