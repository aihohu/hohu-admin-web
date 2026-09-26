import { computed, shallowRef } from 'vue';
import { fetchPublicSettings, fetchRuntimeSettings } from '@/service/api/settings';
import type { RuntimeSettings, UploadPolicy } from '@/service/api/settings';

export const runtimeSettings = shallowRef<RuntimeSettings | null>(null);
const publicSettings = shallowRef<Record<string, string>>({});
export const brandSettings = computed(() => runtimeSettings.value?.brand ?? publicSettings.value);
let generation = 0;
export async function refreshPublicSettings() {
  const current = generation;
  const { data, error } = await fetchPublicSettings();
  if (current === generation && !error && data) publicSettings.value = data;
  return current === generation ? publicSettings.value : {};
}

export function clearRuntimeSettings() {
  generation++;
  runtimeSettings.value = null;
}

export async function refreshRuntimeSettings() {
  const current = ++generation;
  const result = await fetchRuntimeSettings();
  if (current === generation && !result.error && result.data) runtimeSettings.value = result.data;
  return current === generation ? runtimeSettings.value : null;
}

export function validateUploadPolicy(
  file: Pick<File, 'name' | 'size'>,
  policy?: UploadPolicy
): 'FILE_TOO_LARGE' | 'INVALID_MIME' | null {
  // The backend always enforces the policy, including before capabilities load.
  if (!policy) return null;
  if (file.size > policy.maxBytes) return 'FILE_TOO_LARGE';
  const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
  return policy.extensions.includes(extension) ? null : 'INVALID_MIME';
}

export function uploadScenario(file: Pick<File, 'name'>, businessType?: string): keyof RuntimeSettings['uploads'] {
  if (/\.(jpe?g|png)$/i.test(file.name)) return 'image';
  if (businessType === 'user-import') return 'import';
  return businessType === 'ai-chat' ? 'ai_file' : 'general';
}
