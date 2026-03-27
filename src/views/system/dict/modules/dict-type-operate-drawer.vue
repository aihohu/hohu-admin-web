<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { enableStatusOptions } from '@/constants/business';
import { fetchSaveDictType, fetchUpdateDictType } from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'DictTypeOperateDrawer'
});

interface Props {
  /** type of operation */
  operateType: NaiveUI.TableOperateType;
  /** edit row data */
  rowData?: Api.SystemManage.DictType | null;
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
    add: $t('page.system.dict.addDictType'),
    edit: $t('page.system.dict.editDictType')
  };
  return titles[props.operateType];
});

type Model = Pick<Api.SystemManage.DictType, 'dictName' | 'dictType' | 'status' | 'remark'>;

const model = ref(createDefaultModel());

function createDefaultModel(): Model {
  return {
    dictName: '',
    dictType: '',
    status: '1',
    remark: ''
  };
}

type RuleKey = Exclude<keyof Model, 'remark'>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  dictName: {
    required: true,
    min: 2,
    message: () => $t('page.system.dict.validation.dictNameMinLength'),
    trigger: ['blur', 'input']
  },
  dictType: {
    required: true,
    min: 2,
    message: () => $t('page.system.dict.validation.dictTypeMinLength'),
    trigger: ['blur', 'input']
  },
  status: defaultRequiredRule
};

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model.value, jsonClone(props.rowData));
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  let res;
  if (props.operateType === 'edit' && props.rowData) {
    res = await fetchUpdateDictType(props.rowData.dictTypeId, model.value);
  } else {
    res = await fetchSaveDictType(model.value);
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
        <NFormItem :label="$t('page.system.dict.dictTypeName')" path="dictName">
          <NInput v-model:value="model.dictName" :placeholder="$t('page.system.dict.typeForm.dictTypeName')" />
        </NFormItem>
        <NFormItem :label="$t('page.system.dict.dictTypeCode')" path="dictType">
          <NInput
            v-model:value="model.dictType"
            :placeholder="$t('page.system.dict.typeForm.dictTypeCode')"
            :disabled="operateType === 'edit'"
          />
        </NFormItem>
        <NFormItem :label="$t('page.system.dict.status')" path="status">
          <NRadioGroup v-model:value="model.status">
            <NRadio v-for="item in enableStatusOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
          </NRadioGroup>
        </NFormItem>
        <NFormItem :label="$t('page.system.dict.remark')" path="remark">
          <NInput
            v-model:value="model.remark"
            type="textarea"
            :placeholder="$t('page.system.dict.typeForm.remark')"
            :autosize="{
              minRows: 3,
              maxRows: 5
            }"
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
