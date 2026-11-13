<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { enableStatusOptions, roleDataScopeOptions } from '@/constants/business';
import { fetchGetDeptTreeOption, fetchRelationForm, fetchSaveRole, fetchUpdateRole } from '@/service/api';
import { useRelationForm } from '@/hooks/business/relation-form';
import { completeTreeIds } from '@/hooks/business/relation-tree';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { getServerErrorMessage, useServerFieldErrors } from '@/hooks/common/server-field-errors';
import { $t } from '@/locales';
import { translateOptions } from '@/utils/common';

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
const { applyServerFieldErrors, clearServerFieldErrors, fieldProps } = useServerFieldErrors();
const { defaultRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t('page.system.role.addRole'),
    edit: $t('page.system.role.editRole')
  };
  return titles[props.operateType];
});

type Model = Omit<Api.SystemManage.CreateRoleParams, 'deptIds'> & {
  deptIds: string[];
};

const form = useRelationForm<Model>({
  visible,
  mode: () => (props.operateType === 'edit' ? 'update' : 'create'),
  target: () => props.rowData?.roleId,

  defaults: createDefaultModel,
  load: query => fetchRelationForm<Model>('role', query)
});
const { model, ready, editable, present } = form;

const treeReady = ref(false);

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

const activeRules = computed(() =>
  Object.fromEntries(
    Object.entries(rules).filter(([key]) =>
      props.operateType === 'add' ? editable(key) : Object.hasOwn(form.payload(), key)
    )
  )
);

const loading = ref(false);

const showDeptTree = computed(() => model.value.dataScope === '2');

const deptTreeData = ref<Api.SystemManage.DeptTreeOption[]>([]);
const treeComplete = computed(() => {
  if (!ready.value || !treeReady.value) return false;
  const ids = completeTreeIds(deptTreeData.value);
  if (!ids) return false;
  if (props.operateType === 'add') return true;
  const original = form.initial()?.deptIds;
  return Array.isArray(original) && original.every(id => ids.has(id));
});

async function loadDeptTree() {
  const token = form.session();
  treeReady.value = false;
  const { data, error } = await fetchGetDeptTreeOption();
  if (form.current(token) && !error && data) {
    treeReady.value = true;
    deptTreeData.value = data;
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  if (!ready.value || loading.value) return;
  const token = form.session();
  await validate();
  if (!form.current(token)) return;
  const payload = form.payload();
  if (!Object.keys(payload).length) return;
  if ((Object.hasOwn(payload, 'deptIds') || payload.dataScope === '2') && !treeComplete.value) return;
  loading.value = true;
  try {
    let res;
    if (props.operateType === 'edit' && props.rowData) {
      res = await fetchUpdateRole(props.rowData.roleId, payload);
    } else {
      res = await fetchSaveRole(payload as Api.SystemManage.CreateRoleParams);
    }
    if (!form.current(token)) return;
    const { error, response } = res;
    if (!error) {
      const successMsg =
        response?.data?.msg || $t(props.operateType === 'edit' ? 'common.updateSuccess' : 'common.saveSuccess');
      window.$message?.success(successMsg);
      closeDrawer();
      emit('submitted');
    } else if (!applyServerFieldErrors(error)) {
      window.$message?.error(getServerErrorMessage(error) || $t('common.modifyFailed'));
    }
  } finally {
    if (form.current(token)) loading.value = false;
  }
}

watch(model, () => clearServerFieldErrors(), { deep: true });

watch([visible, () => props.rowData?.roleId, () => props.operateType], () => {
  loading.value = false;
  if (visible.value) {
    restoreValidation();
    loadDeptTree();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="360">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NAlert v-if="!form.loading.value && !ready" type="warning" class="mb-3">
        {{ $t('fieldPolicy.relationUnavailable') }}
      </NAlert>
      <NForm ref="formRef" :model="model" :rules="activeRules" :disabled="loading || form.loading.value">
        <NFormItem
          v-if="present('roleName')"
          v-bind="fieldProps('roleName')"
          :label="$t('page.system.role.roleName')"
          path="roleName"
          :feedback="form.replacement('roleName') ? $t('fieldPolicy.replacementHint') : undefined"
        >
          <NInput
            v-model:value="model.roleName"
            :disabled="!editable('roleName')"
            :placeholder="$t('page.system.role.form.roleName')"
          />
        </NFormItem>
        <NFormItem
          v-if="present('roleCode')"
          v-bind="fieldProps('roleCode')"
          :label="$t('page.system.role.roleCode')"
          path="roleCode"
        >
          <NInput
            v-model:value="model.roleCode"
            data-testid="role-code-input"
            :disabled="props.operateType === 'edit' || !editable('roleCode')"
            :placeholder="$t('page.system.role.form.roleCode')"
            @input="(val: string) => (model.roleCode = val.toUpperCase())"
          />
        </NFormItem>
        <NFormItem v-if="present('status')" :label="$t('page.system.role.roleStatus')" path="status">
          <NRadioGroup v-model:value="model.status" :disabled="!editable('status')">
            <NRadio v-for="item in enableStatusOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
          </NRadioGroup>
        </NFormItem>
        <NFormItem v-if="present('dataScope')" :label="$t('page.system.role.dataScope.label')" path="dataScope">
          <NSelect
            v-model:value="model.dataScope"
            :disabled="!editable('dataScope')"
            :options="translateOptions(roleDataScopeOptions)"
          />
        </NFormItem>
        <NFormItem v-if="showDeptTree && present('deptIds')" :label="$t('page.system.role.dataScope.selectDept')">
          <NTree
            v-model:checked-keys="model.deptIds"
            :disabled="!editable('deptIds') || !treeComplete"
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
        <NFormItem
          v-if="present('roleDesc')"
          v-bind="fieldProps('roleDesc')"
          :label="$t('page.system.role.roleDesc')"
          path="roleDesc"
          :feedback="form.replacement('roleDesc') ? $t('fieldPolicy.replacementHint') : undefined"
        >
          <NInput
            v-model:value="model.roleDesc"
            clearable
            :disabled="!editable('roleDesc')"
            :placeholder="$t('page.system.role.form.roleDesc')"
            @clear="model.roleDesc = null"
          />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
          <NButton
            type="primary"
            :loading="loading || form.loading.value"
            :disabled="!ready || (props.operateType === 'add' && !form.policy.value?.canCreate)"
            @click="handleSubmit"
          >
            {{ $t('common.confirm') }}
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
