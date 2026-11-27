<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { enableStatusOptions } from '@/constants/business';
import { fetchSaveDictType, fetchUpdateDictType } from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';
import { editablePayload, fieldAllowed } from '@/hooks/business/ordinary-fields';

defineOptions({
  name: 'DictTypeOperateDrawer'
});

interface Props {
  capabilities?: Api.SystemManage.OrdinaryCapabilities;
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

type Model = Api.SystemManage.DictTypeCreateParams;

const model = ref(createDefaultModel());

const loading = ref(false);

function createDefaultModel(): Model {
  return {
    dictName: '',
    dictType: '',
    status: '1',
    remark: ''
  };
}

type RuleKey = Exclude<keyof Model, 'remark'>;

const baseRules: Record<RuleKey, App.Global.FormRule> = {
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

const touched = ref(new Set<string>());
const rules = computed(() =>
  Object.fromEntries(Object.entries(baseRules).filter(([key]) => props.operateType === 'add' || touched.value.has(key)))
);

function handleInitModel() {
  touched.value = new Set();
  model.value = createDefaultModel();

  if (props.operateType === 'edit' && props.rowData) {
    for (const key of Object.keys(model.value) as (keyof Model)[]) {
      if (Object.hasOwn(props.rowData, key)) Object.assign(model.value, { [key]: props.rowData[key] });
    }
  }
}

const allowed = computed(() =>
  props.operateType === 'edit' ? props.rowData?.fieldPolicy?.update : props.capabilities?.create
);
function canEdit(key: keyof Model) {
  return fieldAllowed(allowed.value, key);
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  if (loading.value || (props.operateType === 'add' && !props.capabilities?.canCreate)) return;
  await validate();
  loading.value = true;
  try {
    let res;
    if (props.operateType === 'edit' && props.rowData) {
      res = await fetchUpdateDictType(
        props.rowData.dictTypeId,
        editablePayload(model.value, props.rowData, allowed.value, false, touched.value)
      );
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
    }
  } finally {
    loading.value = false;
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
        <NFormItem v-if="canEdit('dictName')" :label="$t('page.system.dict.dictTypeName')" path="dictName">
          <NInput
            v-model:value="model.dictName"
            :placeholder="$t('page.system.dict.typeForm.dictTypeName')"
            @update:value="touched.add('dictName')"
          />
        </NFormItem>
        <NFormItem v-if="canEdit('dictType')" :label="$t('page.system.dict.dictTypeCode')" path="dictType">
          <NInput
            v-model:value="model.dictType"
            :placeholder="$t('page.system.dict.typeForm.dictTypeCode')"
            @update:value="touched.add('dictType')"
          />
        </NFormItem>
        <NFormItem v-if="canEdit('status')" :label="$t('page.system.dict.status')" path="status">
          <NRadioGroup v-model:value="model.status" @update:value="touched.add('status')">
            <NRadio v-for="item in enableStatusOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
          </NRadioGroup>
        </NFormItem>
        <NFormItem v-if="canEdit('remark')" :label="$t('page.system.dict.remark')" path="remark">
          <NInput
            v-model:value="model.remark"
            type="textarea"
            :placeholder="$t('page.system.dict.typeForm.remark')"
            :autosize="{
              minRows: 3,
              maxRows: 5
            }"
            @update:value="touched.add('remark')"
          />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="loading" :disabled="!allowed?.length" @click="handleSubmit">
            {{ $t('common.confirm') }}
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
