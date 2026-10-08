<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { fetchSaveTenantPolicies, fetchTenantModelCatalog } from '@/service/api';
import { messages } from '../messages';

const props = defineProps<{ show: boolean; tenantId: string; tenantName: string }>();
const emit = defineEmits<{ 'update:show': [show: boolean]; saved: [] }>();
const { t } = useI18n({ messages });
const rows = ref<Api.Tenant.ModelCatalogItem[]>([]);
const revision = ref('');
const baseline = ref('');
const loading = ref(false);
const saving = ref(false);
const failed = ref(false);
const saveFailed = ref(false);
const search = ref('');
const provider = ref('');
const authorization = ref('all');
let requestId = 0;
const policies = computed(() =>
  rows.value.map(({ modelId, enabled, isDefault, dailyQuotaPerUser }) => ({
    modelId,
    enabled,
    isDefault,
    dailyQuotaPerUser
  }))
);
const dirty = computed(() => JSON.stringify(policies.value) !== baseline.value);
const enabledCount = computed(() => rows.value.filter(row => row.enabled).length);
const defaultModel = computed(() => rows.value.find(row => row.isDefault));
const valid = computed(
  () => enabledCount.value === 0 || Boolean(defaultModel.value?.enabled && defaultModel.value.modelAvailable)
);
const canSave = computed(
  () => Boolean(revision.value) && !failed.value && !loading.value && !saving.value && dirty.value && valid.value
);
const providerOptions = computed(() => [
  { label: t('allProviders'), value: '' },
  ...Array.from(
    new Map(rows.value.map(row => [row.providerId, { label: row.providerName, value: row.providerId }])).values()
  )
]);
const authorizationOptions = computed(() => [
  { label: t('allModels'), value: 'all' },
  { label: t('authorized'), value: 'enabled' },
  { label: t('unauthorized'), value: 'disabled' }
]);
const visibleRows = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();
  return rows.value.filter(
    row =>
      (!provider.value || row.providerId === provider.value) &&
      (authorization.value === 'all' || row.enabled === (authorization.value === 'enabled')) &&
      (!query || `${row.providerName} / ${row.modelName}`.toLocaleLowerCase().includes(query))
  );
});

async function load() {
  const id = ++requestId;
  loading.value = true;
  failed.value = false;
  saveFailed.value = false;
  revision.value = '';
  rows.value = [];
  baseline.value = '[]';
  try {
    const { data, error } = await fetchTenantModelCatalog(props.tenantId);
    if (id !== requestId) return;
    if (error || !data) {
      failed.value = true;
      return;
    }
    rows.value = data.models.map(row => ({ ...row }));
    revision.value = data.revision;
    baseline.value = JSON.stringify(policies.value);
  } catch {
    if (id === requestId) failed.value = true;
  } finally {
    if (id === requestId) loading.value = false;
  }
}

watch(
  () => [props.show, props.tenantId] as const,
  ([show]) => {
    if (show) {
      search.value = '';
      provider.value = '';
      authorization.value = 'all';
      load();
    } else {
      requestId += 1;
    }
  },
  { immediate: true }
);

function discardThen(action: () => void) {
  if (saving.value) return;
  if (!dirty.value) {
    action();
    return;
  }
  window.$dialog?.warning({
    title: t('unsavedTitle'),
    content: t('discardChanges'),
    positiveText: t('discard'),
    negativeText: t('keepEditing'),
    onPositiveClick: action
  });
}
function setEnabled(row: Api.Tenant.ModelCatalogItem, value: boolean) {
  row.enabled = value;
  if (!value) row.isDefault = false;
}
function setDefault(row: Api.Tenant.ModelCatalogItem) {
  if (!row.enabled || !row.modelAvailable || saving.value) return;
  rows.value.forEach(item => {
    item.isDefault = item.modelId === row.modelId;
  });
}
async function persist() {
  if (!canSave.value) return;
  saving.value = true;
  saveFailed.value = false;
  try {
    const { error } = await fetchSaveTenantPolicies(props.tenantId, {
      revision: revision.value,
      policies: policies.value
    });
    if (error) {
      saveFailed.value = true;
      return;
    }
    window.$message?.success(t('success'));
    emit('saved');
    emit('update:show', false);
  } catch {
    saveFailed.value = true;
  } finally {
    saving.value = false;
  }
}
function save() {
  if (!canSave.value) return;
  if (enabledCount.value === 0) {
    window.$dialog?.warning({
      title: t('disableAllTitle'),
      content: t('disableAllConfirm'),
      positiveText: t('saveChanges'),
      negativeText: t('cancel'),
      onPositiveClick: persist
    });
  } else {
    persist();
  }
}
</script>

<template>
  <NDrawer
    :show="show"
    :width="960"
    class="max-w-100vw"
    :mask-closable="!saving"
    :close-on-esc="!saving"
    @update:show="
      value => {
        if (!value) discardThen(() => emit('update:show', false));
      }
    "
  >
    <NDrawerContent :title="`${t('policies')} · ${tenantName}`" :closable="!saving" :native-scrollbar="false">
      <NSpace vertical :size="20">
        <NAlert type="info" :show-icon="false">{{ t('policyHint') }}</NAlert>
        <NAlert v-if="failed" type="error">{{ t('catalogFailed') }}</NAlert>
        <NAlert v-if="saveFailed" type="error">{{ t('saveFailed') }}</NAlert>
        <div class="flex flex-wrap items-center gap-12px">
          <NInput
            v-model:value="search"
            class="min-w-180px flex-1"
            clearable
            :placeholder="t('searchModels')"
            :aria-label="t('searchModels')"
          />
          <NSelect
            v-model:value="provider"
            class="w-160px"
            :options="providerOptions"
            :aria-label="t('allProviders')"
          />
          <NSelect
            v-model:value="authorization"
            class="w-140px"
            :options="authorizationOptions"
            :aria-label="t('authorizationStatus')"
          />
          <NButton :disabled="loading || saving" @click="discardThen(load)">{{ t('reload') }}</NButton>
        </div>
        <NSpace v-if="revision">
          <NTag>{{ t('authorized') }} {{ enabledCount }} / {{ rows.length }}</NTag>
          <NTag>
            {{ t('tenantDefault') }}:
            {{ defaultModel ? `${defaultModel.providerName} / ${defaultModel.modelName}` : t('notSelected') }}
          </NTag>
        </NSpace>
        <NAlert v-if="revision && enabledCount > 0 && !valid" type="warning">{{ t('defaultRequired') }}</NAlert>
        <NSpin :show="loading">
          <div v-if="visibleRows.length" class="overflow-x-auto">
            <NTable class="min-w-600px" :single-line="false">
              <thead>
                <tr>
                  <th>{{ t('providerModel') }}</th>
                  <th>{{ t('enabled') }}</th>
                  <th>{{ t('tenantDefault') }}</th>
                  <!--
 模型额度接入运行时限额后恢复此列。
                  <th>{{ t('quotaShort') }}</th>
                  -->
                  <th>{{ t('configurationStatus') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in visibleRows" :key="row.modelId">
                  <td class="max-w-240px break-words">
                    <div class="font-medium">{{ row.modelName }}</div>
                    <div class="text-12px text-gray-500">{{ row.providerName }}</div>
                  </td>
                  <td>
                    <NSwitch
                      :value="row.enabled"
                      :disabled="saving || (!row.modelAvailable && !row.enabled)"
                      :aria-label="`${row.modelName} ${t('enabled')}`"
                      @update:value="value => setEnabled(row, value)"
                    />
                  </td>
                  <td>
                    <input
                      type="radio"
                      name="tenant-default-model"
                      :checked="row.isDefault"
                      :disabled="saving || !row.enabled || !row.modelAvailable"
                      :aria-label="`${row.modelName} ${t('tenantDefault')}`"
                      class="h-16px w-16px cursor-pointer"
                      style="accent-color: var(--primary-color)"
                      @change="setDefault(row)"
                    />
                  </td>
                  <!--
 模型额度暂不开放编辑；保存时透传原值。
                  <td>
                    <NInputNumber
                      v-model:value="row.dailyQuotaPerUser"
                      class="w-150px"
                      :min="1"
                      :max="2147483647"
                      :precision="0"
                      :show-button="false"
                      :disabled="saving || !row.enabled || !row.modelAvailable"
                      :placeholder="t('unlimited')"
                      :aria-label="`${row.modelName} ${t('quotaShort')}`"
                    />
                  </td>
                  -->
                  <td>
                    <NTag size="small" :type="row.modelAvailable ? 'success' : 'warning'">
                      {{ t(row.unavailableReason || 'configurationReady') }}
                    </NTag>
                  </td>
                </tr>
              </tbody>
            </NTable>
          </div>
          <NEmpty v-else-if="!loading && !failed" :description="t(rows.length ? 'noMatches' : 'noModels')" />
        </NSpin>
        <div class="text-12px text-gray-500">
          {{ t('configurationHint') }}
          <!-- {{ t('quotaNotice') }} -->
        </div>
      </NSpace>
      <template #footer>
        <NSpace justify="end">
          <NButton :disabled="saving" @click="discardThen(() => emit('update:show', false))">{{ t('cancel') }}</NButton>
          <NButton type="primary" :disabled="!canSave" :loading="saving" @click="save">{{ t('saveChanges') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
