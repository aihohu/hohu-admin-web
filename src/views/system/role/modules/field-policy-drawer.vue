<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, toRef, watch } from 'vue';
import {
  NAlert,
  NButton,
  NDescriptions,
  NDescriptionsItem,
  NDivider,
  NCard,
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
import { recommendRules, ruleKey } from '@/hooks/business/field-policy-rules';
import { roleDataScopeRecord } from '@/constants/business';
import { $t } from '@/locales';
import UserListPermissions from './user-list-permissions.vue';
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
const canGiveReason = computed(() => {
  const caps = document.value?.capabilities;
  return !busy.value && !reloadRequired.value && !unknownRequest.value && (caps?.edit || caps?.freeze);
});
const roleTitle = computed(
  () =>
    document.value?.role.roleName ??
    $t('fieldPolicy.roleAnchorValue', {
      id: document.value?.role.roleId ?? ''
    })
);
const object = computed(() => catalog.value?.objects.find(o => o.objectId === objectId.value));
const advancedObject = computed(() => {
  const current = object.value;
  if (!current || !model.listPolicy.value) return current;
  const owned = new Set(
    document.value?.listAccesses
      ?.filter(rule => {
        const purpose = rule.access.purpose.split('.')[1] as keyof Api.FieldManagement.FieldSelections;
        return model.listPolicy.value?.[purpose] !== undefined;
      })
      .map(ruleKey)
  );
  return {
    ...current,
    fields: current.fields
      .map(field => ({
        ...field,
        choices: field.choices.filter(choice => !owned.has(ruleKey({ fieldId: field.fieldId, access: choice.access })))
      }))
      .filter(field => field.choices.length)
  };
});
const objectOptions = computed(
  () =>
    catalog.value?.objects.map(o => ({
      value: o.objectId,
      label: label(o.objectId)
    })) ?? []
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
  if (!busy.value && !unknownRequest.value) emit('navigate', target);
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
    content: $t('fieldPolicy.tenantManifestHint', {
      count: manifestPreview.value?.items.length ?? 0
    }),
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
  <NCard
    v-if="visible"
    data-testid="role-permissions"
    :title="label('rolePermissions') + ' · ' + roleTitle"
    size="small"
    class="overflow-auto"
  >
    <template #header-extra>
      <NButton size="small" @click="close">{{ label('returnToRoles') }}</NButton>
    </template>
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
          <NButton v-if="canMenu && !document.listFields" text type="primary" size="small" @click="navigate('menu')">
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
        <UserListPermissions
          v-if="document.listFields"
          :document="document"
          :policy="model.listPolicy.value"
          :disabled="!editable"
          :can-menu="!!canMenu"
          @change="model.setListPolicy"
          @menu="navigate('menu')"
        />
        <NButton
          v-if="model.listPolicy.value"
          size="small"
          :disabled="busy || reloadRequired || !!unknownRequest"
          @click="model.preview"
        >
          {{ label('preview') }}
        </NButton>
        <component :is="model.listPolicy.value ? 'details' : 'section'" v-if="advancedObject" class="my-3">
          <summary v-if="model.listPolicy.value">{{ label('otherUses') }}</summary>
          <FieldPolicyRules
            :object="advancedObject"
            :rules="rules"
            :disabled="!editable"
            :complete="!!catalog?.complete"
            @change="model.setRules"
          >
            <template #recommend>
              <NButton
                size="small"
                :disabled="!editable"
                @click="model.setRules(recommendRules(rules, advancedObject!.fields))"
              >
                {{ label('recommend') }}
              </NButton>
            </template>
            <template v-if="!model.listPolicy.value" #preview>
              <NButton size="small" :disabled="busy || reloadRequired || !!unknownRequest" @click="model.preview">
                {{ label('preview') }}
              </NButton>
            </template>
          </FieldPolicyRules>
          <NButton text size="small" :disabled="!editable || !history.length" class="mt-8px" @click="model.undo">
            {{ label('undo') }}
          </NButton>
        </component>
        <FieldPolicyPreview v-if="previewResult" :preview="previewResult" />
        <NFormItem :label="label('reason')" class="mt-16px">
          <NInput
            v-model:value="reason"
            type="textarea"
            :maxlength="500"
            :input-props="{ 'aria-label': label('reason') }"
            :disabled="!canGiveReason"
          />
        </NFormItem>
        <NButton type="primary" :disabled="!canPublish" @click="save">{{ label('saveCandidate') }}</NButton>
        <NDivider />
        <p class="mb-12px font-semibold">{{ label('tenantManifest') }}</p>
        <NAlert v-if="manifest?.activationBlockers.includes('QUALIFICATION_REQUIRED')" type="warning" class="mb-12px">
          {{ label('qualificationRequired') }}
        </NAlert>
        <p class="mb-12px break-all">
          {{ label('candidateDigest') }}:
          {{ manifest?.candidateManifestDigest ?? '—' }}
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
          {{
            $t('fieldPolicy.tenantManifestHint', {
              count: manifestPreview.items.length
            })
          }}
        </p>
      </template>
      <NEmpty v-else-if="!busy" :description="label('loadingFailed')" />
    </NSpin>
  </NCard>
</template>
