import { computed, onScopeDispose, shallowRef } from 'vue';
import type { CodeReceipt } from '@/service/api/account';

export function useEmailCode() {
  const sending = shallowRef(false);
  const seconds = shallowRef(0);
  const minutes = shallowRef(5);
  let timer: ReturnType<typeof setInterval> | undefined;
  const canSend = computed(() => !sending.value && seconds.value === 0);
  function reset() {
    clearInterval(timer);
    seconds.value = 0;
  }
  async function send(action: () => Promise<{ data: CodeReceipt | null; error: unknown }>) {
    if (!canSend.value) return false;
    sending.value = true;
    try {
      const { data, error } = await action();
      if (error || !data) return false;
      minutes.value = data.expiresIn / 60;
      seconds.value = data.retryAfter;
      clearInterval(timer);
      timer = setInterval(() => {
        seconds.value = Math.max(0, seconds.value - 1);
        if (!seconds.value) clearInterval(timer);
      }, 1000);
      return true;
    } finally {
      sending.value = false;
    }
  }
  onScopeDispose(reset);
  return { sending, seconds, minutes, canSend, send, reset };
}
