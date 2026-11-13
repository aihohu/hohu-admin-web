<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { enableStatusOptions } from '@/constants/business';
import { fetchGetDeptTreeOption, fetchRelationForm, fetchSaveDept, fetchUpdateDept } from '@/service/api';
import { useRelationForm } from '@/hooks/business/relation-form';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { getServerErrorMessage, useServerFieldErrors } from '@/hooks/common/server-field-errors';
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
const { applyServerFieldErrors, clearServerFieldErrors, fieldProps } = useServerFieldErrors();
const { defaultRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t('page.system.dept.addDept'),
    edit: $t('page.system.dept.editDept')
  };
  return titles[props.operateType];
});

type Model = Api.SystemManage.DeptCreateParams;

const selectedParent = ref('0');
watch(
  [visible, () => props.rowData?.parentId, () => props.operateType],
  () => {
    selectedParent.value = props.operateType === 'add' ? (props.rowData?.parentId ?? '0') : '0';
  },
  { immediate: true }
);

const form = useRelationForm<Model>({
  visible,
  mode: () => (props.operateType === 'edit' ? 'update' : 'create'),
  target: () => props.rowData?.deptId,
  parent: () => (props.operateType === 'add' ? selectedParent.value : undefined),
  defaults: createDefaultModel,
  load: query => fetchRelationForm<Model>('dept', query)
});
const { model, ready, editable, present } = form;

const treeReady = ref(false);

function createDefaultModel(): Model {
  return {
    parentId: selectedParent.value,
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

const activeRules = computed(() =>
  Object.fromEntries(
    Object.entries(rules).filter(([key]) =>
      props.operateType === 'add' ? editable(key) : Object.hasOwn(form.payload(), key)
    )
  )
);

const loading = ref(false);

const treeOptions = ref<Api.SystemManage.DeptTreeOption[]>([]);

const ROOT_OPTION: Api.SystemManage.DeptTreeOption = {
  id: '0',
  label: $t('page.system.dept.rootDept'),
  pId: ''
};

async function loadTreeOptions() {
  const token = form.session();
  treeReady.value = false;
  const { data, error } = await fetchGetDeptTreeOption();
  if (form.current(token) && !error && data) {
    treeReady.value = true;
    treeOptions.value = [ROOT_OPTION, ...(data || [])];
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
  if (props.operateType === 'add' && !treeReady.value) return;
  loading.value = true;
  try {
    let res;
    if (props.operateType === 'edit' && props.rowData) {
      res = await fetchUpdateDept(props.rowData.deptId, payload);
    } else {
      res = await fetchSaveDept(payload as Api.SystemManage.DeptCreateParams);
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

watch([visible, () => props.rowData?.deptId, () => props.operateType], () => {
  loading.value = false;
  if (visible.value) {
    restoreValidation();
    loadTreeOptions();
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
        <NFormItem v-if="present('parentId')" :label="$t('page.system.dept.parentId')" path="parentId">
          <NTreeSelect
            v-model:value="model.parentId"
            :options="treeOptions"
            key-field="id"
            label-field="label"
            children-field="children"
            :placeholder="$t('page.system.dept.form.parentId')"
            :disabled="props.operateType === 'edit' || !editable('parentId')"
            @update:value="value => (selectedParent = value ?? '0')"
          />
        </NFormItem>
        <NFormItem
          v-if="present('deptName')"
          v-bind="fieldProps('deptName')"
          :label="$t('page.system.dept.deptName')"
          path="deptName"
          :feedback="form.replacement('deptName') ? $t('fieldPolicy.replacementHint') : undefined"
        >
          <NInput
            v-model:value="model.deptName"
            :disabled="!editable('deptName')"
            :placeholder="$t('page.system.dept.form.deptName')"
          />
        </NFormItem>
        <NFormItem
          v-if="present('orderNum')"
          v-bind="fieldProps('orderNum')"
          :label="$t('page.system.dept.orderNum')"
          path="orderNum"
          :feedback="form.replacement('orderNum') ? $t('fieldPolicy.replacementHint') : undefined"
        >
          <NInputNumber
            v-model:value="model.orderNum"
            :disabled="!editable('orderNum')"
            :placeholder="$t('page.system.dept.form.orderNum')"
            class="w-full"
          />
        </NFormItem>
        <NFormItem
          v-if="present('leader')"
          :label="$t('page.system.dept.leader')"
          path="leader"
          :feedback="form.replacement('leader') ? $t('fieldPolicy.replacementHint') : undefined"
        >
          <NInput
            v-model:value="model.leader"
            clearable
            :disabled="!editable('leader')"
            :placeholder="$t('page.system.dept.form.leader')"
            @clear="model.leader = null"
          />
        </NFormItem>
        <NFormItem
          v-if="present('phone')"
          v-bind="fieldProps('phone')"
          :label="$t('page.system.dept.phone')"
          path="phone"
          :feedback="form.replacement('phone') ? $t('fieldPolicy.replacementHint') : undefined"
        >
          <NInput
            v-model:value="model.phone"
            clearable
            :disabled="!editable('phone')"
            :placeholder="$t('page.system.dept.form.phone')"
            @clear="model.phone = null"
          />
        </NFormItem>
        <NFormItem
          v-if="present('email')"
          v-bind="fieldProps('email')"
          :label="$t('page.system.dept.email')"
          path="email"
          :feedback="form.replacement('email') ? $t('fieldPolicy.replacementHint') : undefined"
        >
          <NInput
            v-model:value="model.email"
            clearable
            :disabled="!editable('email')"
            :placeholder="$t('page.system.dept.form.email')"
            @clear="model.email = null"
          />
        </NFormItem>
        <NFormItem v-if="present('status')" :label="$t('page.system.dept.deptStatus')" path="status">
          <NRadioGroup v-model:value="model.status" :disabled="!editable('status')">
            <NRadio v-for="item in enableStatusOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
          </NRadioGroup>
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
