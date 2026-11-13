import { computed, onScopeDispose, reactive, ref, shallowRef, watch } from 'vue';
import type { Ref } from 'vue';
import { editablePayload, fieldAllowed, sameDraftValue } from './ordinary-fields';

interface Options<T> {
  visible: Ref<boolean>;
  mode: () => 'create' | 'update';
  target: () => string | undefined;
  command?: () => 'metadata' | 'schedule';
  defaults: () => T;
  load: (
    query: Api.SystemManage.ControlFormQuery
  ) => PromiseLike<{ data?: Api.SystemManage.ControlFormContext<T> | null; error?: unknown }>;
}
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** A receipt, sparse snapshot and all asynchronous effects belong to one open form. */
export function useControlForm<T extends object>(options: Options<T>) {
  const model = ref({}) as Ref<Partial<T>>;
  const context = shallowRef<Api.SystemManage.ControlFormContext<T> | null>(null);
  const ready = shallowRef(false);
  const loading = shallowRef(false);
  const reloadVersion = shallowRef(0);
  const creating = computed(() => options.mode() === 'create');
  const receipt = computed(() => context.value?.formReceipt ?? '');
  const policy = computed(() => context.value?.fieldPolicy);
  const allowed = computed(() =>
    creating.value
      ? policy.value?.create
      : options.command?.() === 'schedule'
        ? policy.value?.specialUpdate.filter(key => key !== 'status')
        : policy.value?.update
  );
  let generation = 0;
  let before: Partial<T> | null = null;
  let observed: Partial<T> = {};
  const touched = reactive(new Set<string>());
  function session() {
    return generation;
  }
  function current(token: number) {
    return token === generation && options.visible.value;
  }
  function editable(key: string) {
    return ready.value && fieldAllowed(allowed.value, key);
  }
  function present(key: string) {
    return ready.value && (editable(key) || fieldAllowed(policy.value?.read, key));
  }
  function replacement(key: string) {
    return !creating.value && editable(key) && (!before || !Object.hasOwn(before, key));
  }
  function payload() {
    if (!ready.value || !options.visible.value || (creating.value && !policy.value?.canCreate)) return {};
    return editablePayload(model.value, before, allowed.value, creating.value, touched);
  }
  function clear() {
    generation += 1;
    ready.value = false;
    context.value = null;
    loading.value = false;
  }
  function reload() {
    reloadVersion.value += 1;
  }
  function invalidate() {
    ready.value = false;
    context.value = null;
  }
  watch(
    model,
    value => {
      if (ready.value)
        for (const key of Object.keys(value) as (keyof T & string)[]) {
          if (!sameDraftValue(value[key], observed[key])) touched.add(key);
        }
      observed = clone(value);
    },
    { deep: true, flush: 'sync' }
  );
  watch(
    [options.visible, options.mode, options.target, () => options.command?.(), reloadVersion],
    async () => {
      clear();
      const token = generation;
      before = null;
      touched.clear();
      model.value = {};
      if (!options.visible.value || (!creating.value && !options.target())) return;
      loading.value = true;
      try {
        const { data, error } = await options.load({
          mode: options.mode(),
          ...(!creating.value ? { recordId: options.target() } : {})
        });
        if (!current(token) || error || !data?.formReceipt || data.formReceipt.length > 2048 || !data.fieldPolicy)
          return;
        const caps = data.fieldPolicy;
        if (
          ![caps.read, caps.query, caps.create, caps.update, caps.specialCreate, caps.specialUpdate].every(
            Array.isArray
          ) ||
          !caps.readLevels ||
          typeof caps.readLevels !== 'object' ||
          Array.isArray(caps.readLevels) ||
          Object.values(caps.readLevels).some(level => !['plain', 'masked', 'hidden'].includes(level)) ||
          (!creating.value && !data.record)
        )
          return;
        context.value = data;
        const safe = Object.fromEntries(
          Object.entries(data.record ?? {}).filter(
            ([key]) =>
              fieldAllowed(caps.read, key) &&
              Object.entries(caps.readLevels).some(([field, level]) => fieldAllowed([field], key) && level === 'plain')
          )
        ) as Partial<T>;
        before = creating.value ? null : clone(safe);
        model.value = creating.value ? clone(options.defaults()) : clone(safe);
        ready.value = true;
      } catch {
        // Keep the new session closed on transport failure.
      } finally {
        if (current(token)) loading.value = false;
      }
    },
    { immediate: true, flush: 'sync' }
  );
  onScopeDispose(clear);
  return {
    model,
    context,
    policy,
    ready,
    loading,
    creating,
    receipt,
    editable,
    present,
    replacement,
    payload,
    session,
    current,
    reload,
    invalidate
  };
}
