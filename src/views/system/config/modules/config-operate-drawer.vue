<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import { enableStatusOptions } from '@/constants/business';
import { fetchConfigForm, fetchSaveConfig, fetchUpdateConfig } from '@/service/api';
import { useControlForm } from '@/hooks/business/control-form';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { getServerErrorMessage, useServerFieldErrors } from '@/hooks/common/server-field-errors';
import { $t } from '@/locales';
import ConfigPublication from './config-publication.vue';

defineOptions({
  name: 'ConfigOperateDrawer'
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.Config | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { applyServerFieldErrors, clearServerFieldErrors, fieldProps } = useServerFieldErrors();
const { defaultRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t('page.system.config.addConfig'),
    edit: $t('page.system.config.editConfig')
  };
  return titles[props.operateType];
});

const configTypeOptions = computed(() => [
  { label: $t('page.system.config.typeText'), value: 'text' },
  { label: $t('page.system.config.typeRichtext'), value: 'richtext' }
]);

type Model = Api.SystemManage.ConfigCreateParams;
const form = useControlForm<Model>({
  visible,
  mode: () => (props.operateType === 'edit' ? 'update' : 'create'),
  target: () => props.rowData?.configId,
  defaults: createDefaultModel,
  load: fetchConfigForm
});
const { model, ready, editable, present } = form;
const loading = shallowRef(false);
const publishing = shallowRef(false);
const dirty = computed(() => Object.keys(form.payload()).length > 0);

function createDefaultModel(): Model {
  return {
    configName: '',
    configKey: '',
    configValue: '',
    configType: 'text',
    configGroup: '',
    status: '1',
    remark: null
  };
}

type RuleKey = Extract<keyof Model, 'configName' | 'configKey' | 'configValue' | 'configGroup' | 'status'>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  configName: defaultRequiredRule,
  configKey: defaultRequiredRule,
  configValue: defaultRequiredRule,
  configGroup: defaultRequiredRule,
  status: defaultRequiredRule
};

const activeRules = computed(() =>
  Object.fromEntries(
    Object.entries(rules).filter(([key]) =>
      props.operateType === 'add' ? editable(key) : Object.hasOwn(form.payload(), key)
    )
  )
);

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  if (!ready.value || loading.value || publishing.value || !dirty.value) return;
  const token = form.session();
  loading.value = true;
  try {
    try {
      await validate();
    } catch {
      return;
    }
    if (!form.current(token)) return;
    const payload = form.payload();
    if (!Object.keys(payload).length) return;
    let res;
    if (props.operateType === 'edit' && props.rowData) {
      res = await fetchUpdateConfig(props.rowData.configId, { ...payload, formReceipt: form.receipt.value });
    } else {
      res = await fetchSaveConfig({ ...(payload as Model), formReceipt: form.receipt.value });
    }
    if (!form.current(token)) return;
    const { error, response } = res;
    if (!error) {
      const successMsg =
        response?.data?.msg || $t(props.operateType === 'edit' ? 'common.updateSuccess' : 'common.saveSuccess');
      window.$message?.success(successMsg);
      closeDrawer();
      emit('submitted');
    } else {
      form.invalidate();
      if (!applyServerFieldErrors(error))
        window.$message?.error(getServerErrorMessage(error) || $t('common.modifyFailed'));
    }
  } finally {
    if (form.current(token)) loading.value = false;
  }
}

watch(model, () => clearServerFieldErrors(), { deep: true });

watch([visible, () => props.rowData?.configId, () => props.operateType], () => {
  loading.value = false;
  publishing.value = false;
  if (visible.value) {
    restoreValidation();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="460" :style="{ maxWidth: '100vw' }">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NSpin :show="form.loading.value">
        <NAlert v-if="!form.loading.value && !ready" type="error" class="mb-16px">
          {{ $t('fieldPolicy.loadFailed') }}
          <NButton text @click="form.reload">{{ $t('common.refresh') }}</NButton>
        </NAlert>
        <NForm ref="formRef" :model="model" :rules="activeRules" :disabled="loading || publishing || !ready">
          <NFormItem
            v-if="present('configName')"
            v-bind="fieldProps('configName')"
            :label="$t('page.system.config.configName')"
            path="configName"
          >
            <NInput
              v-model:value="model.configName"
              :disabled="!editable('configName')"
              :placeholder="$t('page.system.config.form.configName')"
            />
          </NFormItem>
          <NFormItem
            v-if="present('configKey')"
            v-bind="fieldProps('configKey')"
            :label="$t('page.system.config.configKey')"
            path="configKey"
          >
            <NInput
              v-model:value="model.configKey"
              :disabled="!editable('configKey')"
              :placeholder="$t('page.system.config.form.configKey')"
            />
          </NFormItem>
          <NFormItem v-if="present('configType')" :label="$t('page.system.config.configType')" path="configType">
            <NSelect
              v-model:value="model.configType"
              :disabled="!editable('configType')"
              :options="configTypeOptions"
            />
          </NFormItem>
          <NFormItem v-if="present('configGroup')" :label="$t('page.system.config.configGroup')" path="configGroup">
            <NInput
              v-model:value="model.configGroup"
              :disabled="!editable('configGroup')"
              :placeholder="$t('page.system.config.form.configGroup')"
            />
          </NFormItem>
          <NFormItem
            v-if="present('configValue')"
            v-bind="fieldProps('configValue')"
            :label="$t('page.system.config.configValue')"
            path="configValue"
          >
            <div class="w-full">
              <NInput
                v-if="model.configType !== 'richtext'"
                v-model:value="model.configValue"
                :disabled="!editable('configValue')"
                :placeholder="$t('page.system.config.form.configValue')"
              />
              <NInput
                v-else
                v-model:value="model.configValue"
                :disabled="!editable('configValue')"
                type="textarea"
                :rows="10"
                :placeholder="$t('page.system.config.form.configValue')"
              />
              <div v-if="form.replacement('configValue')" class="text-12px opacity-60">
                {{ $t('fieldPolicy.replacementHint') }}
              </div>
            </div>
          </NFormItem>
          <NFormItem v-if="present('status')" :label="$t('page.system.config.configStatus')" path="status">
            <NRadioGroup v-model:value="model.status" :disabled="!editable('status')">
              <NRadio
                v-for="item in enableStatusOptions"
                :key="item.value"
                :value="item.value"
                :label="$t(item.label)"
              />
            </NRadioGroup>
          </NFormItem>
          <NFormItem v-if="present('remark')" :label="$t('page.system.config.remark')" path="remark">
            <NInput
              v-model:value="model.remark"
              :disabled="!editable('remark')"
              type="textarea"
              :rows="3"
              :placeholder="$t('page.system.config.form.remark')"
            />
          </NFormItem>
        </NForm>
        <NEmpty
          v-if="ready && !Object.keys(model).length && !form.policy.value?.update.length"
          :description="$t('fieldPolicy.noVisibleFields')"
        />
        <ConfigPublication
          v-if="operateType === 'edit' && rowData && ready"
          :key="form.session()"
          :config-id="rowData.configId"
          :publication-revision="form.context.value?.publicationRevision"
          :revocation-revision="form.context.value?.revocationRevision"
          :disabled="loading || dirty"
          @busy="publishing = $event"
          @reload="form.reload"
          @changed="
            form.reload();
            emit('submitted');
          "
        />
      </NSpin>
      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
          <NButton
            v-if="ready && (form.policy.value?.update.length || form.policy.value?.canCreate)"
            type="primary"
            :disabled="!dirty || publishing"
            :loading="loading"
            @click="handleSubmit"
          >
            {{ $t('common.confirm') }}
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
