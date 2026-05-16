<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { enableStatusOptions } from '@/constants/business';
import { fetchSaveConfig, fetchUpdateConfig } from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

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
  { label: $t('page.system.config.typeRichtext'), value: 'richtext' },
  { label: $t('page.system.config.typeFile'), value: 'file' }
]);

type Model = Pick<
  Api.SystemManage.Config,
  'configName' | 'configKey' | 'configValue' | 'configType' | 'configGroup' | 'status' | 'isPublic' | 'remark'
>;

const model = ref(createDefaultModel());

function createDefaultModel(): Model {
  return {
    configName: '',
    configKey: '',
    configValue: '',
    configType: 'text',
    configGroup: '',
    status: '1',
    isPublic: false,
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

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === 'edit' && props.rowData) {
    const cloned = jsonClone(props.rowData);
    Object.assign(model.value, cloned);
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  let res;
  if (props.operateType === 'edit' && props.rowData) {
    res = await fetchUpdateConfig(props.rowData.configId, model.value);
  } else {
    res = await fetchSaveConfig(model.value);
  }
  const { error, response } = res;
  if (!error) {
    const successMsg =
      response?.data?.msg || $t(props.operateType === 'edit' ? 'common.updateSuccess' : 'common.saveSuccess');
    window.$message?.success(successMsg);
    closeDrawer();
    emit('submitted');
  }
}

watch(visible, () => {
  if (visible.value) {
    handleInitModel();
    restoreValidation();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="460">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem :label="$t('page.system.config.configName')" path="configName">
          <NInput v-model:value="model.configName" :placeholder="$t('page.system.config.form.configName')" />
        </NFormItem>
        <NFormItem :label="$t('page.system.config.configKey')" path="configKey">
          <NInput v-model:value="model.configKey" :placeholder="$t('page.system.config.form.configKey')" />
        </NFormItem>
        <NFormItem :label="$t('page.system.config.configType')" path="configType">
          <NSelect v-model:value="model.configType" :options="configTypeOptions" />
        </NFormItem>
        <NFormItem :label="$t('page.system.config.configGroup')" path="configGroup">
          <NInput v-model:value="model.configGroup" :placeholder="$t('page.system.config.form.configGroup')" />
        </NFormItem>
        <NFormItem :label="$t('page.system.config.configValue')" path="configValue">
          <NInput
            v-if="model.configType === 'text'"
            v-model:value="model.configValue"
            :placeholder="$t('page.system.config.form.configValue')"
          />
          <NInput
            v-else-if="model.configType === 'file'"
            v-model:value="model.configValue"
            :placeholder="$t('page.system.config.form.configValue')"
          />
          <NInput
            v-else
            v-model:value="model.configValue"
            type="textarea"
            :rows="10"
            :placeholder="$t('page.system.config.form.configValue')"
          />
        </NFormItem>
        <NFormItem :label="$t('page.system.config.configStatus')" path="status">
          <NRadioGroup v-model:value="model.status">
            <NRadio v-for="item in enableStatusOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
          </NRadioGroup>
        </NFormItem>
        <NFormItem :label="$t('page.system.config.isPublic')">
          <NSwitch v-model:value="model.isPublic" />
        </NFormItem>
        <NFormItem :label="$t('page.system.config.remark')" path="remark">
          <NInput
            v-model:value="model.remark"
            type="textarea"
            :rows="3"
            :placeholder="$t('page.system.config.form.remark')"
          />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
