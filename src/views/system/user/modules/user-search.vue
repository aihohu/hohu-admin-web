<script setup lang="ts">
import { computed, onMounted, ref, toRaw } from 'vue';
import { jsonClone } from '@sa/utils';
import { enableStatusOptions, userGenderOptions } from '@/constants/business';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { fetchGetAllRoles } from '@/service/api';
import { translateOptions } from '@/utils/common';
import { $t } from '@/locales';

defineOptions({
  name: 'UserSearch'
});

interface Emits {
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate, restoreValidation } = useNaiveForm();

const model = defineModel<Api.SystemManage.UserSearchParams>('model', { required: true });

type RuleKey = Extract<keyof Api.SystemManage.UserSearchParams, 'userEmail' | 'userPhone'>;

const rules = computed<Record<RuleKey, App.Global.FormRule>>(() => {
  const { patternRules } = useFormRules(); // inside computed to make locale reactive

  return {
    userEmail: patternRules.email,
    userPhone: patternRules.phone
  };
});

const roleOptions = ref<{ label: string; value: string }[]>([]);

async function loadRoles() {
  const { data, error } = await fetchGetAllRoles();
  if (!error && data) {
    roleOptions.value = data.map(r => ({ label: r.roleName, value: r.roleCode }));
  }
}

onMounted(() => {
  loadRoles();
});

const defaultModel = jsonClone(toRaw(model.value));

function resetModel() {
  Object.assign(model.value, defaultModel);
}

async function reset() {
  await restoreValidation();
  resetModel();
}

async function search() {
  await validate();
  emit('search');
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <NCollapse>
      <NCollapseItem :title="$t('common.search')" name="user-search">
        <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi span="24 s:12 m:6" :label="$t('page.system.user.userName')" path="userName" class="pr-24px">
              <NInput v-model:value="model.userName" :placeholder="$t('page.system.user.form.userName')" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" :label="$t('page.system.user.nickname')" path="nickname" class="pr-24px">
              <NInput v-model:value="model.nickname" :placeholder="$t('page.system.user.form.nickname')" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" :label="$t('page.system.user.userPhone')" path="userPhone" class="pr-24px">
              <NInput v-model:value="model.userPhone" :placeholder="$t('page.system.user.form.userPhone')" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" :label="$t('page.system.user.userEmail')" path="userEmail" class="pr-24px">
              <NInput v-model:value="model.userEmail" :placeholder="$t('page.system.user.form.userEmail')" />
            </NFormItemGi>
            <NFormItemGi
              span="24 s:12 m:6"
              :label="$t('page.system.user.userStatus')"
              path="userStatus"
              class="pr-24px"
            >
              <NSelect
                v-model:value="model.status"
                :placeholder="$t('page.system.user.form.userStatus')"
                :options="translateOptions(enableStatusOptions)"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi
              span="24 s:12 m:6"
              :label="$t('page.system.user.userGender')"
              path="userGender"
              class="pr-24px"
            >
              <NSelect
                v-model:value="model.userGender"
                :placeholder="$t('page.system.user.form.userGender')"
                :options="translateOptions(userGenderOptions)"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" :label="$t('page.system.user.userRole')" class="pr-24px">
              <NSelect
                v-model:value="model.roleCode"
                :placeholder="$t('page.system.user.form.userRole')"
                :options="roleOptions"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 m:12" class="pr-24px">
              <NSpace class="w-full" justify="end">
                <NButton @click="reset">
                  <template #icon>
                    <icon-ic-round-refresh class="text-icon" />
                  </template>
                  {{ $t('common.reset') }}
                </NButton>
                <NButton type="primary" ghost @click="search">
                  <template #icon>
                    <icon-ic-round-search class="text-icon" />
                  </template>
                  {{ $t('common.search') }}
                </NButton>
              </NSpace>
            </NFormItemGi>
          </NGrid>
        </NForm>
      </NCollapseItem>
    </NCollapse>
  </NCard>
</template>

<style scoped></style>
