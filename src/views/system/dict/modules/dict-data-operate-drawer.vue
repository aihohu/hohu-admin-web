<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { enableStatusOptions, yesNoOptions } from '@/constants/business';
import { translateOptions } from '@/utils/common';
import { $t } from '@/locales';
import { fetchSaveDictData, fetchUpdateDictData } from '@/service/api';

defineOptions({
  name: 'DictDataOperateDrawer'
});

interface Props {
  /** @type of operation */
  operateType: NaiveUI.TableOperateType;
  /** @edit row data */
  rowData?: Api.SystemManage.DictData | null;
  /** @dictionary type */
  dictType?: string;
}

interface Emits {
  (e: 'submitted'): void;
}

const props = withDefaults(defineProps<Props>(), {
  rowData: null,
  dictType: ''
});

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', { default: false });

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t('page.system.dict.addDictData'),
    edit: $t('page.system.dict.editDictData')
  };
  return titles[props.operateType];
});

const model = reactive<Api.SystemManage.DictDataCreateParams>({
  dictType: props.dictType,
  dictLabel: '',
  dictValue: '',
  dictSort: 0,
  cssClass: null,
  listClass: null,
  isDefault: null,
  status: '1'
});

const rules = computed(() => ({
  dictType: defaultRequiredRule,
  dictLabel: defaultRequiredRule,
  dictValue: defaultRequiredRule
}));

const statusOptions = translateOptions(enableStatusOptions);
const defaultOptions = translateOptions(yesNoOptions);

function handleUpdateModelWhenEdit() {
  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model, {
      dictType: props.rowData.dictType,
      dictLabel: props.rowData.dictLabel,
      dictValue: props.rowData.dictValue,
      dictSort: props.rowData.dictSort,
      cssClass: props.rowData.cssClass,
      listClass: props.rowData.listClass,
      isDefault: props.rowData.isDefault,
      status: props.rowData.status
    });
  } else {
    model.dictType = props.dictType;
  }
}

async function handleSubmit() {
  await validate();
  const { error } =
    props.operateType === 'add'
      ? await fetchSaveDictData(model)
      : await fetchUpdateDictData(props.rowData!.dictDataId, model);

  if (!error) {
    window.$message?.success(props.operateType === 'add' ? $t('common.addSuccess') : $t('common.modifySuccess'));
    emit('submitted');
    visible.value = false;
  }
}

watch(visible, val => {
  if (val) {
    if (props.operateType === 'add') {
      // 新增模式，重置表单
      Object.assign(model, {
        dictType: props.dictType,
        dictLabel: '',
        dictValue: '',
        dictSort: 0,
        cssClass: null,
        listClass: null,
        isDefault: null,
        status: '1'
      });
    } else {
      // 编辑模式，回显数据
      handleUpdateModelWhenEdit();
    }
    restoreValidation();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="360">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" :label-width="100">
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

        <NFormItem :label="$t('page.system.dict.cssClass')" path="cssClass">
          <NInput v-model:value="model.cssClass" :placeholder="$t('page.system.dict.dataForm.cssClass')" />
        </NFormItem>

        <NFormItem :label="$t('page.system.dict.listClass')" path="listClass">
          <NInput v-model:value="model.listClass" :placeholder="$t('page.system.dict.dataForm.listClass')" />
        </NFormItem>

        <NFormItem :label="$t('page.system.dict.isDefault')" path="isDefault">
          <NSelect
            v-model:value="model.isDefault"
            :placeholder="$t('page.system.dict.dataForm.isDefault')"
            :options="defaultOptions"
            clearable
          />
        </NFormItem>

        <NFormItem :label="$t('page.system.user.userStatus')" path="status">
          <NSelect
            v-model:value="model.status"
            :placeholder="$t('page.system.dict.dataForm.status')"
            :options="statusOptions"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace :size="12">
          <NButton @click="visible = false">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
