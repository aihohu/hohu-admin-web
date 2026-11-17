import { onScopeDispose, shallowRef } from 'vue';

/** One explicit action at a time; late responses cannot update a disposed page. */
export function useControlAction() {
  const busy = shallowRef(false);
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
  });
  async function run(action: (current: () => boolean) => Promise<void>) {
    if (disposed || busy.value) return;
    busy.value = true;
    try {
      await action(() => !disposed);
    } finally {
      if (!disposed) busy.value = false;
    }
  }
  return { busy, run };
}
