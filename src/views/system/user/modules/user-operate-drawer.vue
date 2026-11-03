<script setup lang="ts">
import { computed, ref, watch } from 'vue';
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
import {
  buildUserPatch,
  completeRelation,
  createUserDraft,
  fieldCapability,
  fieldRead,
  userProfileFields
} from '@/hooks/business/user-field-draft';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { getServerErrorMessage, useServerFieldErrors } from '@/hooks/common/server-field-errors';
import { $t, localizedText } from '@/locales';

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
const { applyServerFieldErrors, clearServerFieldErrors, fieldProps } = useServerFieldErrors();
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

const roleSetComplete = ref(false);
const canAssignRoles = computed(
  () => hasAuth('system:user:role-auth') && (props.operateType === 'add' || roleSetComplete.value)
);
const canAssignDepartments = computed(
  () =>
    hasAuth('system:dept:list') &&
    (props.operateType === 'add' ||
      (props.rowData &&
        fieldRead(props.rowData, 'departments') === 'plain' &&
        fieldCapability(props.rowData, 'departments', 'replace') &&
        Array.isArray(props.rowData.userDepts)) ||
      (props.rowData && !Object.hasOwn(props.rowData, 'fieldAccess') && Array.isArray(props.rowData.userDepts)))
);

function canEdit(field: string) {
  return props.operateType === 'add' || Boolean(props.rowData && fieldCapability(props.rowData, field, 'update'));
}

function showField(field: string) {
  return canEdit(field) || Boolean(props.rowData && fieldRead(props.rowData, field) !== 'hidden');
}

function replacement(field: string) {
  return props.operateType === 'edit' && props.rowData && canEdit(field) && fieldRead(props.rowData, field) !== 'plain';
}

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
  userName: canEdit('userName') ? formRules.userName : [],
  nickname: canEdit('nickname') && !replacement('nickname') ? [defaultRequiredRule] : [],
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
  status: canEdit('status') ? [defaultRequiredRule] : []
}));

const loading = ref(false);
const initializing = ref(false);
const initialRoleIds = ref<string[]>([]);
const initialDeptAssignments = ref<Api.SystemManage.UserDeptItem[]>([]);
let initializationGeneration = 0;

/** the enabled role options */
const candidateRoles = ref<Api.SystemManage.AssignableRole[]>([]);
const roleOptions = computed(() =>
  candidateRoles.value.map(role => ({
    label: localizedText(role.roleName, role.i18nKeys?.roleName),
    value: role.roleId
  }))
);

async function fetchRoleCandidates(query?: string) {
  const { error, data } = await fetchGetAssignableRoles({ query, limit: 20 });
  return error ? [] : data;
}

function mergeRoleOptions(roles: Api.SystemManage.AssignableRole[]) {
  const options = new Map(candidateRoles.value.map(role => [role.roleId, role]));
  roles.forEach(role => options.set(role.roleId, role));
  candidateRoles.value = [...options.values()];
}

async function getRoleOptions(generation: number, currentRoleCodes: string[]) {
  const resultSets = await Promise.all([
    fetchRoleCandidates(),
    ...currentRoleCodes.map(roleCode => fetchRoleCandidates(roleCode))
  ]);
  if (generation !== initializationGeneration) return;
  const roles = [...new Map(resultSets.flat().map(role => [role.roleId, role])).values()];
  mergeRoleOptions(roles);
  roleSetComplete.value = Boolean(
    props.rowData &&
    completeRelation(
      props.rowData,
      'roles',
      roles.map(role => role.roleCode)
    )
  );

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
  candidateRoles.value = [];
  initialRoleIds.value = [];
  initialDeptAssignments.value = [];
  roleSetComplete.value = false;

  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model.value, createUserDraft(props.rowData, userProfileFields));
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
  if (initializing.value || loading.value) return;
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
      const patch = buildUserPatch(props.rowData, model.value, userProfileFields);
      if (Object.keys(patch).length > 0) {
        res = await fetchUpdateUser(props.rowData.userId, patch);
        if (res.error) {
          if (associationCommitted) recoverFromPartialUpdate();
          else applyServerFieldErrors(res.error);
          return;
        }
      } else {
        closeDrawer();
        if (associationCommitted) emit('submitted');
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
    } else if (!applyServerFieldErrors(error)) {
      window.$message?.error(getServerErrorMessage(error) || $t('common.modifyFailed'));
    }
  } finally {
    loading.value = false;
  }
}

watch(model, () => clearServerFieldErrors(), { deep: true });

watch(visible, async isVisible => {
  if (!isVisible) {
    initializationGeneration += 1;
    initializing.value = false;
    return;
  }
  const generation = ++initializationGeneration;
  const currentRoleCodes =
    props.operateType === 'edit' && props.rowData && Array.isArray(props.rowData.roles) ? [...props.rowData.roles] : [];
  handleInitModel();
  restoreValidation();
  initializing.value = true;
  try {
    await Promise.all([
      hasAuth('system:user:role-auth') &&
      (props.operateType === 'add' || (props.rowData && fieldRead(props.rowData, 'roles') === 'plain'))
        ? getRoleOptions(generation, currentRoleCodes)
        : Promise.resolve(),
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
        <NFormItem
          v-if="showField('userName')"
          v-bind="fieldProps('userName')"
          :label="$t('page.system.user.userName')"
          path="userName"
        >
          <NInput
            v-model:value="model.userName"
            :disabled="!canEdit('userName')"
            :placeholder="$t('page.system.user.form.userName')"
          />
        </NFormItem>
        <NFormItem
          v-if="showField('nickname')"
          v-bind="fieldProps('nickname')"
          :label="$t('page.system.user.nickname')"
          path="nickname"
        >
          <NInput
            v-model:value="model.nickname"
            :disabled="!canEdit('nickname')"
            :placeholder="$t('page.system.user.form.nickname')"
          />
        </NFormItem>
        <NFormItem
          v-if="props.operateType === 'add'"
          v-bind="fieldProps('password')"
          :label="$t('page.system.user.password')"
          path="password"
        >
          <NInput
            v-model:value="model.password"
            type="password"
            show-password-on="mousedown"
            :minlength="6"
            :placeholder="$t('page.system.user.form.password')"
          />
        </NFormItem>
        <NFormItem v-if="showField('userGender')" :label="$t('page.system.user.userGender')" path="userGender">
          <NRadioGroup v-model:value="model.userGender" :disabled="!canEdit('userGender')">
            <NRadio v-for="item in userGenderOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
          </NRadioGroup>
        </NFormItem>
        <NFormItem
          v-if="showField('userPhone')"
          v-bind="fieldProps('userPhone')"
          :label="$t('page.system.user.userPhone')"
          path="userPhone"
        >
          <div class="w-full">
            <p v-if="replacement('userPhone')" class="mb-2 text-sm text-muted-color">
              {{ $t('page.system.user.form.replacementHint') }}
            </p>
            <p v-if="props.rowData && fieldRead(props.rowData, 'userPhone') === 'masked'" class="mb-2">
              {{ props.rowData.userPhone }}
            </p>
            <NInput
              v-model:value="model.userPhone"
              :disabled="!canEdit('userPhone')"
              :placeholder="$t('page.system.user.form.userPhone')"
            />
            <NButton
              v-if="props.operateType === 'edit' && canEdit('userPhone')"
              text
              class="mt-2"
              @click="model.userPhone = null"
            >
              {{ $t('fieldPolicy.clearValue') }}
            </NButton>
          </div>
        </NFormItem>
        <NFormItem
          v-if="showField('userEmail')"
          v-bind="fieldProps('userEmail')"
          :label="$t('page.system.user.userEmail')"
          path="userEmail"
        >
          <div class="w-full">
            <p v-if="replacement('userEmail')" class="mb-2 text-sm text-muted-color">
              {{ $t('page.system.user.form.replacementHint') }}
            </p>
            <p v-if="props.rowData && fieldRead(props.rowData, 'userEmail') === 'masked'" class="mb-2">
              {{ props.rowData.userEmail }}
            </p>
            <NInput
              v-model:value="model.userEmail"
              :disabled="!canEdit('userEmail')"
              :placeholder="$t('page.system.user.form.userEmail')"
            />
            <NButton
              v-if="props.operateType === 'edit' && canEdit('userEmail')"
              text
              class="mt-2"
              @click="model.userEmail = null"
            >
              {{ $t('fieldPolicy.clearValue') }}
            </NButton>
          </div>
        </NFormItem>
        <NFormItem v-if="showField('status')" :label="$t('page.system.user.userStatus')" path="status">
          <NRadioGroup v-model:value="model.status" :disabled="!canEdit('status')">
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
          v-if="canAssignDepartments && allSelectedDeptIds.length > 0"
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
