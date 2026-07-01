<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { enableStatusOptions } from '@/constants/business';
import { translateOptions } from '@/utils/common';
import { fetchCreateDataScopeDemo, fetchUpdateDataScopeDemo } from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'DataScopeDemoOperateDrawer'
});

interface Props {
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

type Model = Pick<Api.SystemManage.DataScopeDemo, 'title' | 'content' | 'status'>;

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

const rules: Record<RuleKey, App.Global.FormRule> = {
  title: defaultRequiredRule,
  status: defaultRequiredRule
};

const loading = ref(false);

function handleInitModel() {
  model.value = createDefaultModel();
  if (props.operateType === 'edit' && props.rowData) {
    model.value = {
      title: props.rowData.title,
      content: props.rowData.content ?? '',
      status: props.rowData.status
    };
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  loading.value = true;
  try {
    let res;
    if (props.operateType === 'edit' && props.rowData) {
      res = await fetchUpdateDataScopeDemo(props.rowData.demoId, model.value);
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
        <NFormItem :label="$t('page.system.dataScopeDemo.title_field')" path="title">
          <NInput v-model:value="model.title" :placeholder="$t('page.system.dataScopeDemo.form.title')" />
        </NFormItem>
        <NFormItem :label="$t('page.system.dataScopeDemo.status')" path="status">
          <NRadioGroup v-model:value="model.status">
            <NRadio
              v-for="item in translateOptions(enableStatusOptions)"
              :key="item.value"
              :value="item.value"
              :label="item.label"
            />
          </NRadioGroup>
        </NFormItem>
        <NFormItem :label="$t('page.system.dataScopeDemo.content')" path="content">
          <NInput
            v-model:value="model.content"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 8 }"
            :placeholder="$t('page.system.dataScopeDemo.form.content')"
          />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="loading" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
