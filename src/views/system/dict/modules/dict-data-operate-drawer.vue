<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { enableStatusOptions, yesNoOptions } from '@/constants/business';
import { fetchSaveDictData, fetchUpdateDictData } from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';
import { editablePayload, fieldAllowed } from '@/hooks/business/ordinary-fields';

defineOptions({
  name: 'DictDataOperateDrawer'
});

interface Props {
  capabilities?: Api.SystemManage.OrdinaryCapabilities;
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

type Model = Api.SystemManage.DictDataCreateParams;

const model = ref(createDefaultModel());

const loading = ref(false);

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

const baseRules: Record<RuleKey, App.Global.FormRule> = {
  dictType: defaultRequiredRule,
  dictLabel: defaultRequiredRule,
  dictValue: defaultRequiredRule,
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
  } else if (props.dictType) {
    model.value.dictType = props.dictType;
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
      res = await fetchUpdateDictData(
        props.rowData.dictCode,
        editablePayload(model.value, props.rowData, allowed.value, false, touched.value)
      );
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
        <NFormItem v-if="canEdit('dictType')" :label="$t('page.system.dict.dictTypeCode')" path="dictType">
          <NInput
            v-model:value="model.dictType"
            :placeholder="$t('page.system.dict.dataForm.dictType')"
            @update:value="touched.add('dictType')"
          />
        </NFormItem>
        <NFormItem v-if="canEdit('dictLabel')" :label="$t('page.system.dict.dictLabel')" path="dictLabel">
          <NInput
            v-model:value="model.dictLabel"
            :placeholder="$t('page.system.dict.dataForm.dictLabel')"
            @update:value="touched.add('dictLabel')"
          />
        </NFormItem>
        <NFormItem v-if="canEdit('dictValue')" :label="$t('page.system.dict.dictValue')" path="dictValue">
          <NInput
            v-model:value="model.dictValue"
            :placeholder="$t('page.system.dict.dataForm.dictValue')"
            @update:value="touched.add('dictValue')"
          />
        </NFormItem>
        <NFormItem v-if="canEdit('dictSort')" :label="$t('page.system.dict.dictSort')" path="dictSort">
          <NInputNumber
            v-model:value="model.dictSort"
            :min="0"
            class="w-full"
            @update:value="touched.add('dictSort')"
          />
        </NFormItem>
        <NFormItem v-if="canEdit('cssClass')" :label="$t('page.system.dict.cssClass')" path="cssClass">
          <NInput
            v-model:value="model.cssClass"
            :placeholder="$t('page.system.dict.dataForm.cssClass')"
            @update:value="touched.add('cssClass')"
          />
        </NFormItem>
        <NFormItem v-if="canEdit('listClass')" :label="$t('page.system.dict.listClass')" path="listClass">
          <NInput
            v-model:value="model.listClass"
            :placeholder="$t('page.system.dict.dataForm.listClass')"
            @update:value="touched.add('listClass')"
          />
        </NFormItem>
        <NFormItem v-if="canEdit('isDefault')" :label="$t('page.system.dict.isDefault')" path="isDefault">
          <NRadioGroup v-model:value="model.isDefault" @update:value="touched.add('isDefault')">
            <NRadio v-for="item in yesNoOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
          </NRadioGroup>
        </NFormItem>
        <NFormItem v-if="canEdit('status')" :label="$t('page.system.dict.status')" path="status">
          <NRadioGroup v-model:value="model.status" @update:value="touched.add('status')">
            <NRadio v-for="item in enableStatusOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
          </NRadioGroup>
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
