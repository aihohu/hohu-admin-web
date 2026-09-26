<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { fetchSettingGroup, fetchSettingGroups, saveSettingGroup } from '@/service/api/settings';
import type { SettingField, SettingGroup } from '@/service/api/settings';
import { useAuth } from '@/hooks/business/auth';
import { $t } from '@/locales';
import { refreshRuntimeSettings } from '@/utils/runtime-settings';
import FileUpload from '@/components/custom/file-upload.vue';
import { useAppStore } from '@/store/modules/app';

const { hasAuth } = useAuth();
const route = useRoute();
const router = useRouter();
const groups = ref<string[]>([]);
const active = ref('brand');
const drafts = ref<Record<string, SettingGroup>>({});
const baselines = ref<Record<string, string>>({});
const form = computed(() => drafts.value[active.value] ?? null);
const dirty = computed(() =>
  Object.entries(drafts.value).some(([key, draft]) => JSON.stringify(draft.values) !== baselines.value[key])
);
const loading = ref(false);
const saving = ref(false);
const failed = ref(false);
let sequence = 0;
let disposed = false;
const readOnly = computed(() => !hasAuth('system:setting:edit'));
function label(key: string) {
  return $t(`settings.field_${key.replace(/[^a-zA-Z0-9]/g, '_')}`);
}
function updateExtensions(key: string, values: string[]) {
  if (form.value) form.value.values[key] = values.join(',');
}
function scale(field: SettingField) {
  return field.key.endsWith('_bytes') ? 1024 * 1024 : 1;
}
async function load(group = active.value) {
  const current = ++sequence;
  active.value = group;
  loading.value = true;
  failed.value = false;
  if (drafts.value[group]) {
    loading.value = false;
    return;
  }
  try {
    const { data, error } = await fetchSettingGroup(group);
    if (current !== sequence) return;
    failed.value = Boolean(error || !data);
    if (data && !error) {
      drafts.value[group] = data;
      baselines.value[group] = JSON.stringify(data.values);
    }
  } catch {
    if (current === sequence) failed.value = true;
  } finally {
    if (current === sequence) loading.value = false;
  }
}
async function switchGroup(group: string) {
  if (saving.value || !groups.value.includes(group)) return;
  await router.replace({ query: { ...route.query, tab: group } });
  if (active.value !== group) await load(group);
}
watch(
  () => route.query.tab,
  value => {
    if (typeof value === 'string' && value !== active.value && groups.value.includes(value)) void load(value);
  }
);
onBeforeRouteLeave(() => !dirty.value || window.confirm($t('settings.unsavedChanges')));
function beforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return;
  event.preventDefault();
  event.returnValue = '';
}
onBeforeUnmount(() => {
  disposed = true;
  sequence += 1;
  window.removeEventListener('beforeunload', beforeUnload);
});
async function save() {
  if (!form.value || saving.value || readOnly.value) return;
  const current = sequence;
  saving.value = true;
  try {
    const { data, error } = await saveSettingGroup(active.value, {
      values: form.value.values,
      revision: form.value.revision
    });
    if (!error && data && current === sequence) {
      drafts.value[active.value] = data;
      baselines.value[active.value] = JSON.stringify(data.values);
      const runtime = await refreshRuntimeSettings();
      if (runtime) useAppStore().applyDefaultLocale(runtime.defaultLocale);
      window.$message?.success($t('settings.saved'));
    }
  } finally {
    saving.value = false;
  }
}
async function initialize() {
  loading.value = true;
  failed.value = false;
  try {
    const { data, error } = await fetchSettingGroups();
    if (disposed) return;
    if (error || !data?.length) {
      failed.value = true;
      return;
    }
    groups.value = data;
    const requested = route.query.tab;
    const initial = typeof requested === 'string' && data.includes(requested) ? requested : data[0];
    await load(initial);
    if (!disposed && active.value === initial && requested !== initial)
      await router.replace({ query: { ...route.query, tab: initial } });
  } catch {
    if (!disposed) failed.value = true;
  } finally {
    if (!disposed) loading.value = false;
  }
}
onMounted(() => {
  window.addEventListener('beforeunload', beforeUnload);
  void initialize();
});
</script>

<template>
  <NCard :bordered="false">
    <NTabs :value="active" type="line" class="mb-24px" @update:value="switchGroup">
      <NTab v-for="group in groups" :key="group" :name="group" :disabled="saving">{{ $t(`settings.${group}`) }}</NTab>
    </NTabs>
    <NSpin :show="loading">
      <NAlert v-if="failed" type="error" class="mb-16px">
        {{ $t('settings.loadFailed') }}
        <NButton text @click="groups.length ? load() : initialize()">{{ $t('settings.retry') }}</NButton>
      </NAlert>
      <NForm v-if="form" label-placement="top" class="max-w-720px" :disabled="readOnly || saving">
        <NAlert v-if="active === 'files'" type="info" class="mb-16px">{{ $t('settings.limitHint') }}</NAlert>
        <NFormItem v-for="field in form.fields" :key="field.key" :label="label(field.key)">
          <NSwitch
            v-if="field.kind === 'boolean'"
            :value="Boolean(form.values[field.key])"
            @update:value="form.values[field.key] = $event"
          />
          <NInputNumber
            v-else-if="field.kind === 'integer'"
            class="w-full"
            :value="Number(form.values[field.key]) / scale(field)"
            :min="field.minimum === null ? undefined : field.minimum / scale(field)"
            :max="field.maximum === null ? undefined : field.maximum / scale(field)"
            @update:value="form.values[field.key] = Math.round(($event ?? 0) * scale(field))"
          >
            <template v-if="scale(field) > 1" #suffix>MiB</template>
          </NInputNumber>
          <NSelect
            v-else-if="field.kind === 'select'"
            :value="String(form.values[field.key])"
            :options="field.options.map(value => ({ label: value, value }))"
            @update:value="form.values[field.key] = $event"
          />
          <NSelect
            v-else-if="field.kind === 'extensions'"
            multiple
            :value="String(form.values[field.key]).split(',')"
            :options="field.options.map(value => ({ label: value, value }))"
            @update:value="updateExtensions(field.key, $event)"
          />
          <div v-else-if="['site_logo', 'default_avatar'].includes(field.key)" class="w-full">
            <NInput :value="String(form.values[field.key] ?? '')" @update:value="form.values[field.key] = $event" />
            <FileUpload
              v-if="hasAuth('system:file:upload')"
              :key="active + field.key"
              business-type="brand"
              accept=".jpg,.jpeg,.png"
              :disabled="readOnly || saving"
              @change="form.values[field.key] = $event.fileUrl"
            />
            <NImage v-if="form.values[field.key]" :src="String(form.values[field.key])" width="80" class="mt-8px" />
          </div>
          <div v-else class="w-full">
            <NInput
              :value="String(form.values[field.key] ?? '')"
              :type="field.kind === 'secret' ? 'password' : active === 'agreements' ? 'textarea' : 'text'"
              :rows="8"
              autocomplete="off"
              @update:value="form.values[field.key] = $event"
            />
            <p v-if="field.kind === 'secret'" class="mt-8px text-12px opacity-60">{{ $t('settings.secretHint') }}</p>
          </div>
        </NFormItem>
        <NButton v-if="!readOnly" type="primary" :loading="saving" @click="save">{{ $t('settings.save') }}</NButton>
      </NForm>
    </NSpin>
  </NCard>
</template>
