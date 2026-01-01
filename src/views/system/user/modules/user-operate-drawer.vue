<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { enableStatusOptions, userGenderOptions } from '@/constants/business';
import { fetchGetAllRoles, fetchSaveUser, fetchUpdateUser } from '@/service/api';
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
    status: null
  };
}

type RuleKey = Extract<keyof Api.SystemManage.CreateUserParams, 'userName' | 'nickname' | 'password' | 'status'>;

const rules: Record<RuleKey, App.Global.FormRule[]> = {
  userName: formRules.userName,
  nickname: formRules.userName,
  // nickname: [
  //   defaultRequiredRule,
  //   {
  //     min: 4,
  //     max: 20,
  //     message: '昵称长度为2-20个字符',
  //     trigger: 'blur'
  //   }
  // ],
  password: formRules.pwd,
  status: [defaultRequiredRule]
};

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

function handleInitModel() {
  model.value = createDefaultModel();

  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model.value, jsonClone(props.rowData));
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();
  let res;
  if (props.operateType === 'edit' && props.rowData) {
    res = await fetchUpdateUser(props.rowData.userId, model.value);
  } else {
    res = await fetchSaveUser(model.value);
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
    getRoleOptions();
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
            :minlength="8"
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
