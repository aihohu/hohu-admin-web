import { computed, onScopeDispose, ref, watch } from 'vue';
import type { Ref } from 'vue';
import { editablePayload, fieldAllowed, sameDraftValue } from './ordinary-fields';

type FormResult<T> = { data?: Api.SystemManage.RelationFormContext<T> | null; error?: unknown };
interface Options<T> {
  visible: Ref<boolean>;
  mode: () => 'create' | 'update';
  target: () => string | undefined;
  parent?: () => string | undefined;
  defaults: () => T;
  load: (query: Api.SystemManage.RelationFormQuery) => PromiseLike<FormResult<T>>;
  adapt?: (record: Partial<T>) => Partial<T>;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/** A form session owns its snapshot; switching targets invalidates reads and saves. */
export function useRelationForm<T extends object>(options: Options<T>) {
  const model = ref({}) as Ref<Partial<T>>;
  const policy = ref<Api.SystemManage.RelationCapabilities | null>(null);
  const ready = ref(false);
  const loading = ref(false);
  let generation = 0;
  let before: Partial<T> | null = null;
  let observed: Partial<T> = {};
  let previousKey = '';
  const touched = new Set<string>();
  const creating = computed(() => options.mode() === 'create');
  onScopeDispose(() => {
    generation += 1;
    ready.value = false;
  });
  const fields = computed(() =>
    policy.value
      ? [
          ...(creating.value ? policy.value.create : policy.value.update),
          ...(creating.value ? policy.value.specialCreate : policy.value.specialUpdate)
        ]
      : []
  );

  function editable(key: string) {
    return ready.value && fieldAllowed(fields.value, key);
  }
  function present(key: string) {
    return ready.value && (editable(key) || fieldAllowed(policy.value?.read, key));
  }
  function readLevel(key: string) {
    return (
      Object.entries(policy.value?.readLevels ?? {}).find(([field]) => fieldAllowed([field], key))?.[1] ?? 'hidden'
    );
  }
  function replacement(key: string) {
    return !creating.value && editable(key) && (readLevel(key) === 'masked' || !before || !Object.hasOwn(before, key));
  }
  function session() {
    return generation;
  }
  function current(token: number) {
    return token === generation && options.visible.value;
  }
  function payload(): Partial<T> {
    if (!ready.value || !options.visible.value || (creating.value && !policy.value?.canCreate)) return {};
    return editablePayload(model.value, before, fields.value, creating.value, touched);
  }
  watch(
    model,
    value => {
      if (ready.value) {
        for (const key of Object.keys(value) as (keyof T & string)[]) {
          if (!sameDraftValue(value[key], observed[key])) touched.add(key);
        }
      }
      observed = clone(value);
    },
    { deep: true, flush: 'sync' }
  );

  watch(
    [options.visible, options.mode, options.target, () => options.parent?.()],
    async () => {
      const key = JSON.stringify([options.mode(), options.target()]);
      const draft =
        creating.value && ready.value && options.visible.value && key === previousKey ? clone(model.value) : null;
      previousKey = key;
      const token = ++generation;
      ready.value = false;
      loading.value = false;
      policy.value = null;
      before = null;
      touched.clear();
      model.value = {};
      if (!options.visible.value || (!creating.value && !options.target())) return;
      loading.value = true;
      const query: Api.SystemManage.RelationFormQuery = { mode: options.mode() };
      if (creating.value) {
        if (options.parent?.()) query.parentId = options.parent();
      } else query.recordId = options.target();
      try {
        const { data, error } = await options.load(query);
        if (!current(token) || error || !data?.fieldPolicy || (!creating.value && !data.record)) return;
        const caps = data.fieldPolicy;
        if (
          ![caps.read, caps.query, caps.create, caps.update, caps.specialCreate, caps.specialUpdate].every(
            Array.isArray
          )
        )
          return;
        if (
          !caps.readLevels ||
          typeof caps.readLevels !== 'object' ||
          Array.isArray(caps.readLevels) ||
          Object.values(caps.readLevels).some(level => !['plain', 'masked', 'hidden'].includes(level))
        )
          return;
        policy.value = caps;
        before = data.record ? clone(options.adapt?.(data.record) ?? data.record) : null;
        model.value = creating.value ? { ...clone(options.defaults()), ...draft } : clone(before!);
        if (!creating.value) {
          for (const field of Object.keys(model.value) as (keyof T & string)[]) {
            if (readLevel(field) === 'masked' && fieldAllowed(fields.value, field)) delete model.value[field];
          }
        }
        ready.value = true;
      } catch {
        // Transport rejection has the same closed state as an API error.
      } finally {
        if (current(token)) loading.value = false;
      }
    },
    { immediate: true, flush: 'sync' }
  );
  return {
    model,
    policy,
    ready,
    loading,
    creating,
    editable,
    present,
    replacement,
    payload,
    session,
    current,
    initial: () => (before ? clone(before) : null)
  };
}
