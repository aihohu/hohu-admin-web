<script setup lang="ts">
import { computed, h, onBeforeUnmount, shallowRef } from 'vue';
import { NAlert, NButton, NCard, NDataTable, NForm, NFormItem, NInput, NSpace, useDialog } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { createPreparationClient } from '@/service/request/policy-preparation';
import { $t } from '@/locales';
import FieldPolicyDrawer from '@/views/system/role/modules/field-policy-drawer.vue';

const label = (key: string) => $t(`fieldPolicy.${key}`);
const identity = shallowRef('');
const tenantCode = shallowRef('default');
const userName = shallowRef('');
const password = shallowRef('');
const busy = shallowRef(false);
const error = shallowRef('');
const ended = shallowRef(false);
const roles = shallowRef<Api.FieldManagement.Role[]>([]);
const nextCursor = shallowRef<string | null>(null);
const roleId = shallowRef('');
const visible = shallowRef(false);
const dialog = useDialog();
const client = createPreparationClient(() => {
  clear();
  error.value = 'sessionExpired';
});
let expiry: ReturnType<typeof setTimeout> | undefined;
let generation = 0;
function clear() {
  generation++;
  identity.value = '';
  roles.value = [];
  visible.value = false;
  roleId.value = '';
  password.value = '';
  nextCursor.value = null;
  busy.value = false;
  clearTimeout(expiry);
}
onBeforeUnmount(() => {
  clear();
  client.dispose();
});
async function loadRoles(cursor = '0') {
  const current = generation;
  busy.value = true;
  try {
    const result = await client.repository.roles(cursor);
    if (current !== generation) return;
    roles.value = cursor === '0' ? result.records : [...roles.value, ...result.records];
    nextCursor.value = result.nextCursor;
  } catch {
    if (current === generation) error.value = 'prepareUnavailable';
  } finally {
    if (current === generation) busy.value = false;
  }
}
async function login() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    const session = await client.login({
      tenantCode: tenantCode.value,
      userName: userName.value,
      password: password.value
    });
    identity.value = session.tenantId + '/' + session.actorId + '/' + crypto.randomUUID();
    expiry = setTimeout(() => {
      clear();
      client.dispose();
      error.value = 'sessionExpired';
    }, session.expiresIn * 1000);
    await loadRoles();
  } catch {
    error.value = 'loginFailed';
  } finally {
    password.value = '';
    busy.value = false;
  }
}
async function logout() {
  busy.value = true;
  try {
    await client.logout();
  } catch {
    error.value = 'prepareUnavailable';
  } finally {
    clear();
    busy.value = false;
  }
}
function finish() {
  dialog.warning({
    title: label('prepareFinish'),
    content: label('prepareFinishHint'),
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      busy.value = true;
      try {
        await client.finish();
        clear();
        ended.value = true;
      } catch {
        error.value = 'prepareUnavailable';
      } finally {
        busy.value = false;
      }
    }
  });
}
const columns = computed<DataTableColumns<Api.FieldManagement.Role>>(() => [
  { key: 'roleName', title: $t('page.system.role.roleName'), minWidth: 160 },
  { key: 'roleCode', title: $t('page.system.role.roleCode'), minWidth: 120 },
  {
    key: 'operate',
    title: $t('common.operate'),
    minWidth: 430,
    render: row =>
      h(NSpace, {}, () => [
        h(NButton, { type: 'info', ghost: true, size: 'small', disabled: true }, () => $t('page.system.role.menuAuth')),
        h(
          NButton,
          {
            type: 'info',
            ghost: true,
            size: 'small',
            onClick: () => {
              roleId.value = row.roleId;
              visible.value = true;
            }
          },
          () => label('title')
        ),
        h(NButton, { type: 'primary', ghost: true, size: 'small', disabled: true }, () =>
          $t('page.ai.aiAgentAuth.title')
        ),
        h(NButton, { type: 'primary', ghost: true, size: 'small', disabled: true }, () => $t('common.edit')),
        h(NButton, { type: 'error', ghost: true, size: 'small', disabled: true }, () => $t('common.delete'))
      ])
  }
]);
</script>

<template>
  <main class="mx-auto max-w-1400px p-16px">
    <h1 class="mb-16px text-20px font-semibold">{{ label('prepareTitle') }}</h1>
    <NAlert type="warning" class="mb-16px">{{ label('prepareHint') }}</NAlert>
    <NAlert v-if="error" type="error" class="mb-16px">{{ label(error) }}</NAlert>
    <NAlert v-if="ended" type="success">{{ label('prepareEnded') }}</NAlert>
    <NCard v-else-if="!identity" class="mx-auto max-w-440px" :title="label('prepareLogin')">
      <NForm @submit.prevent="login">
        <NFormItem :label="label('tenantCode')">
          <NInput
            v-model:value="tenantCode"
            :input-props="{ 'aria-label': label('tenantCode'), autocomplete: 'organization' }"
            :placeholder="label('tenantCode')"
            :disabled="busy"
          />
        </NFormItem>
        <NFormItem :label="label('user_name')">
          <NInput
            v-model:value="userName"
            :input-props="{ 'aria-label': label('user_name'), autocomplete: 'username' }"
            :placeholder="label('user_name')"
            :disabled="busy"
          />
        </NFormItem>
        <NFormItem :label="label('password')">
          <NInput
            v-model:value="password"
            type="password"
            :input-props="{ 'aria-label': label('password'), autocomplete: 'current-password' }"
            :placeholder="label('password')"
            :disabled="busy"
          />
        </NFormItem>
        <NButton attr-type="submit" type="primary" :loading="busy" :disabled="!userName.trim() || !password">
          {{ label('prepareLogin') }}
        </NButton>
      </NForm>
    </NCard>
    <NCard v-else :title="$t('page.system.role.title')" size="small" :bordered="false" class="card-wrapper">
      <template #header-extra>
        <NSpace>
          <NButton :disabled="busy" @click="logout">{{ label('prepareLogout') }}</NButton>
          <NButton :disabled="busy" @click="finish">{{ label('prepareFinish') }}</NButton>
        </NSpace>
      </template>
      <NDataTable
        :columns="columns"
        :data="roles"
        :loading="busy"
        :row-key="row => row.roleId"
        size="small"
        :scroll-x="900"
      />
      <NButton v-if="nextCursor" :disabled="busy" class="mt-12px" @click="loadRoles(nextCursor)">
        {{ label('moreRoles') }}
      </NButton>
    </NCard>
    <FieldPolicyDrawer
      v-model:visible="visible"
      :role-id="roleId"
      :identity="identity"
      :repository="client.repository"
    />
  </main>
</template>
