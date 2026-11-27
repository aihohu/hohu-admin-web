import { computed, ref, shallowRef, watch } from 'vue';
import type { Ref } from 'vue';
import {
  fetchUserFieldPolicy,
  previewUserFieldPolicy,
  publishUserFieldPolicy,
  transitionUserFieldPolicy
} from '@/service/api/user-field-policy';
import type { PolicyPreview, PolicyResponse, PolicyRule } from '@/service/api/user-field-policy';

export function useUserFieldPolicy(roleId: Ref<string>) {
  const document = shallowRef<PolicyResponse | null>(null);
  const rules = ref<PolicyRule[]>([]);
  const reason = shallowRef('');
  const busy = shallowRef(false);
  const reloadRequired = shallowRef(false);
  const previewResult = shallowRef<PolicyPreview | null>(null);
  let generation = 0;
  let previewFingerprint = '';
  const fingerprint = () => JSON.stringify(rules.value);
  const canPublish = computed(() =>
    Boolean(document.value && previewResult.value && reason.value.trim() && !busy.value && !reloadRequired.value)
  );

  function reset() {
    generation += 1;
    document.value = null;
    rules.value = [];
    reason.value = '';
    previewResult.value = null;
    reloadRequired.value = false;
    busy.value = false;
  }

  watch(roleId, reset, { flush: 'sync' });
  watch(
    rules,
    () => {
      previewResult.value = null;
    },
    { deep: true, flush: 'sync' }
  );

  async function load() {
    const id = roleId.value;
    if (!id) return;
    reset();
    const current = generation;
    busy.value = true;
    try {
      const { data, error } = await fetchUserFieldPolicy(id);
      if (current !== generation) return;
      if (error || !data) {
        reloadRequired.value = true;
        return;
      }
      document.value = data;
      rules.value = (data.policy?.rules ?? []).map(rule => ({ ...rule }));
    } catch {
      if (current === generation) reloadRequired.value = true;
    } finally {
      if (current === generation) busy.value = false;
    }
  }

  function draft() {
    return {
      expectedVersion: document.value?.policy?.version ?? 0,
      catalogDigest: document.value!.catalogDigest,
      rules: rules.value.map(rule => ({ ...rule }))
    };
  }

  async function preview() {
    if (!document.value || busy.value || reloadRequired.value) return;
    const current = generation;
    const snapshot = fingerprint();
    busy.value = true;
    try {
      const { data, error } = await previewUserFieldPolicy(roleId.value, draft());
      if (current !== generation) return;
      if (error || !data) {
        previewResult.value = null;
        reloadRequired.value = true;
        return;
      }
      if (fingerprint() !== snapshot) return;
      previewFingerprint = snapshot;
      previewResult.value = data;
    } catch {
      if (current === generation) {
        previewResult.value = null;
        reloadRequired.value = true;
      }
    } finally {
      if (current === generation) busy.value = false;
    }
  }

  async function publish() {
    if (!canPublish.value || previewFingerprint !== fingerprint()) return false;
    const current = generation;
    busy.value = true;
    try {
      const { error, data } = await publishUserFieldPolicy(roleId.value, { ...draft(), reason: reason.value.trim() });
      if (current !== generation) return false;
      previewResult.value = null;
      if (error || !data) {
        reloadRequired.value = true;
        return false;
      }
      document.value = { ...document.value!, ...data };
      reason.value = '';
      return true;
    } catch {
      if (current === generation) reloadRequired.value = true;
      return false;
    } finally {
      if (current === generation) busy.value = false;
    }
  }

  async function transition(action: 'ready' | 'activate' | 'freeze') {
    const state = document.value?.state;
    if (
      !state?.candidateManifestDigest ||
      busy.value ||
      reloadRequired.value ||
      !reason.value.trim() ||
      (action === 'ready' && state.everEnforced) ||
      (action === 'freeze' && state.mode !== 'enforcing') ||
      (action === 'activate' && !state.canActivate)
    )
      return;
    const current = generation;
    busy.value = true;
    try {
      const { error, data } = await transitionUserFieldPolicy(roleId.value, action, {
        expectedEpoch: state.epoch,
        expectedManifestDigest: state.candidateManifestDigest,
        reason: reason.value.trim()
      });
      if (current !== generation) return;
      if (error || !data) {
        reloadRequired.value = true;
        return;
      }
      document.value = { ...document.value!, ...data };
      previewResult.value = null;
      reason.value = '';
    } catch {
      if (current === generation) reloadRequired.value = true;
    } finally {
      if (current === generation) busy.value = false;
    }
  }

  return {
    document,
    rules,
    reason,
    busy,
    reloadRequired,
    previewResult,
    canPublish,
    load,
    preview,
    publish,
    transition,
    reset
  };
}
