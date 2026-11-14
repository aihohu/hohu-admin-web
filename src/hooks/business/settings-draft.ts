import { computed, onScopeDispose, ref, shallowRef } from 'vue';
import { fetchSettingGroup, saveSettingGroup } from '@/service/api/settings';
import type { SettingGroup } from '@/service/api/settings';
import { registrationEditable, settingPatch } from './control-fields';

export function useSettingsDraft() {
  const active = shallowRef('brand');
  const drafts = ref<Record<string, SettingGroup>>({});
  const baselines = ref<Record<string, SettingGroup['values']>>({});
  const loading = shallowRef(false);
  const saving = shallowRef(false);
  const failed = shallowRef(false);
  const invalid = ref(new Set<string>());
  const form = computed(() => drafts.value[active.value] ?? null);
  let generation = 0;
  let disposed = false;
  const session = () => generation;
  const current = (token: number) => !disposed && token === generation;
  function editable(key: string) {
    const policy = form.value?.fieldPolicy;
    return Boolean(
      policy &&
      [...policy.update, ...policy.specialUpdate].includes(key) &&
      (key !== 'registration_role_id' || registrationEditable(form.value!))
    );
  }
  const fields = computed(
    () =>
      form.value?.fields.filter(field => form.value?.fieldPolicy?.read.includes(field.key) || editable(field.key)) ?? []
  );
  function patch(group = active.value) {
    const draft = drafts.value[group];
    if (!draft) return {};
    const result = settingPatch(draft, baselines.value[group] ?? {});
    if (!registrationEditable(draft)) delete result.registration_role_id;
    return result;
  }
  const dirty = computed(() => Object.keys(drafts.value).some(group => Object.keys(patch(group)).length > 0));
  const canSave = computed(() =>
    Boolean(
      form.value?.fieldPolicy &&
      !failed.value &&
      !loading.value &&
      !invalid.value.has(active.value) &&
      (form.value.formReceipt || active.value === 'security') &&
      fields.value.some(field => editable(field.key))
    )
  );

  async function load(group = active.value, force = false) {
    const token = ++generation;
    active.value = group;
    loading.value = false;
    saving.value = false;
    failed.value = false;
    if (group === 'mail' || (drafts.value[group] && !force && !invalid.value.has(group))) return;
    invalid.value.add(group);
    loading.value = true;
    try {
      const { data, error } = await fetchSettingGroup(group);
      if (!current(token)) return;
      failed.value = Boolean(error || !data?.fieldPolicy);
      if (data?.fieldPolicy && !error) {
        drafts.value[group] = data;
        baselines.value[group] = { ...data.values };
        invalid.value.delete(group);
      }
    } catch {
      if (current(token)) failed.value = true;
    } finally {
      if (current(token)) loading.value = false;
    }
  }

  async function save() {
    if (!form.value || !canSave.value || saving.value) return false;
    const values = patch();
    if (!Object.keys(values).length) return false;
    const token = generation;
    const group = active.value;
    saving.value = true;
    try {
      const { data, error } = await saveSettingGroup(group, {
        values,
        revision: form.value.revision,
        ...(form.value.formReceipt ? { formReceipt: form.value.formReceipt } : {})
      });
      if (!current(token)) return false;
      if (error || !data?.fieldPolicy) {
        invalid.value.add(group);
        failed.value = true;
        return false;
      }
      drafts.value[group] = data;
      baselines.value[group] = { ...data.values };
      failed.value = false;
      return true;
    } catch {
      if (current(token)) {
        invalid.value.add(group);
        failed.value = true;
      }
      return false;
    } finally {
      if (current(token)) saving.value = false;
    }
  }
  onScopeDispose(() => {
    disposed = true;
    generation += 1;
  });
  return {
    active,
    drafts,
    baselines,
    form,
    fields,
    loading,
    saving,
    failed,
    dirty,
    canSave,
    editable,
    patch,
    load,
    save,
    session,
    current
  };
}
