<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { SearchFilter } from './user-search-filters';
import { enableStatusOptions, userGenderOptions } from '@/constants/business';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { fetchGetAllRoles } from '@/service/api';
import { translateOptions } from '@/utils/common';
import { $t, localizedText } from '@/locales';

defineOptions({
  name: 'UserSearch'
});

interface Emits {
  (e: 'search'): void;
}

const props = defineProps<{ filters: SearchFilter[] }>();
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

const roles = ref<Api.SystemManage.AllRole[] | null>(null);
const roleOptions = computed(() =>
  (roles.value ?? []).map(r => ({ label: localizedText(r.roleName, r.i18nKeys?.roleName), value: r.roleCode }))
);

watch(
  () => props.filters.includes('roleCode'),
  async (enabled, _, onCleanup) => {
    roles.value = null;
    if (!enabled) return;
    let current = true;
    onCleanup(() => {
      current = false;
    });
    const { data, error } = await fetchGetAllRoles();
    if (!current) return;
    if (!error && data) roles.value = data;
    else model.value.roleCode = null;
  },
  { immediate: true, flush: 'sync' }
);

async function reset() {
  await restoreValidation();
  for (const key of props.filters) model.value[key] = null;
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
            <NFormItemGi
              v-if="filters.includes('userName')"
              span="24 s:12 m:6"
              :label="$t('page.system.user.userName')"
              path="userName"
              class="pr-24px"
            >
              <NInput v-model:value="model.userName" :placeholder="$t('page.system.user.form.userName')" />
            </NFormItemGi>
            <NFormItemGi
              v-if="filters.includes('nickname')"
              span="24 s:12 m:6"
              :label="$t('page.system.user.nickname')"
              path="nickname"
              class="pr-24px"
            >
              <NInput v-model:value="model.nickname" :placeholder="$t('page.system.user.form.nickname')" />
            </NFormItemGi>
            <NFormItemGi
              v-if="filters.includes('userPhone')"
              span="24 s:12 m:6"
              :label="$t('page.system.user.userPhone')"
              path="userPhone"
              class="pr-24px"
            >
              <NInput v-model:value="model.userPhone" :placeholder="$t('page.system.user.form.userPhone')" />
            </NFormItemGi>
            <NFormItemGi
              v-if="filters.includes('userEmail')"
              span="24 s:12 m:6"
              :label="$t('page.system.user.userEmail')"
              path="userEmail"
              class="pr-24px"
            >
              <NInput v-model:value="model.userEmail" :placeholder="$t('page.system.user.form.userEmail')" />
            </NFormItemGi>
            <NFormItemGi
              v-if="filters.includes('status')"
              span="24 s:12 m:6"
              :label="$t('page.system.user.userStatus')"
              path="status"
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
              v-if="filters.includes('userGender')"
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
            <NFormItemGi
              v-if="filters.includes('roleCode') && roles"
              span="24 s:12 m:6"
              :label="$t('page.system.user.userRole')"
              path="roleCode"
              class="pr-24px"
            >
              <NSelect
                v-model:value="model.roleCode"
                :placeholder="$t('page.system.user.form.userRole')"
                :options="roleOptions"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi suffix span="24 s:12 m:6" class="pr-24px" data-testid="user-search-actions">
              <NSpace class="w-full" justify="end">
                <NButton @click="reset">
                  <template #icon>
                    <IconIcRoundRefresh class="text-icon" />
                  </template>
                  {{ $t('common.reset') }}
                </NButton>
                <NButton type="primary" ghost @click="search">
                  <template #icon>
                    <IconIcRoundSearch class="text-icon" />
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
