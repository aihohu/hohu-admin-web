<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, toRef, watch } from 'vue';
import {
  NAlert,
  NButton,
  NDescriptions,
  NDescriptionsItem,
  NDivider,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NFormItem,
  NInput,
  NSelect,
  NSpace,
  NSpin,
  NTag,
  NText,
  useDialog,
  useMessage
} from 'naive-ui';
import type { FieldPolicyRepository } from '@/service/api/field-policy-contract';
import { useFieldPolicy } from '@/hooks/business/field-policy-management';
import { recommendRules } from '@/hooks/business/field-policy-rules';
import { roleDataScopeRecord } from '@/constants/business';
import { $t } from '@/locales';
import FieldPolicyRules from './field-policy-rules.vue';
import FieldPolicyPreview from './field-policy-preview.vue';

const props = defineProps<{
  roleId: string;
  identity: string;
  repository: FieldPolicyRepository;
  canMenu?: boolean;
  canEditRole?: boolean;
}>();
const emit = defineEmits<{ navigate: [target: 'menu' | 'edit'] }>();
const visible = defineModel<boolean>('visible', { default: false });
const dialog = useDialog();
const message = useMessage();
const model = useFieldPolicy({
  roleId: toRef(props, 'roleId'),
  identity: toRef(props, 'identity'),
  repository: props.repository
});
const {
  document,
  catalog,
  manifest,
  objectId,
  rules,
  reason,
  busy,
  dirty,
  editable,
  reloadRequired,
  unknownRequest,
  previewResult,
  manifestPreview,
  history,
  canPublish,
  canReady,
  canActivate
} = model;
const label = (key: string) => $t(`fieldPolicy.${key.replaceAll('.', '_')}`);
const roleTitle = computed(
  () => document.value?.role.roleName ?? $t('fieldPolicy.roleAnchorValue', { id: document.value?.role.roleId ?? '' })
);
const object = computed(() => catalog.value?.objects.find(o => o.objectId === objectId.value));
const objectOptions = computed(
  () => catalog.value?.objects.map(o => ({ value: o.objectId, label: label(o.objectId) })) ?? []
);
const scopeLabel = computed(() => {
  const scope = document.value?.role.dataScope as Api.SystemManage.Role['dataScope'] | undefined;
  return scope && scope in roleDataScopeRecord ? $t(roleDataScopeRecord[scope]) : label('fixed');
});
watch([visible, () => props.roleId, () => props.identity], ([open]) => {
  if (open) model.load();
  else model.reset();
});

function captureContext() {
  const identity = props.identity;
  const role = props.roleId;
  const value = document.value;
  return () => visible.value && props.identity === identity && props.roleId === role && document.value === value;
}
function confirmLeave(): Promise<boolean> {
  if (busy.value) return Promise.resolve(false);
  if (!dirty.value && !unknownRequest.value) return Promise.resolve(true);
  const isCurrent = captureContext();
  return new Promise(resolve => {
    dialog.warning({
      title: label('discardTitle'),
      content: label(unknownRequest.value ? 'unknownHint' : 'discardHint'),
      positiveText: $t('common.confirm'),
      negativeText: $t('common.cancel'),
      onPositiveClick: () => resolve(isCurrent()),
      onNegativeClick: () => resolve(false),
      onClose: () => resolve(false),
      onAfterLeave: () => resolve(false)
    });
  });
}
defineExpose({ confirmLeave });
async function leaving(done: () => void) {
  if (await confirmLeave()) done();
}
function close() {
  leaving(() => {
    visible.value = false;
  });
}
function selectObject(value: string) {
  if (value !== objectId.value)
    leaving(() => {
      model.load(value);
    });
}
function navigate(target: 'menu' | 'edit') {
  leaving(() => {
    visible.value = false;
    emit('navigate', target);
  });
}
function beforeUnload(event: BeforeUnloadEvent) {
  if (visible.value && (dirty.value || unknownRequest.value || busy.value)) {
    event.preventDefault();
    event.returnValue = '';
  }
}
onMounted(() => window.addEventListener('beforeunload', beforeUnload));
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));
async function save() {
  if (await model.publish()) message.success(label('candidateSaved'));
}
function confirmManifest() {
  const isCurrent = captureContext();
  const preview = manifestPreview.value;
  dialog.warning({
    title: label('sealManifest'),
    content: $t('fieldPolicy.tenantManifestHint', { count: manifestPreview.value?.items.length ?? 0 }),
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      if (!isCurrent() || manifestPreview.value !== preview) return;
      if (await model.buildManifest()) message.success(label('manifestSaved'));
    }
  });
}
function confirmFreeze() {
  const isCurrent = captureContext();
  dialog.warning({
    title: label('freeze'),
    content: label('freezeClosureHint'),
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      if (!isCurrent()) return;
      await model.freeze();
    }
  });
}
function confirmActivation(operation: 'ready' | 'activate') {
  const isCurrent = captureContext();
  const state = manifest.value;
  if (!state || !(operation === 'ready' ? canReady.value : canActivate.value)) return;
  dialog.warning({
    title: label(operation),
    content: $t('fieldPolicy.activationConfirm', {
      tenant: state.tenantId,
      count: state.items.length,
      digest: state.candidateManifestDigest
    }),
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      if (!isCurrent() || manifest.value !== state) return;
      const result = operation === 'ready' ? await model.readyManifest() : await model.activateManifest();
      if (result) message.success(label(operation === 'ready' ? 'activationReady' : 'activated'));
    }
  });
}
</script>

<template>
  <NDrawer
    :show="visible"
    width="min(880px, 100vw)"
    @update:show="
      open => {
        if (!open) close();
      }
    "
  >
    <NDrawerContent :title="label('title') + ' · ' + roleTitle" closable :native-scrollbar="false">
      <NSpin :show="busy">
        <NSpace align="center" justify="space-between" class="mb-16px">
          <NSpace>
            <NTag size="small" type="warning">{{ label('candidateStatus') }}</NTag>
            <NText>{{ label('version') }} {{ document?.bindingVersion ?? '—' }}</NText>
            <NTag v-if="dirty" size="small">{{ label('draft') }}</NTag>
          </NSpace>
          <NButton size="small" :disabled="busy || !!unknownRequest" @click="leaving(() => model.load())">
            {{ label('reload') }}
          </NButton>
        </NSpace>
        <NAlert v-if="reloadRequired" type="warning" class="mb-16px">{{ label('reloadRequired') }}</NAlert>
        <NAlert v-if="unknownRequest" type="warning" class="mb-16px">
          {{ label('unknownHint') }}
          <p class="break-all">{{ unknownRequest }}</p>
          <NButton :disabled="busy" @click="model.checkReceipt">{{ label('checkReceipt') }}</NButton>
        </NAlert>
        <template v-if="document && object">
          <NAlert v-if="!document.capabilities.edit" type="info" class="mb-16px">{{ label('readOnly') }}</NAlert>
          <NDescriptions :column="2" size="small" class="mb-12px">
            <NDescriptionsItem :label="$t('page.system.role.roleName')">
              {{ roleTitle }}
              <span v-if="document.role.roleCode">({{ document.role.roleCode }})</span>
            </NDescriptionsItem>
            <NDescriptionsItem :label="label('tenant')">{{ document.tenantId }}</NDescriptionsItem>
            <NDescriptionsItem :label="$t('page.system.role.dataScope.label')">
              {{ scopeLabel }}
              <NButton v-if="canEditRole" text size="small" type="primary" @click="navigate('edit')">
                {{ $t('common.edit') }}
              </NButton>
            </NDescriptionsItem>
          </NDescriptions>
          <p class="mb-16px">
            <NText depth="3">{{ label('menuRelationship') }}</NText>
            <NButton v-if="canMenu" text type="primary" size="small" @click="navigate('menu')">
              {{ $t('page.system.role.menuAuth') }}
            </NButton>
          </p>
          <NFormItem :label="label('object')">
            <NSelect
              :value="objectId"
              :options="objectOptions"
              :disabled="busy || !!unknownRequest"
              @update:value="selectObject"
            />
          </NFormItem>
          <NAlert type="info" class="mb-12px">{{ label('candidate') }}</NAlert>
          <FieldPolicyRules
            :object="object"
            :rules="rules"
            :disabled="!editable"
            :complete="!!catalog?.complete"
            @change="model.setRules"
          >
            <template #recommend>
              <NButton size="small" :disabled="!editable" @click="model.setRules(recommendRules(rules, object.fields))">
                {{ label('recommend') }}
              </NButton>
            </template>
            <template #preview>
              <NButton size="small" :disabled="busy || reloadRequired || !!unknownRequest" @click="model.preview">
                {{ label('preview') }}
              </NButton>
            </template>
          </FieldPolicyRules>
          <NButton text size="small" :disabled="!editable || !history.length" class="mt-8px" @click="model.undo">
            {{ label('undo') }}
          </NButton>
          <FieldPolicyPreview v-if="previewResult" :preview="previewResult" />
          <NFormItem :label="label('reason')" class="mt-16px">
            <NInput
              v-model:value="reason"
              type="textarea"
              :maxlength="500"
              :input-props="{ 'aria-label': label('reason') }"
              :disabled="
                busy ||
                reloadRequired ||
                !!unknownRequest ||
                !(document.capabilities.edit || document.capabilities.freeze)
              "
            />
          </NFormItem>
          <NButton type="primary" :disabled="!canPublish" @click="save">{{ label('saveCandidate') }}</NButton>
          <NDivider />
          <p class="mb-12px font-semibold">{{ label('tenantManifest') }}</p>
          <NAlert v-if="manifest?.activationBlockers.includes('QUALIFICATION_REQUIRED')" type="warning" class="mb-12px">
            {{ label('qualificationRequired') }}
          </NAlert>
          <p class="mb-12px break-all">
            {{ label('candidateDigest') }}: {{ manifest?.candidateManifestDigest ?? '—' }}
          </p>
          <NSpace>
            <NButton :disabled="!editable || dirty" @click="model.reviewManifest">
              {{ label('previewManifest') }}
            </NButton>
            <NButton :disabled="!editable || dirty || !manifestPreview || !reason.trim()" @click="confirmManifest">
              {{ label('sealManifest') }}
            </NButton>
            <NButton :disabled="!canReady" @click="confirmActivation('ready')">{{ label('ready') }}</NButton>
            <NButton :disabled="!canActivate" @click="confirmActivation('activate')">{{ label('activate') }}</NButton>
            <NButton
              v-if="manifest?.activeManifestDigest"
              type="warning"
              :disabled="busy || reloadRequired || !!unknownRequest || !document.capabilities.freeze || !reason.trim()"
              @click="confirmFreeze"
            >
              {{ label('freeze') }}
            </NButton>
          </NSpace>
          <p v-if="manifestPreview" class="mt-12px">
            {{ $t('fieldPolicy.tenantManifestHint', { count: manifestPreview.items.length }) }}
          </p>
        </template>
        <NEmpty v-else-if="!busy" :description="label('loadingFailed')" />
      </NSpin>
    </NDrawerContent>
  </NDrawer>
</template>
