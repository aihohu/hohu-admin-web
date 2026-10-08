<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/store/modules/auth';
import {
  fetchAgentModelOptions,
  fetchBootstrapTenant,
  fetchCreateTenant,
  fetchTenantList,
  fetchTenantStatus
} from '@/service/api';
import { messages } from './messages';
import PolicyDrawer from './modules/policy-drawer.vue';

const { t } = useI18n({ messages });
const auth = useAuthStore();
const rows = ref<Api.Tenant.Record[]>([]);
const models = ref<Api.Ai.ModelOption[]>([]);
const busy = ref(false);
const failed = ref(false);
const current = ref(1);
const total = ref(0);
const mode = ref<'create' | 'bootstrap' | null>(null);
const policyOpen = ref(false);
const selected = ref<Api.Tenant.Record | null>(null);
const form = reactive({ tenantName: '', tenantCode: '', adminPassword: '', defaultModelId: '' });
let requestKey = crypto.randomUUID();
let requestFingerprint = '';
const options = computed(() =>
  models.value
    .filter(model => model.capabilities.includes('text'))
    .map(model => ({ label: model.label, value: model.modelId }))
);

async function load() {
  busy.value = true;
  try {
    const result = await fetchTenantList(current.value);
    failed.value = Boolean(result.error);
    if (result.data) {
      rows.value = result.data.records;
      total.value = result.data.total;
    }
  } finally {
    busy.value = false;
  }
}

async function open(next: 'create' | 'bootstrap' | 'policies', row?: Api.Tenant.Record) {
  selected.value = row || null;
  if (next === 'policies') {
    policyOpen.value = true;
    return;
  }
  mode.value = next;
  Object.assign(form, { tenantName: '', tenantCode: '', adminPassword: '', defaultModelId: '' });
  requestKey = crypto.randomUUID();
  requestFingerprint = '';
  busy.value = true;
  try {
    if (next !== 'create') {
      const result = await fetchAgentModelOptions();
      models.value = result.data || [];
    }
  } finally {
    busy.value = false;
  }
}

function close() {
  if (busy.value) return;
  mode.value = null;
  form.adminPassword = '';
  requestFingerprint = '';
}

async function save() {
  if (busy.value) return;
  if (
    mode.value === 'create' &&
    (!form.tenantName.trim() || !/^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$/.test(form.tenantCode))
  ) {
    window.$message?.warning(t('invalid'));
    return;
  }
  if (
    mode.value === 'bootstrap' &&
    (!form.defaultModelId || !/^(?=.*[A-Za-z])(?=.*\d).{6,20}$/.test(form.adminPassword))
  ) {
    window.$message?.warning(t('required'));
    return;
  }
  const fingerprint = JSON.stringify(form);
  if (requestFingerprint && requestFingerprint !== fingerprint) requestKey = crypto.randomUUID();
  requestFingerprint = fingerprint;
  busy.value = true;
  try {
    let error: unknown;
    if (mode.value === 'create') {
      ({ error } = await fetchCreateTenant(
        { tenantCode: form.tenantCode, tenantName: form.tenantName.trim() },
        requestKey
      ));
    } else if (mode.value === 'bootstrap' && selected.value) {
      ({ error } = await fetchBootstrapTenant(
        selected.value.tenantId,
        { defaultModelId: form.defaultModelId, adminPassword: form.adminPassword },
        requestKey
      ));
    }
    if (!error) {
      mode.value = null;
      form.adminPassword = '';
      requestFingerprint = '';
      window.$message?.success(t('success'));
      await load();
    }
  } finally {
    busy.value = false;
  }
}

function changeStatus(row: Api.Tenant.Record, action: 'activate' | 'disable') {
  window.$dialog?.warning({
    title: t(action === 'disable' ? 'disable' : 'activate'),
    content: t(action === 'disable' ? 'disableConfirm' : 'enableConfirm'),
    positiveText: t('confirm'),
    negativeText: t('cancel'),
    onPositiveClick: async () => {
      busy.value = true;
      try {
        const { error } = await fetchTenantStatus(row.tenantId, action);
        if (error) return false;
        window.$message?.success(t('success'));
        await load();
        return true;
      } finally {
        busy.value = false;
      }
    }
  });
}

onMounted(() => {
  if (auth.userInfo.isSystemAdmin) load();
});
</script>

<template>
  <NCard :title="t('title')">
    <NAlert v-if="!auth.userInfo.isSystemAdmin" type="error">{{ t('noAccess') }}</NAlert>
    <NSpace v-else vertical :size="20">
      <NAlert type="info">{{ t('hint') }} {{ t('deployment') }}</NAlert>
      <NSpace>
        <NButton type="primary" :disabled="busy" @click="open('create')">{{ t('create') }}</NButton>
        <NButton :loading="busy" @click="load">{{ t('refresh') }}</NButton>
      </NSpace>
      <NAlert v-if="failed" type="error">{{ t('failed') }}</NAlert>
      <div class="overflow-x-auto">
        <NTable :single-line="false">
          <thead>
            <tr>
              <th>{{ t('name') }}</th>
              <th>{{ t('code') }}</th>
              <th>{{ t('status') }}</th>
              <th>{{ t('policies') }}</th>
              <th>{{ t('action') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.tenantId">
              <td>{{ row.tenantName }}</td>
              <td>{{ row.tenantCode }}</td>
              <td>
                <NTag :type="row.enabled ? 'success' : 'warning'">
                  {{ t(row.bootstrapStatus === 'pending' ? 'pending' : row.lifecycleState) }}
                </NTag>
              </td>
              <td>
                <NButton v-if="row.bootstrapStatus === 'ready'" :disabled="busy" @click="open('policies', row)">
                  {{ t('authorize') }}
                </NButton>
                <span v-else>{{ t('authorizeAfterBootstrap') }}</span>
              </td>
              <td>
                <span v-if="row.tenantId === '0'">—</span>
                <NSpace v-else>
                  <NButton
                    v-if="row.bootstrapStatus === 'pending'"
                    :disabled="busy || row.lifecycleState !== 'prepared'"
                    @click="open('bootstrap', row)"
                  >
                    {{ t('bootstrap') }}
                  </NButton>
                  <NButton
                    v-if="!row.enabled && row.bootstrapStatus === 'ready'"
                    type="primary"
                    :disabled="busy"
                    @click="changeStatus(row, 'activate')"
                  >
                    {{ t(row.lifecycleState === 'disabled' ? 'reactivate' : 'activate') }}
                  </NButton>
                  <NButton v-if="row.enabled" type="warning" :disabled="busy" @click="changeStatus(row, 'disable')">
                    {{ t('disable') }}
                  </NButton>
                </NSpace>
              </td>
            </tr>
          </tbody>
        </NTable>
      </div>
      <NPagination v-model:page="current" :item-count="total" :page-size="20" :disabled="busy" @update:page="load" />
    </NSpace>
    <PolicyDrawer
      v-if="selected"
      v-model:show="policyOpen"
      :tenant-id="selected.tenantId"
      :tenant-name="selected.tenantName"
      @saved="load"
    />
    <NModal
      :show="mode !== null"
      :mask-closable="!busy"
      @update:show="
        value => {
          if (!value) close();
        }
      "
    >
      <NCard class="w-600px max-w-95vw" :title="mode ? t(mode) : ''">
        <NForm label-placement="top" :disabled="busy">
          <template v-if="mode === 'create'">
            <NFormItem :label="t('name')"><NInput v-model:value="form.tenantName" :maxlength="100" /></NFormItem>
            <NFormItem :label="t('code')"><NInput v-model:value="form.tenantCode" :maxlength="32" /></NFormItem>
            <NAlert type="info">{{ t('loginHint') }}</NAlert>
          </template>
          <template v-else-if="mode === 'bootstrap'">
            <NAlert class="mb-16px" type="info">{{ selected?.tenantName }} — {{ t('adminHint') }}</NAlert>
            <NFormItem :label="t('password')">
              <NInput
                v-model:value="form.adminPassword"
                type="password"
                show-password-on="click"
                autocomplete="new-password"
              />
            </NFormItem>
            <NFormItem :label="t('model')">
              <NSelect v-model:value="form.defaultModelId" :options="options" />
            </NFormItem>
            <NAlert v-if="!options.length" type="warning">{{ t('noModels') }}</NAlert>
          </template>
        </NForm>
        <template #footer>
          <NSpace justify="end">
            <NButton
              :disabled="busy"
              @click="
                mode = null;
                form.adminPassword = '';
                requestFingerprint = '';
              "
            >
              {{ t('cancel') }}
            </NButton>
            <NButton type="primary" :loading="busy" @click="save">{{ t('save') }}</NButton>
          </NSpace>
        </template>
      </NCard>
    </NModal>
  </NCard>
</template>
