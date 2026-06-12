<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { enableStatusOptions, userGenderOptions } from '@/constants/business';
import { fetchGetAllRoles, fetchGetDeptTreeOption, fetchSaveUser, fetchUpdateUser } from '@/service/api';
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

const model = ref(createDefaultModel());

function createDefaultModel(): Api.SystemManage.CreateUserParams {
  return {
    userName: '',
    password: '',
    userGender: null,
    nickname: '',
    userPhone: '',
    userEmail: '',
    roles: [],
    status: '1',
    deptIds: []
  };
}

type RuleKey = Extract<keyof Api.SystemManage.CreateUserParams, 'userName' | 'nickname' | 'password' | 'status'>;

const rules: Record<RuleKey, App.Global.FormRule[]> = {
  userName: formRules.userName,
  nickname: formRules.userName,
  password: formRules.pwd,
  status: [defaultRequiredRule]
};

const loading = ref(false);

/** the enabled role options */
const roleOptions = ref<CommonType.Option<string>[]>([]);

async function getRoleOptions() {
  const { error, data } = await fetchGetAllRoles();

  if (!error) {
    const options = data.map(item => ({
      label: item.roleName,
      value: item.roleCode
    }));

    roleOptions.value = options;
  }
}

/** dept tree options (id/label format from /tree-option endpoint) */
const deptTreeData = ref<Api.SystemManage.DeptTreeOption[]>([]);

async function loadDeptTree() {
  const { data } = await fetchGetDeptTreeOption();
  if (data) {
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

  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model.value, jsonClone(props.rowData));
    const userDepts = props.rowData.userDepts || [];
    checkedDeptKeys.value = userDepts.map(d => d.deptId);
    primaryDeptId.value = userDepts.find(d => d.isPrimary)?.deptId || userDepts[0]?.deptId || '';
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  if (allSelectedDeptIds.value.length > 0 && !primaryDeptId.value) {
    window.$message?.error($t('page.system.user.form.primaryDeptRequired'));
    return;
  }
  loading.value = true;
  try {
    const payload: Api.SystemManage.CreateUserParams = {
      ...model.value,
      deptIds: allSelectedDeptIds.value.map(id => ({
        deptId: id,
        isPrimary: id === primaryDeptId.value
      }))
    };

    let res;
    if (props.operateType === 'edit' && props.rowData) {
      res = await fetchUpdateUser(props.rowData.userId, payload);
    } else {
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

watch(visible, () => {
  if (visible.value) {
    handleInitModel();
    restoreValidation();
    getRoleOptions();
    loadDeptTree();
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
        <NFormItem :label="$t('page.system.user.userRole')" path="roles">
          <NSelect
            v-model:value="model.roles"
            multiple
            :options="roleOptions"
            :placeholder="$t('page.system.user.form.userRole')"
          />
        </NFormItem>
        <NFormItem :label="$t('page.system.user.userDept')" path="deptIds">
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
          <NButton type="primary" :loading="loading" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
