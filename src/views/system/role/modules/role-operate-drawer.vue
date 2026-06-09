<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { enableStatusOptions } from '@/constants/business';
import { fetchGetDeptTree, fetchSaveRole, fetchUpdateRole } from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'RoleOperateDrawer'
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.Role | null;
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
    add: $t('page.system.role.addRole'),
    edit: $t('page.system.role.editRole')
  };
  return titles[props.operateType];
});

const dataScopeOptions = [
  { label: '全部数据', value: '1' },
  { label: '自定义数据', value: '2' },
  { label: '本部门数据', value: '3' },
  { label: '本部门及以下', value: '4' },
  { label: '仅本人', value: '5' }
];

type Model = Pick<Api.SystemManage.Role, 'roleName' | 'roleCode' | 'roleDesc' | 'dataScope' | 'status'> & {
  deptIds: string[];
};

const model = ref(createDefaultModel());

function createDefaultModel(): Model {
  return {
    roleName: '',
    roleCode: 'R_',
    roleDesc: '',
    dataScope: '1',
    status: '1',
    deptIds: []
  };
}

type RuleKey = Extract<keyof Model, 'roleName' | 'roleCode' | 'status'>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  roleName: defaultRequiredRule,
  roleCode: defaultRequiredRule,
  status: defaultRequiredRule
};

const loading = ref(false);

const showDeptTree = computed(() => model.value.dataScope === '2');

const deptTreeData = ref<Api.SystemManage.DeptTree[]>([]);

async function loadDeptTree() {
  const { data } = await fetchGetDeptTree();
  if (data) {
    deptTreeData.value = data;
  }
}

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === 'edit' && props.rowData) {
    const cloned = jsonClone(props.rowData);
    Object.assign(model.value, {
      ...cloned,
      dataScope: cloned.dataScope || '1',
      deptIds: cloned.deptIds || []
    });
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  loading.value = true;
  try {
    const submitData = { ...model.value };
    if (submitData.dataScope !== '2') {
      delete (submitData as any).deptIds;
    }

    let res;
    if (props.operateType === 'edit' && props.rowData) {
      res = await fetchUpdateRole(props.rowData.roleId, submitData);
    } else {
      res = await fetchSaveRole(submitData);
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
    loadDeptTree();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="360">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem :label="$t('page.system.role.roleName')" path="roleName">
          <NInput v-model:value="model.roleName" :placeholder="$t('page.system.role.form.roleName')" />
        </NFormItem>
        <NFormItem :label="$t('page.system.role.roleCode')" path="roleCode">
          <NInput
            v-model:value="model.roleCode"
            :placeholder="$t('page.system.role.form.roleCode')"
            @input="(val: string) => (model.roleCode = val.toUpperCase())"
          />
        </NFormItem>
        <NFormItem :label="$t('page.system.role.roleStatus')" path="status">
          <NRadioGroup v-model:value="model.status">
            <NRadio v-for="item in enableStatusOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
          </NRadioGroup>
        </NFormItem>
        <NFormItem label="数据权限" path="dataScope">
          <NSelect v-model:value="model.dataScope" :options="dataScopeOptions" />
        </NFormItem>
        <NFormItem v-if="showDeptTree" label="选择部门">
          <NTree
            v-model:checked-keys="model.deptIds"
            :data="deptTreeData"
            key-field="id"
            label-field="label"
            checkable
            cascade
            selectable
            block-line
            style="width: 100%"
          />
        </NFormItem>
        <NFormItem :label="$t('page.system.role.roleDesc')" path="roleDesc">
          <NInput v-model:value="model.roleDesc" :placeholder="$t('page.system.role.form.roleDesc')" />
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
