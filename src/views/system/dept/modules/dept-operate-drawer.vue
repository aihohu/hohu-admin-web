<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { enableStatusOptions } from '@/constants/business';
import { fetchGetDeptTreeOption, fetchSaveDept, fetchUpdateDept } from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'DeptOperateDrawer'
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.Dept | null;
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
    add: $t('page.system.dept.addDept'),
    edit: $t('page.system.dept.editDept')
  };
  return titles[props.operateType];
});

type Model = Api.SystemManage.DeptCreateParams;

const model = ref(createDefaultModel());

function createDefaultModel(): Model {
  return {
    parentId: '0',
    deptName: '',
    orderNum: 0,
    leader: '',
    phone: '',
    email: '',
    status: '1'
  };
}

type RuleKey = Extract<keyof Model, 'deptName' | 'parentId' | 'status'>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  parentId: defaultRequiredRule,
  deptName: {
    required: true,
    min: 2,
    message: $t('page.system.dept.validation.deptNameMinLength'),
    trigger: 'blur'
  },
  status: defaultRequiredRule
};

const treeOptions = ref<Api.SystemManage.DeptTreeOption[]>([]);

const ROOT_OPTION: Api.SystemManage.DeptTreeOption = {
  id: '0',
  label: '顶级部门',
  pId: ''
};

async function loadTreeOptions() {
  const { data, error } = await fetchGetDeptTreeOption();
  if (!error) {
    treeOptions.value = [ROOT_OPTION, ...(data || [])];
  }
}

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === 'edit' && props.rowData) {
    const data = jsonClone(props.rowData);
    model.value = {
      parentId: data.parentId ?? '0',
      deptName: data.deptName,
      orderNum: data.orderNum,
      leader: data.leader,
      phone: data.phone,
      email: data.email,
      status: data.status
    };
  }

  if (props.operateType === 'add' && props.rowData?.parentId) {
    model.value.parentId = props.rowData.parentId;
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  let res;
  if (props.operateType === 'edit' && props.rowData) {
    res = await fetchUpdateDept(props.rowData.deptId, model.value);
  } else {
    res = await fetchSaveDept(model.value);
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
    loadTreeOptions();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="360">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem :label="$t('page.system.dept.parentId')" path="parentId">
          <NTreeSelect
            v-model:value="model.parentId"
            :options="treeOptions"
            key-field="id"
            label-field="label"
            children-field="children"
            :placeholder="$t('page.system.dept.form.parentId')"
          />
        </NFormItem>
        <NFormItem :label="$t('page.system.dept.deptName')" path="deptName">
          <NInput v-model:value="model.deptName" :placeholder="$t('page.system.dept.form.deptName')" />
        </NFormItem>
        <NFormItem :label="$t('page.system.dept.orderNum')" path="orderNum">
          <NInputNumber
            v-model:value="model.orderNum"
            :placeholder="$t('page.system.dept.form.orderNum')"
            class="w-full"
          />
        </NFormItem>
        <NFormItem :label="$t('page.system.dept.leader')" path="leader">
          <NInput v-model:value="model.leader" :placeholder="$t('page.system.dept.form.leader')" />
        </NFormItem>
        <NFormItem :label="$t('page.system.dept.phone')" path="phone">
          <NInput v-model:value="model.phone" :placeholder="$t('page.system.dept.form.phone')" />
        </NFormItem>
        <NFormItem :label="$t('page.system.dept.email')" path="email">
          <NInput v-model:value="model.email" :placeholder="$t('page.system.dept.form.email')" />
        </NFormItem>
        <NFormItem :label="$t('page.system.dept.deptStatus')" path="status">
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
