<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue';
import { useRouter } from 'vue-router';
import { isMaintenanceConsole } from '@/utils/maintenance-console';
import { useFieldMaintenance } from '@/store/modules/field-maintenance';
import { useAuthStore } from '@/store/modules/auth';
import { useRouterPush } from '@/hooks/common/router';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';
import AccountLinks from './account-links.vue';
import type { AccountCapabilities } from '@/service/api/account';
const props = defineProps<{ tenantCode?: string; capabilities: AccountCapabilities | null }>();

defineOptions({
  name: 'PwdLogin'
});

const authStore = useAuthStore();
const router = useRouter();
const session = isMaintenanceConsole() ? useFieldMaintenance() : undefined;
const pending = shallowRef(false);
const { toggleLoginModule } = useRouterPush();
const { formRef, validate } = useNaiveForm();

interface FormModel {
  userName: string;
  password: string;
}

const model: FormModel = reactive({
  userName: '',
  password: ''
});

const rules = computed<Record<keyof FormModel, App.Global.FormRule[]>>(() => {
  // inside computed to make locale reactive, if not apply i18n, you can define it without computed
  const { formRules } = useFormRules();

  return {
    userName: formRules.userName,
    password: [{ required: true, message: $t('form.pwd.required') }]
  };
});

async function handleSubmit() {
  if (pending.value) return;
  await validate();
  if (session) {
    pending.value = true;
    try {
      await session.login(model.userName, model.password, props.tenantCode);
      await router.replace({ name: 'system_role' });
    } catch {
      window.$message?.error($t('fieldPolicy.loginFailed'));
    } finally {
      model.password = '';
      pending.value = false;
    }
    return;
  }
  await authStore.login(model.userName, model.password, true, props.tenantCode);
}
</script>

<template>
  <NForm ref="formRef" :model="model" :rules="rules" size="large" :show-label="false" @keyup.enter="handleSubmit">
    <NFormItem path="userName">
      <NInput v-model:value="model.userName" :placeholder="$t('page.login.common.userNamePlaceholder')" />
    </NFormItem>
    <NFormItem path="password">
      <NInput
        v-model:value="model.password"
        type="password"
        show-password-on="click"
        :placeholder="$t('page.login.common.passwordPlaceholder')"
      />
    </NFormItem>
    <NButton type="primary" size="large" round block :loading="pending || authStore.loginLoading" @click="handleSubmit">
      {{ $t('common.confirm') }}
    </NButton>
    <AccountLinks
      :registration="Boolean(capabilities?.registrationEnabled)"
      :recovery="Boolean(capabilities?.passwordResetEnabled)"
      @navigate="toggleLoginModule"
    />
  </NForm>
</template>

<style scoped></style>
