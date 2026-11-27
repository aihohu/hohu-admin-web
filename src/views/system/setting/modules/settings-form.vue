<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { fetchSettingGroups } from '@/service/api/settings';
import type { SettingField } from '@/service/api/settings';
import { useSettingsDraft } from '@/hooks/business/settings-draft';
import { registrationEditable } from '@/hooks/business/control-fields';
import { useAuth } from '@/hooks/business/auth';
import { $t } from '@/locales';
import { refreshRuntimeSettings } from '@/utils/runtime-settings';
import MailSettings from './mail-settings.vue';
import FileUpload from '@/components/custom/file-upload.vue';
import { useAppStore } from '@/store/modules/app';

const { hasAuth } = useAuth();
const route = useRoute();
const router = useRouter();
const mailDirty = ref(false);
const groups = ref<string[]>([]);
const state = useSettingsDraft();
const { active, drafts, form, fields, loading, saving, failed, editable } = state;
const dirty = computed(() => mailDirty.value || state.dirty.value);
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
  await state.load(group);
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
  window.removeEventListener('beforeunload', beforeUnload);
});
async function save() {
  if (readOnly.value) return;
  const token = state.session();
  if (await state.save()) {
    const runtime = await refreshRuntimeSettings();
    if (!state.current(token)) return;
    if (runtime) useAppStore().applyDefaultLocale(runtime.defaultLocale);
    window.$message?.success($t('settings.saved'));
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
        <NButton text @click="groups.length ? state.load(active, true) : initialize()">
          {{ $t('settings.retry') }}
        </NButton>
      </NAlert>
      <MailSettings
        v-if="groups.includes('mail')"
        v-show="active === 'mail'"
        @dirty="mailDirty = $event"
        @saved="drafts.account && (drafts.account.mailReady = $event)"
      />
      <NForm
        v-if="form && active !== 'mail'"
        label-placement="top"
        class="max-w-720px"
        :disabled="readOnly || saving || failed || loading"
      >
        <NAlert v-if="active === 'files'" type="info" class="mb-16px">{{ $t('settings.limitHint') }}</NAlert>
        <NAlert v-if="active === 'account' && !form.mailReady" type="warning" class="mb-16px">
          {{ $t('account.mailNotReady') }}
        </NAlert>
        <NFormItem v-for="field in fields" :key="field.key" :label="label(field.key)">
          <NSwitch
            v-if="field.kind === 'boolean'"
            :value="Boolean(form.values[field.key])"
            :disabled="
              !editable(field.key) ||
              (active === 'account' &&
                ['register_enabled', 'password_reset_enabled'].includes(field.key) &&
                !form.mailReady &&
                !form.values[field.key])
            "
            @update:value="form.values[field.key] = $event"
          />
          <NInputNumber
            v-else-if="field.kind === 'integer'"
            class="w-full"
            :disabled="!editable(field.key)"
            :value="Object.hasOwn(form.values, field.key) ? Number(form.values[field.key]) / scale(field) : null"
            :min="field.minimum === null ? undefined : field.minimum / scale(field)"
            :max="field.maximum === null ? undefined : field.maximum / scale(field)"
            @update:value="form.values[field.key] = Math.round(($event ?? 0) * scale(field))"
          >
            <template v-if="scale(field) > 1" #suffix>MiB</template>
          </NInputNumber>
          <NSelect
            v-else-if="field.key === 'registration_role_id' && registrationEditable(form)"
            :disabled="!editable(field.key)"
            :value="String(form.values[field.key])"
            :options="[{ label: $t('account.personalOnly'), value: '' }, ...(form.roleOptions || [])]"
            @update:value="form.values[field.key] = $event"
          />
          <NAlert v-else-if="field.key === 'registration_role_id'" type="info">
            {{ $t('fieldPolicy.registrationRetained') }}
          </NAlert>
          <NSelect
            v-else-if="field.kind === 'select'"
            :disabled="!editable(field.key)"
            :value="Object.hasOwn(form.values, field.key) ? String(form.values[field.key]) : null"
            :options="field.options.map(value => ({ label: value, value }))"
            @update:value="form.values[field.key] = $event"
          />
          <NSelect
            v-else-if="field.kind === 'extensions'"
            :disabled="!editable(field.key)"
            multiple
            :value="Object.hasOwn(form.values, field.key) ? String(form.values[field.key]).split(',') : []"
            :options="field.options.map(value => ({ label: value, value }))"
            @update:value="updateExtensions(field.key, $event)"
          />
          <div v-else-if="['site_logo', 'default_avatar'].includes(field.key)" class="w-full">
            <NInput
              :disabled="!editable(field.key)"
              :value="String(form.values[field.key] ?? '')"
              @update:value="form.values[field.key] = $event"
            />
            <FileUpload
              v-if="hasAuth('system:file:upload') && editable(field.key)"
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
              :disabled="!editable(field.key)"
              :type="field.kind === 'secret' ? 'password' : active === 'agreements' ? 'textarea' : 'text'"
              :rows="8"
              autocomplete="off"
              @update:value="form.values[field.key] = $event"
            />
            <p v-if="field.kind === 'secret'" class="mt-8px text-12px opacity-60">{{ $t('settings.secretHint') }}</p>
          </div>
        </NFormItem>
        <NEmpty v-if="!fields.length" :description="$t('fieldPolicy.noVisibleFields')" />
        <NButton
          v-if="!readOnly && state.canSave.value"
          type="primary"
          :disabled="!Object.keys(state.patch()).length"
          :loading="saving"
          @click="save"
        >
          {{ $t('settings.save') }}
        </NButton>
      </NForm>
    </NSpin>
  </NCard>
</template>
