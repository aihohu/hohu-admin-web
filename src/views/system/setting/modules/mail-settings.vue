<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import { fetchMailConfiguration, saveMailConfiguration, testMailConfiguration } from '@/service/api/settings';
import type { MailConfiguration } from '@/service/api/settings';
import { useAuth } from '@/hooks/business/auth';
import { $t } from '@/locales';

const emit = defineEmits<{ dirty: [value: boolean]; saved: [ready: boolean] }>();
const { hasAuth } = useAuth();
const config = ref<MailConfiguration | null>(null);
const baseline = shallowRef('');
const busy = shallowRef(false);
const failed = shallowRef(false);
const clearPassword = shallowRef(false);
const recipient = shallowRef('');
const dirty = computed(() =>
  Boolean(config.value && (JSON.stringify(config.value.values) !== baseline.value || clearPassword.value))
);
const readOnly = computed(() => !hasAuth('system:setting:edit'));
watch(dirty, value => emit('dirty', value));
function apply(data: MailConfiguration) {
  config.value = data;
  baseline.value = JSON.stringify(data.values);
  clearPassword.value = false;
}
async function load() {
  busy.value = true;
  failed.value = false;
  try {
    const { data, error } = await fetchMailConfiguration();
    if (data && !error) apply(data);
    else failed.value = true;
  } finally {
    busy.value = false;
  }
}
async function save() {
  if (!config.value || busy.value || readOnly.value) return;
  busy.value = true;
  try {
    const { data, error } = await saveMailConfiguration({
      values: { ...config.value.values, fromEmail: config.value.values.fromEmail || null },
      revision: config.value.revision,
      clearPassword: clearPassword.value
    });
    if (data && !error) {
      apply(data);
      emit('saved', data.ready);
      window.$message?.success($t('settings.saved'));
    }
  } finally {
    busy.value = false;
  }
}
async function test() {
  if (busy.value || dirty.value || readOnly.value || !recipient.value) return;
  busy.value = true;
  try {
    const { data, error } = await testMailConfiguration(recipient.value);
    if (data && !error) apply(data);
  } finally {
    busy.value = false;
  }
}
onMounted(load);
</script>

<template>
  <NSpin :show="busy">
    <NAlert v-if="failed" type="error">
      <NButton text @click="load">{{ $t('settings.retry') }}</NButton>
    </NAlert>
    <NForm v-if="config" label-placement="top" class="max-w-720px" :disabled="busy || readOnly">
      <NAlert type="info" class="mb-16px">{{ $t('account.mailScope') }}</NAlert>
      <NFormItem :label="$t('account.mailEnabled')"><NSwitch v-model:value="config.values.enabled" /></NFormItem>
      <NFormItem :label="$t('account.smtpHost')">
        <NInput v-model:value="config.values.host" autocomplete="off" />
      </NFormItem>
      <NFormItem :label="$t('account.smtpPort')">
        <NInputNumber v-model:value="config.values.port" :min="1" :max="65535" :precision="0" />
      </NFormItem>
      <NFormItem :label="$t('account.smtpSecurity')">
        <NSelect
          v-model:value="config.values.security"
          :options="[
            { label: 'TLS', value: 'TLS' },
            { label: 'STARTTLS', value: 'STARTTLS' }
          ]"
        />
      </NFormItem>
      <NFormItem :label="$t('account.smtpUsername')">
        <NInput v-model:value="config.values.username" autocomplete="off" />
      </NFormItem>
      <NFormItem :label="$t('account.smtpPassword')">
        <div class="w-full">
          <NInput
            v-model:value="config.values.password"
            type="password"
            autocomplete="new-password"
            :disabled="clearPassword"
          />
          <p class="mt-8px text-12px">
            {{ config.configuredPassword ? $t('account.passwordConfigured') : $t('account.passwordMissing') }} ·
            {{ $t('settings.secretHint') }}
          </p>
          <NCheckbox v-model:checked="clearPassword" class="mt-8px" @update:checked="config.values.password = ''">
            {{ $t('account.clearPassword') }}
          </NCheckbox>
        </div>
      </NFormItem>
      <NFormItem :label="$t('account.fromEmail')">
        <NInput :value="config.values.fromEmail || ''" @update:value="config.values.fromEmail = $event" />
      </NFormItem>
      <NFormItem :label="$t('account.fromName')"><NInput v-model:value="config.values.fromName" /></NFormItem>
      <NButton v-if="!readOnly" type="primary" :loading="busy" @click="save">{{ $t('settings.save') }}</NButton>
      <NDivider />
      <NAlert :type="config.ready ? 'success' : 'warning'" class="mb-16px">
        {{ $t(config.ready ? 'account.mailReady' : 'account.mailNotReady') }}
      </NAlert>
      <NFormItem :label="$t('account.testRecipient')"><NInput v-model:value="recipient" /></NFormItem>
      <NButton :disabled="dirty || !recipient || readOnly" :loading="busy" @click="test">
        {{ $t('account.testMail') }}
      </NButton>
      <p class="mt-12px">
        {{ $t(`account.test_${config.lastTestStatus}`) }}
        {{ config.lastTestAt ? new Date(config.lastTestAt).toLocaleString() : '' }}
      </p>
      <p class="mt-8px text-12px opacity-70">{{ $t('account.testHint') }}</p>
    </NForm>
  </NSpin>
</template>
