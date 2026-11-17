<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { enableStatusOptions } from '@/constants/business';
import { translateOptions } from '@/utils/common';
import { fetchCreateDataScopeDemo, fetchUpdateDataScopeDemo } from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';
import { editablePayload, fieldAllowed } from '@/hooks/business/ordinary-fields';

defineOptions({
  name: 'DataScopeDemoOperateDrawer'
});

interface Props {
  capabilities?: Api.SystemManage.OrdinaryCapabilities;
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.SystemManage.DataScopeDemo | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', { default: false });

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

type Model = Api.SystemManage.DataScopeDemoCreateParams;

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t('page.system.dataScopeDemo.addData'),
    edit: $t('page.system.dataScopeDemo.editData')
  };
  return titles[props.operateType];
});

const model = ref<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    title: '',
    content: '',
    status: '1'
  };
}

type RuleKey = Extract<keyof Model, 'title' | 'status'>;

const baseRules: Record<RuleKey, App.Global.FormRule> = {
  title: defaultRequiredRule,
  status: defaultRequiredRule
};

const loading = ref(false);

const touched = ref(new Set<string>());
const rules = computed(() =>
  Object.fromEntries(Object.entries(baseRules).filter(([key]) => props.operateType === 'add' || touched.value.has(key)))
);

function handleInitModel() {
  touched.value = new Set();
  model.value = createDefaultModel();
  if (props.operateType === 'edit' && props.rowData) {
    model.value = {
      title: props.rowData.title ?? '',
      content: props.rowData.content ?? '',
      status: props.rowData.status ?? '1'
    };
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
      res = await fetchUpdateDataScopeDemo(
        props.rowData.demoId,
        editablePayload(model.value, props.rowData, allowed.value, false, touched.value)
      );
    } else {
      res = await fetchCreateDataScopeDemo(model.value);
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
  <NDrawer v-model:show="visible" display-directive="show" :width="420">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem v-if="canEdit('title')" :label="$t('page.system.dataScopeDemo.title_field')" path="title">
          <NInput
            v-model:value="model.title"
            :placeholder="$t('page.system.dataScopeDemo.form.title')"
            @update:value="touched.add('title')"
          />
        </NFormItem>
        <NFormItem v-if="canEdit('status')" :label="$t('page.system.dataScopeDemo.status')" path="status">
          <NRadioGroup v-model:value="model.status" @update:value="touched.add('status')">
            <NRadio
              v-for="item in translateOptions(enableStatusOptions)"
              :key="item.value"
              :value="item.value"
              :label="item.label"
            />
          </NRadioGroup>
        </NFormItem>
        <NFormItem v-if="canEdit('content')" :label="$t('page.system.dataScopeDemo.content')" path="content">
          <NInput
            v-model:value="model.content"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 8 }"
            :placeholder="$t('page.system.dataScopeDemo.form.content')"
            @update:value="touched.add('content')"
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
