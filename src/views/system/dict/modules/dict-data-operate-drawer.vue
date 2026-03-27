<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { enableStatusOptions, yesNoOptions } from '@/constants/business';
import { fetchSaveDictData, fetchUpdateDictData } from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'DictDataOperateDrawer'
});

interface Props {
  /** type of operation */
  operateType: NaiveUI.TableOperateType;
  /** edit row data */
  rowData?: Api.SystemManage.DictData | null;
  /** dictionary type */
  dictType?: string;
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
    add: $t('page.system.dict.addDictData'),
    edit: $t('page.system.dict.editDictData')
  };
  return titles[props.operateType];
});

type Model = Pick<
  Api.SystemManage.DictData,
  'dictType' | 'dictLabel' | 'dictValue' | 'dictSort' | 'cssClass' | 'listClass' | 'isDefault' | 'status'
>;

const model = ref(createDefaultModel());

function createDefaultModel(): Model {
  return {
    dictType: props.dictType || '',
    dictLabel: '',
    dictValue: '',
    dictSort: 0,
    cssClass: '',
    listClass: '',
    isDefault: 'N',
    status: '1'
  };
}

type RuleKey = Exclude<keyof Model, 'dictSort' | 'cssClass' | 'listClass' | 'isDefault'>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  dictType: defaultRequiredRule,
  dictLabel: defaultRequiredRule,
  dictValue: defaultRequiredRule,
  status: defaultRequiredRule
};

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model.value, jsonClone(props.rowData));
  } else if (props.dictType) {
    model.value.dictType = props.dictType;
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  let res;
  if (props.operateType === 'edit' && props.rowData) {
    res = await fetchUpdateDictData(props.rowData.dictCode, model.value);
  } else {
    res = await fetchSaveDictData(model.value);
  }
  const { error, response } = res;
  if (!error) {
    const successMsg =
      response?.data?.msg || $t(props.operateType === 'edit' ? 'common.updateSuccess' : 'common.saveSuccess');
    window.$message?.success(successMsg);
    closeDrawer();
    emit('submitted');
  } else {
    window.$message?.error(response.data.msg);
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
  <NDrawer v-model:show="visible" display-directive="show" :width="360">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem :label="$t('page.system.dict.dictTypeCode')" path="dictType">
          <NInput
            v-model:value="model.dictType"
            :placeholder="$t('page.system.dict.dataForm.dictType')"
            :disabled="operateType === 'edit'"
          />
        </NFormItem>
        <NFormItem :label="$t('page.system.dict.dictLabel')" path="dictLabel">
          <NInput v-model:value="model.dictLabel" :placeholder="$t('page.system.dict.dataForm.dictLabel')" />
        </NFormItem>
        <NFormItem :label="$t('page.system.dict.dictValue')" path="dictValue">
          <NInput v-model:value="model.dictValue" :placeholder="$t('page.system.dict.dataForm.dictValue')" />
        </NFormItem>
        <NFormItem :label="$t('page.system.dict.dictSort')" path="dictSort">
          <NInputNumber v-model:value="model.dictSort" :min="0" class="w-full" />
        </NFormItem>
        <!--
 <NFormItem :label="$t('page.system.dict.cssClass')" path="cssClass">
          <NInput v-model:value="model.cssClass" :placeholder="$t('page.system.dict.dataForm.cssClass')" />
        </NFormItem>
        <NFormItem :label="$t('page.system.dict.listClass')" path="listClass">
          <NInput v-model:value="model.listClass" :placeholder="$t('page.system.dict.dataForm.listClass')" />
        </NFormItem> 
-->
        <NFormItem :label="$t('page.system.dict.isDefault')" path="isDefault">
          <NRadioGroup v-model:value="model.isDefault">
            <NRadio v-for="item in yesNoOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
          </NRadioGroup>
        </NFormItem>
        <NFormItem :label="$t('page.system.dict.status')" path="status">
          <NRadioGroup v-model:value="model.status">
            <NRadio v-for="item in enableStatusOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
          </NRadioGroup>
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
