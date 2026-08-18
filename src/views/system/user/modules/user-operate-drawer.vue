<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { enableStatusOptions, userGenderOptions } from '@/constants/business';
import {
  fetchGetAssignableRoles,
  fetchGetDeptTreeOption,
  fetchSaveUser,
  fetchUpdateUser,
  fetchUpdateUserDepartments,
  fetchUpdateUserRoles
} from '@/service/api';
import { useAuth } from '@/hooks/business/auth';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'UserOperateDrawer'
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.SystemManage.User | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();
const { hasAuth } = useAuth();

const visible = defineModel<boolean>('visible', {
  default: false
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule, formRules } = useFormRules();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t('page.system.user.addUser'),
    edit: $t('page.system.user.editUser')
  };
  return titles[props.operateType];
});

type UserFormModel = Api.SystemManage.UpdateUserParams & {
  password: string;
  roleIds: string[];
};

const canAssignRoles = computed(() => hasAuth('system:user:role-auth'));
const canAssignDepartments = computed(() => hasAuth('system:dept:list'));

const model = ref<UserFormModel>(createDefaultModel());

function createDefaultModel(): UserFormModel {
  return {
    userName: '',
    password: '',
    userGender: null,
    nickname: '',
    userPhone: '',
    userEmail: '',
    roleIds: [],
    status: '1'
  };
}

type RuleKey = Extract<keyof UserFormModel, 'userName' | 'nickname' | 'password' | 'roleIds' | 'status'>;

const rules = computed<Record<RuleKey, App.Global.FormRule[]>>(() => ({
  userName: formRules.userName,
  nickname: [defaultRequiredRule],
  password: formRules.pwd,
  roleIds: canAssignRoles.value
    ? [
        {
          required: true,
          type: 'array',
          message: $t('page.system.user.form.userRoleRequired')
        }
      ]
    : [],
  status: [defaultRequiredRule]
}));

const loading = ref(false);
const initializing = ref(false);
const initialRoleIds = ref<string[]>([]);
const initialDeptAssignments = ref<Api.SystemManage.UserDeptItem[]>([]);
let initializationGeneration = 0;

/** the enabled role options */
const roleOptions = ref<CommonType.Option<string>[]>([]);

async function fetchRoleCandidates(query?: string) {
  const { error, data } = await fetchGetAssignableRoles({ query, limit: 20 });
  return error ? [] : data;
}

function mergeRoleOptions(roles: Api.SystemManage.AssignableRole[]) {
  const options = new Map(roleOptions.value.map(option => [option.value, option]));
  roles.forEach(role => {
    options.set(role.roleId, { label: role.roleName, value: role.roleId });
  });
  roleOptions.value = [...options.values()];
}

async function getRoleOptions(generation: number, currentRoleCodes: string[]) {
  const resultSets = await Promise.all([
    fetchRoleCandidates(),
    ...currentRoleCodes.map(roleCode => fetchRoleCandidates(roleCode))
  ]);
  if (generation !== initializationGeneration) return;
  const roles = [...new Map(resultSets.flat().map(role => [role.roleId, role])).values()];
  mergeRoleOptions(roles);

  if (currentRoleCodes.length > 0) {
    const roleIdByCode = new Map(roles.map(role => [role.roleCode, role.roleId]));
    model.value.roleIds = currentRoleCodes.flatMap(roleCode => {
      const roleId = roleIdByCode.get(roleCode);
      return roleId ? [roleId] : [];
    });
    initialRoleIds.value = [...model.value.roleIds].sort();
  }
}

async function handleRoleSearch(query: string) {
  const normalized = query.trim();
  if (!normalized) return;
  mergeRoleOptions(await fetchRoleCandidates(normalized));
}

function canonicalDeptAssignments(assignments: Api.SystemManage.UserDeptItem[]) {
  return [...assignments].sort((left, right) => left.deptId.localeCompare(right.deptId));
}

function assignmentsChanged(current: Api.SystemManage.UserDeptItem[]) {
  return JSON.stringify(canonicalDeptAssignments(current)) !== JSON.stringify(initialDeptAssignments.value);
}

/** dept tree options (id/label format from /tree-option endpoint) */
const deptTreeData = ref<Api.SystemManage.DeptTreeOption[]>([]);

async function loadDeptTree(generation: number) {
  const { data } = await fetchGetDeptTreeOption();
  if (data && generation === initializationGeneration) {
    deptTreeData.value = data;
  }
}

/** fully-checked dept keys (leaf + fully-checked parents under cascade) */
const checkedDeptKeys = ref<string[]>([]);

/** indeterminate parent keys (partially-checked under cascade) */
const indeterminateDeptKeys = ref<Array<string | number>>([]);

/** combined dept ids: fully-checked + indeterminate parents, mirrors menu-auth submit pattern */
const allSelectedDeptIds = computed(() => [...checkedDeptKeys.value, ...indeterminateDeptKeys.value.map(String)]);

/** primary dept id among all selected */
const primaryDeptId = ref<string>('');

/** radio options for primary dept, derived from all selected depts */
const primaryDeptOptions = computed<CommonType.Option<string>[]>(() =>
  allSelectedDeptIds.value.map(id => ({ label: findDeptLabel(deptTreeData.value, id) || id, value: id }))
);

function findDeptLabel(nodes: Api.SystemManage.DeptTreeOption[], id: string): string | undefined {
  for (const n of nodes) {
    if (n.id === id) return n.label;
    if (n.children?.length) {
      const found = findDeptLabel(n.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

function handleIndeterminateKeysUpdate(keys: Array<string | number>) {
  indeterminateDeptKeys.value = keys;
}

/** keep primary dept selection valid when selected set changes */
watch(allSelectedDeptIds, ids => {
  if (!ids.includes(primaryDeptId.value)) {
    primaryDeptId.value = ids[0] || '';
  }
});

function handleInitModel() {
  model.value = createDefaultModel();
  checkedDeptKeys.value = [];
  indeterminateDeptKeys.value = [];
  primaryDeptId.value = '';
  roleOptions.value = [];
  initialRoleIds.value = [];
  initialDeptAssignments.value = [];

  if (props.operateType === 'edit' && props.rowData) {
    const row = jsonClone(props.rowData);
    Object.assign(model.value, {
      userName: row.userName,
      userGender: row.userGender,
      nickname: row.nickname,
      userPhone: row.userPhone,
      userEmail: row.userEmail,
      status: row.status
    });
    const userDepts = props.rowData.userDepts || [];
    checkedDeptKeys.value = userDepts.map(d => d.deptId);
    primaryDeptId.value = userDepts.find(d => d.isPrimary)?.deptId || userDepts[0]?.deptId || '';
    initialDeptAssignments.value = canonicalDeptAssignments(userDepts);
  }
}

function closeDrawer() {
  visible.value = false;
}

function recoverFromPartialUpdate() {
  window.$message?.warning($t('page.system.user.form.partialUpdateWarning'));
  closeDrawer();
  emit('submitted');
}

async function handleSubmit() {
  if (initializing.value) return;
  try {
    await validate();
  } catch {
    return;
  }
  if (allSelectedDeptIds.value.length > 0 && !primaryDeptId.value) {
    window.$message?.error($t('page.system.user.form.primaryDeptRequired'));
    return;
  }
  loading.value = true;
  try {
    const profile: Api.SystemManage.UpdateUserParams = {
      userName: model.value.userName,
      userGender: model.value.userGender,
      nickname: model.value.nickname,
      userPhone: model.value.userPhone,
      userEmail: model.value.userEmail,
      status: model.value.status
    };
    const deptAssignments = allSelectedDeptIds.value.map(id => ({
      deptId: id,
      isPrimary: id === primaryDeptId.value
    }));

    let res;
    if (props.operateType === 'edit' && props.rowData) {
      let associationCommitted = false;
      if (
        canAssignRoles.value &&
        JSON.stringify([...model.value.roleIds].sort()) !== JSON.stringify(initialRoleIds.value)
      ) {
        res = await fetchUpdateUserRoles(props.rowData.userId, {
          roleIds: model.value.roleIds
        });
        if (res.error) return;
        associationCommitted = true;
      }
      if (canAssignDepartments.value && assignmentsChanged(deptAssignments)) {
        res = await fetchUpdateUserDepartments(props.rowData.userId, {
          deptAssignments
        });
        if (res.error) {
          if (associationCommitted) recoverFromPartialUpdate();
          return;
        }
        associationCommitted = true;
      }
      res = await fetchUpdateUser(props.rowData.userId, profile);
      if (res.error) {
        if (associationCommitted) recoverFromPartialUpdate();
        return;
      }
    } else {
      const payload: Api.SystemManage.CreateUserParams = {
        ...profile,
        password: model.value.password,
        deptIds: canAssignDepartments.value ? deptAssignments : [],
        ...(canAssignRoles.value ? { roleIds: model.value.roleIds } : {})
      };
      res = await fetchSaveUser(payload);
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

watch(visible, async isVisible => {
  if (!isVisible) {
    initializationGeneration += 1;
    initializing.value = false;
    return;
  }
  const generation = ++initializationGeneration;
  const currentRoleCodes = props.operateType === 'edit' && props.rowData ? [...props.rowData.roles] : [];
  handleInitModel();
  restoreValidation();
  initializing.value = true;
  try {
    await Promise.all([
      canAssignRoles.value ? getRoleOptions(generation, currentRoleCodes) : Promise.resolve(),
      canAssignDepartments.value ? loadDeptTree(generation) : Promise.resolve()
    ]);
  } finally {
    if (generation === initializationGeneration) initializing.value = false;
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="360">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem :label="$t('page.system.user.userName')" path="userName">
          <NInput v-model:value="model.userName" :placeholder="$t('page.system.user.form.userName')" />
        </NFormItem>
        <NFormItem :label="$t('page.system.user.nickname')" path="nickname">
          <NInput v-model:value="model.nickname" :placeholder="$t('page.system.user.form.nickname')" />
        </NFormItem>
        <NFormItem v-if="props.operateType === 'add'" :label="$t('page.system.user.password')" path="password">
          <NInput
            v-model:value="model.password"
            type="password"
            show-password-on="mousedown"
            :minlength="6"
            :placeholder="$t('page.system.user.form.password')"
          />
        </NFormItem>
        <NFormItem :label="$t('page.system.user.userGender')" path="userGender">
          <NRadioGroup v-model:value="model.userGender">
            <NRadio v-for="item in userGenderOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
          </NRadioGroup>
        </NFormItem>
        <NFormItem :label="$t('page.system.user.userPhone')" path="userPhone">
          <NInput v-model:value="model.userPhone" :placeholder="$t('page.system.user.form.userPhone')" />
        </NFormItem>
        <NFormItem :label="$t('page.system.user.userEmail')" path="email">
          <NInput v-model:value="model.userEmail" :placeholder="$t('page.system.user.form.userEmail')" />
        </NFormItem>
        <NFormItem :label="$t('page.system.user.userStatus')" path="status">
          <NRadioGroup v-model:value="model.status">
            <NRadio v-for="item in enableStatusOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
          </NRadioGroup>
        </NFormItem>
        <NFormItem v-if="canAssignRoles" :label="$t('page.system.user.userRole')" path="roleIds">
          <NSelect
            v-model:value="model.roleIds"
            multiple
            filterable
            remote
            :options="roleOptions"
            :placeholder="$t('page.system.user.form.userRole')"
            @search="handleRoleSearch"
          />
        </NFormItem>
        <NFormItem v-if="canAssignDepartments" :label="$t('page.system.user.userDept')" path="deptIds">
          <NTree
            v-model:checked-keys="checkedDeptKeys"
            :data="deptTreeData"
            key-field="id"
            label-field="label"
            checkable
            cascade
            show-line
            expand-on-click
            virtual-scroll
            block-line
            class="h-280px w-full"
            @update-indeterminate-keys="handleIndeterminateKeysUpdate"
          />
        </NFormItem>
        <NFormItem
          v-if="allSelectedDeptIds.length > 0"
          :label="$t('page.system.user.primaryDept')"
          path="primaryDeptId"
        >
          <NRadioGroup v-model:value="primaryDeptId">
            <NRadio v-for="item in primaryDeptOptions" :key="item.value" :value="item.value" :label="item.label" />
          </NRadioGroup>
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="loading || initializing" :disabled="initializing" @click="handleSubmit">
            {{ $t('common.confirm') }}
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
