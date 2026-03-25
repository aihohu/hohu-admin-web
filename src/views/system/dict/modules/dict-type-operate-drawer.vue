<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { enableStatusOptions } from '@/constants/business';
import { translateOptions } from '@/utils/common';
import { $t } from '@/locales';
import { fetchSaveDictType, fetchUpdateDictType } from '@/service/api';

defineOptions({
  name: 'DictTypeOperateDrawer'
});

interface Props {
  /** @type of operation */
  operateType: NaiveUI.TableOperateType;
  /** @edit row data */
  rowData?: Api.SystemManage.DictType | null;
}

interface Emits {
  (e: 'submitted'): void;
}

const props = withDefaults(defineProps<Props>(), {
  rowData: null
});

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', { default: false });

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t('page.system.dict.addDictType'),
    edit: $t('page.system.dict.editDictType')
  };
  return titles[props.operateType];
});

const model = reactive<Api.SystemManage.DictTypeCreateParams>({
  dictName: '',
  dictType: '',
  status: '1',
  remark: null
});

const rules = computed(() => ({
  dictName: defaultRequiredRule,
  dictType: defaultRequiredRule,
  status: defaultRequiredRule
}));

const statusOptions = translateOptions(enableStatusOptions);

function handleUpdateModelWhenEdit() {
  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model, {
      dictName: props.rowData.dictName,
      dictType: props.rowData.dictType,
      status: props.rowData.status,
      remark: props.rowData.remark
    });
  }
}

async function handleSubmit() {
  await validate();
  const { error } =
    props.operateType === 'add'
      ? await fetchSaveDictType(model)
      : await fetchUpdateDictType(props.rowData!.dictTypeId, model);

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
        dictName: '',
        dictType: '',
        status: '1',
        remark: null
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

        <NFormItem :label="$t('page.system.user.userStatus')" path="status">
          <NSelect
            v-model:value="model.status"
            :placeholder="$t('page.system.dict.typeForm.status')"
            :options="statusOptions"
          />
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
        <NSpace :size="12">
          <NButton @click="visible = false">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
