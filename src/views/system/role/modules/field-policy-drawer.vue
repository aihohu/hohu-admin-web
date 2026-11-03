<script setup lang="ts">
import { toRef, watch } from 'vue';
import { useAuth } from '@/hooks/business/auth';
import { useUserFieldPolicy } from '@/hooks/business/user-field-policy';
import { $t } from '@/locales';
import FieldPolicyRules from './field-policy-rules.vue';
import FieldPolicyPreview from './field-policy-preview.vue';

const props = defineProps<{ roleId: string }>();
const visible = defineModel<boolean>('visible', { default: false });
const { hasSuperAdminAuth } = useAuth();
const {
  document,
  rules,
  reason,
  busy,
  reloadRequired,
  previewResult,
  canPublish,
  load,
  preview,
  publish,
  transition,
  reset
} = useUserFieldPolicy(toRef(props, 'roleId'));
watch([visible, () => props.roleId], ([open]) => {
  if (open) load();
  else reset();
});
async function save() {
  if (await publish()) window.$message?.success($t('fieldPolicy.saved'));
}
</script>

<template>
  <NDrawer v-model:show="visible" width="min(880px, 100vw)">
    <NDrawerContent :title="$t('fieldPolicy.title')" closable>
      <NSpin :show="busy">
        <NButton :disabled="busy" class="mb-4" @click="load">{{ $t('fieldPolicy.reload') }}</NButton>
        <NAlert v-if="reloadRequired" type="warning" class="mb-4">{{ $t('fieldPolicy.reloadRequired') }}</NAlert>
        <template v-if="document">
          <p class="mb-4">
            {{ $t('fieldPolicy.version') }}: {{ document.policy?.version ?? 0 }} /
            {{ $t(`fieldPolicy.${document.state.mode === 'ready' ? 'readyMode' : document.state.mode}`) }}
          </p>
          <NAlert type="info" class="mb-4">
            {{ $t(document.state.mode === 'enforcing' ? 'fieldPolicy.activeHint' : 'fieldPolicy.candidate') }}
          </NAlert>
          <FieldPolicyRules
            :fields="document.fields"
            :rules="rules"
            :disabled="busy || reloadRequired || !hasSuperAdminAuth('system:user:field-policy-edit')"
            @update="rules = $event"
          />
          <NButton :disabled="busy || reloadRequired" class="mt-4" @click="preview">
            {{ $t('fieldPolicy.preview') }}
          </NButton>
          <FieldPolicyPreview v-if="previewResult" :preview="previewResult" />
          <NFormItem :label="$t('fieldPolicy.reason')" class="mt-4">
            <NInput v-model:value="reason" type="textarea" :maxlength="500" :disabled="busy || reloadRequired" />
          </NFormItem>
          <NButton
            type="primary"
            :disabled="!canPublish || !hasSuperAdminAuth('system:user:field-policy-edit')"
            @click="save"
          >
            {{ $t('fieldPolicy.publish') }}
          </NButton>
          <NDivider />
          <NAlert
            v-if="document.state.activationBlockers.length && document.state.mode !== 'enforcing'"
            type="warning"
            class="mb-4"
          >
            {{ $t('fieldPolicy.blocked') }}
            <ul>
              <li v-for="blocker in document.state.activationBlockers" :key="blocker">
                {{ $t(`fieldPolicy.${blocker}`) }}
              </li>
            </ul>
          </NAlert>
          <NSpace>
            <NButton
              v-if="!document.state.everEnforced"
              :disabled="
                busy ||
                reloadRequired ||
                !reason.trim() ||
                !document.state.candidateManifestDigest ||
                !hasSuperAdminAuth('system:user:field-policy-edit')
              "
              @click="transition('ready')"
            >
              {{ $t('fieldPolicy.ready') }}
            </NButton>
            <NButton
              v-if="document.state.mode !== 'enforcing'"
              :disabled="
                busy ||
                reloadRequired ||
                !reason.trim() ||
                !document.state.canActivate ||
                !hasSuperAdminAuth('system:user:field-policy-activate')
              "
              @click="transition('activate')"
            >
              {{ $t('fieldPolicy.activate') }}
            </NButton>
            <NButton
              v-if="document.state.mode === 'enforcing'"
              type="warning"
              :disabled="
                busy || reloadRequired || !reason.trim() || !hasSuperAdminAuth('system:user:field-policy-activate')
              "
              @click="transition('freeze')"
            >
              {{ $t('fieldPolicy.freeze') }}
            </NButton>
          </NSpace>
        </template>
        <NEmpty v-else-if="!busy" :description="$t('fieldPolicy.loadingFailed')" />
      </NSpin>
    </NDrawerContent>
  </NDrawer>
</template>
