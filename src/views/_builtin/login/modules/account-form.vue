<script setup lang="ts">
import { computed, reactive, shallowRef, watch } from 'vue';
import { useRouterPush } from '@/hooks/common/router';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { useEmailCode } from '@/hooks/business/email-code';
import { sendAccountCode, submitAccount } from '@/service/api/account';
import type { AccountCapabilities } from '@/service/api/account';
import { $t } from '@/locales';

const props = defineProps<{
  purpose: 'register' | 'reset';
  tenantCode?: string;
  capabilities: AccountCapabilities | null;
}>();
const { toggleLoginModule } = useRouterPush();
const { formRef, validate } = useNaiveForm();
const verification = useEmailCode();
const { sending, seconds, canSend } = verification;
const busy = shallowRef(false);
const sent = shallowRef(false);
const model = reactive({ userName: '', email: '', code: '', password: '', confirmPassword: '' });
const enabled = computed(() =>
  props.purpose === 'register' ? props.capabilities?.registrationEnabled : props.capabilities?.passwordResetEnabled
);
const rules = computed(() => {
  const { formRules, createConfirmPwdRule } = useFormRules();
  return {
    userName: formRules.userName,
    email: [{ required: true, type: 'email' as const, message: $t('account.validEmail'), trigger: 'blur' }],
    code: [{ required: true, pattern: /^\d{6}$/, message: $t('account.validCode') }],
    password: formRules.pwd,
    confirmPassword: createConfirmPwdRule(model.password)
  };
});
watch(
  () => [props.tenantCode, props.purpose, model.userName, model.email],
  () => {
    sent.value = false;
    model.code = '';
  }
);
async function send() {
  if (!enabled.value || !model.userName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(model.email)) {
    window.$message?.warning($t('account.identityRequired'));
    return;
  }
  const snapshot = `${props.tenantCode}:${props.purpose}:${model.userName}:${model.email}`;
  const ok = await verification.send(() =>
    sendAccountCode({
      tenantCode: props.tenantCode,
      userName: model.userName,
      email: model.email,
      purpose: props.purpose
    })
  );
  if (snapshot === `${props.tenantCode}:${props.purpose}:${model.userName}:${model.email}`) sent.value = ok;
}
async function submit() {
  if (!enabled.value || busy.value) return;
  await validate();
  busy.value = true;
  try {
    const { error } = await submitAccount(props.purpose, {
      tenantCode: props.tenantCode,
      userName: model.userName,
      email: model.email,
      code: model.code,
      password: model.password
    });
    if (!error) {
      window.$message?.success($t(props.purpose === 'register' ? 'account.registered' : 'account.passwordReset'));
      await toggleLoginModule('pwd-login');
    }
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div>
    <NAlert v-if="!enabled" type="info" class="mb-16px">{{ $t('account.unavailable') }}</NAlert>
    <NForm
      v-else
      ref="formRef"
      :model="model"
      :rules="rules"
      label-placement="top"
      size="large"
      @submit.prevent="submit"
    >
      <NFormItem path="userName" :label="$t('page.system.user.userName')">
        <NInput v-model:value="model.userName" autocomplete="username" :disabled="busy || sending" />
      </NFormItem>
      <NFormItem path="email" :label="$t('account.email')">
        <NInput v-model:value="model.email" autocomplete="email" :disabled="busy || sending" />
      </NFormItem>
      <NFormItem path="code" :label="$t('account.code')">
        <div class="w-full flex gap-12px">
          <NInput v-model:value="model.code" autocomplete="one-time-code" :maxlength="6" />
          <NButton :loading="sending" :disabled="!canSend || busy" @click="send">
            {{ seconds ? $t('account.resend', { seconds }) : $t('account.sendCode') }}
          </NButton>
        </div>
      </NFormItem>
      <NAlert v-if="sent" type="info" class="mb-16px">
        {{
          $t(purpose === 'reset' ? 'account.recoverySent' : 'account.codeSent', { minutes: verification.minutes.value })
        }}
      </NAlert>
      <NFormItem path="password" :label="$t('account.newPassword')">
        <NInput v-model:value="model.password" type="password" autocomplete="new-password" show-password-on="click" />
      </NFormItem>
      <NFormItem path="confirmPassword" :label="$t('page.profile.confirmPassword')">
        <NInput v-model:value="model.confirmPassword" type="password" autocomplete="new-password" />
      </NFormItem>
      <NButton type="primary" attr-type="submit" block :loading="busy">{{ $t('common.confirm') }}</NButton>
    </NForm>
    <NButton text block class="mt-16px" @click="toggleLoginModule('pwd-login')">
      {{ $t('page.login.common.back') }}
    </NButton>
  </div>
</template>
