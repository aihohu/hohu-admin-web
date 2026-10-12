<script setup lang="ts">
import { onMounted, reactive, shallowRef, watch } from 'vue';
import { bindEmail, fetchEmailStatus, sendBindingCode } from '@/service/api/account';
import type { EmailStatus } from '@/service/api/account';
import { useEmailCode } from '@/hooks/business/email-code';
import { $t } from '@/locales';

const emit = defineEmits<{ saved: [] }>();
const status = shallowRef<EmailStatus | null>(null);
const busy = shallowRef(false);
const failed = shallowRef(false);
const model = reactive({ email: '', password: '', code: '' });
const verification = useEmailCode();
const { sending, seconds, canSend } = verification;
const sent = shallowRef(false);
watch(
  () => [model.email, model.password],
  () => {
    model.code = '';
    sent.value = false;
  }
);
async function load() {
  const { data, error } = await fetchEmailStatus();
  failed.value = Boolean(error);
  if (data && !error) {
    status.value = data;
    model.email = data.email;
  }
}
async function send() {
  if (!model.password || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(model.email)) {
    window.$message?.warning($t('account.identityRequired'));
    return;
  }
  sent.value = await verification.send(() => sendBindingCode({ email: model.email, password: model.password }));
}
async function save() {
  if (busy.value || !status.value?.enabled || !/^\d{6}$/.test(model.code)) return;
  busy.value = true;
  try {
    const { error } = await bindEmail({ ...model });
    if (!error) {
      model.password = '';
      model.code = '';
      sent.value = false;
      await load();
      emit('saved');
      window.$message?.success($t('account.emailVerified'));
    }
  } finally {
    busy.value = false;
  }
}
onMounted(load);
</script>

<template>
  <div class="mt-16px">
    <NAlert v-if="failed" type="error">
      <NButton text @click="load">{{ $t('settings.retry') }}</NButton>
    </NAlert>
    <template v-if="status">
      <NAlert :type="status.verified ? 'success' : 'warning'" class="mb-16px">
        {{ $t(status.verified ? 'account.emailVerified' : 'account.emailUnverified') }}
      </NAlert>
      <NAlert v-if="!status.enabled" type="info">{{ $t('account.mailUnavailable') }}</NAlert>
      <NForm v-else label-placement="top" :disabled="busy || sending" @submit.prevent="save">
        <NFormItem :label="$t('account.email')"><NInput v-model:value="model.email" autocomplete="email" /></NFormItem>
        <NFormItem :label="$t('account.currentPassword')">
          <NInput v-model:value="model.password" type="password" autocomplete="current-password" />
        </NFormItem>
        <NFormItem :label="$t('account.code')">
          <div class="w-full flex gap-12px">
            <NInput v-model:value="model.code" autocomplete="one-time-code" :maxlength="6" />
            <NButton :disabled="!canSend" :loading="sending" @click="send">
              {{ seconds ? $t('account.resend', { seconds }) : $t('account.sendCode') }}
            </NButton>
          </div>
        </NFormItem>
        <NAlert v-if="sent" type="info" class="mb-16px">
          {{ $t('account.codeSent', { minutes: verification.minutes.value }) }}
        </NAlert>
        <NButton type="primary" attr-type="submit" :loading="busy">{{ $t('account.verifyEmail') }}</NButton>
      </NForm>
    </template>
  </div>
</template>
