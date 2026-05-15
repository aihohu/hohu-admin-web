<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Icon } from '@iconify/vue';
import { enableStatusRecord, userGenderRecord } from '@/constants/business';
import { REG_PWD } from '@/constants/reg';
import { fetchChangePassword, fetchGetUserProfile, fetchUpdateUserProfile, fetchUploadFile } from '@/service/api';
import { useAuthStore } from '@/store/modules/auth';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { useRouterPush } from '@/hooks/common/router';
import { $t } from '@/locales';

defineOptions({
  name: 'ProfilePage'
});

const authStore = useAuthStore();
const { toLogin } = useRouterPush();
const { defaultRequiredRule } = useFormRules();
const { formRef: infoFormRef, validate: validateInfo } = useNaiveForm();
const { formRef: pwdFormRef, validate: validatePwd, restoreValidation: restorePwd } = useNaiveForm();

const PRESET_AVATARS = [
  'mdi:account',
  'mdi:account-circle',
  'mdi:cat',
  'mdi:dog',
  'mdi:fish',
  'mdi:bird',
  'mdi:robot',
  'mdi:alien',
  'mdi:panda',
  'mdi:ghost',
  'mdi:star',
  'mdi:flower'
];

const loading = ref(false);
const savingInfo = ref(false);
const changingPwd = ref(false);
const activeTab = ref('info');

const profile = ref<Api.SystemManage.UserProfile>({
  userId: '',
  userName: '',
  nickname: '',
  userGender: null,
  userPhone: '',
  userEmail: '',
  userAvatar: '',
  status: '1',
  roles: [],
  createTime: ''
});

const infoModel = reactive({
  nickname: '',
  userGender: null as Api.SystemManage.UserGender | null,
  userPhone: '',
  userEmail: ''
});

const pwdModel = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const genderOptions = [
  { label: $t(userGenderRecord['1']), value: '1' },
  { label: $t(userGenderRecord['2']), value: '2' },
  { label: $t(userGenderRecord['0']), value: '0' }
];

const infoRules = computed(() => ({
  nickname: defaultRequiredRule
}));

const pwdRules = computed(() => ({
  oldPassword: defaultRequiredRule,
  newPassword: [
    defaultRequiredRule,
    {
      pattern: REG_PWD,
      message: $t('form.pwd.invalid'),
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    defaultRequiredRule,
    {
      validator: (_rule: unknown, value: string) => {
        if (value !== pwdModel.newPassword) return new Error($t('page.profile.confirmPwdMismatch'));
        return true;
      },
      trigger: 'blur'
    }
  ]
}));

async function loadProfile() {
  loading.value = true;
  const { data, error } = await fetchGetUserProfile();
  loading.value = false;
  if (!error && data) {
    profile.value = data;
    infoModel.nickname = data.nickname || '';
    infoModel.userGender = data.userGender;
    infoModel.userPhone = data.userPhone || '';
    infoModel.userEmail = data.userEmail || '';
  }
}

async function handleSaveInfo() {
  await validateInfo();
  savingInfo.value = true;
  const { error } = await fetchUpdateUserProfile({
    nickname: infoModel.nickname,
    userGender: infoModel.userGender,
    userPhone: infoModel.userPhone || null,
    userEmail: infoModel.userEmail || null
  });
  savingInfo.value = false;
  if (!error) {
    window.$message?.success($t('common.updateSuccess'));
    loadProfile();
  }
}

async function handleChangePassword() {
  await validatePwd();
  changingPwd.value = true;
  const { error } = await fetchChangePassword({
    oldPassword: pwdModel.oldPassword,
    newPassword: pwdModel.newPassword
  });
  changingPwd.value = false;
  if (!error) {
    window.$message?.success($t('page.profile.passwordChangeSuccess'));
    authStore.resetStore();
    toLogin();
  }
}

function resetPwdForm() {
  pwdModel.oldPassword = '';
  pwdModel.newPassword = '';
  pwdModel.confirmPassword = '';
  restorePwd();
}

const avatarModalVisible = ref(false);

async function handleAvatarUpload({ file }: { file: any }) {
  const { data, error } = await fetchUploadFile(file.file as File, 'avatar');
  if (!error && data) {
    await saveAvatar(data.fileUrl);
  }
}

async function saveAvatar(avatar: string) {
  const { error } = await fetchUpdateUserProfile({ userAvatar: avatar });
  if (!error) {
    window.$message?.success($t('common.updateSuccess'));
    avatarModalVisible.value = false;
    loadProfile();
  }
}

onMounted(() => {
  loadProfile();
});
</script>

<template>
  <NSpace vertical :size="16" class="min-h-500px">
    <NGrid :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
      <!-- 左侧信息卡片 -->
      <NGi span="24 m:8">
        <NCard :bordered="false" class="card-wrapper h-full" :loading="loading">
          <div class="flex-col-center py-24px">
            <div class="relative mb-12px cursor-pointer" @click="avatarModalVisible = true">
              <NAvatar
                v-if="profile.userAvatar && profile.userAvatar.includes('://')"
                :size="72"
                round
                :src="profile.userAvatar"
              />
              <NAvatar v-else-if="profile.userAvatar" :size="72" round class="bg-primary">
                <Icon :icon="profile.userAvatar" class="text-36px text-white" />
              </NAvatar>
              <NAvatar v-else :size="72" round>
                {{ profile.userName?.charAt(0)?.toUpperCase() }}
              </NAvatar>
              <div
                class="absolute inset-0 flex-center rounded-full bg-black/30 opacity-0 transition-opacity hover:opacity-100"
              >
                <icon-ic-round-edit class="text-20px text-white" />
              </div>
            </div>
            <NText class="text-18px font-bold mb-4px">{{ profile.userName }}</NText>
            <NSpace :size="8" class="mb-16px">
              <NTag v-for="role in profile.roles" :key="role" type="primary" size="small">
                {{ role }}
              </NTag>
            </NSpace>
          </div>
          <NDivider style="margin: 0" />
          <NSpace vertical :size="0" class="px-4px py-12px">
            <div class="flex justify-between py-8px">
              <NText depth="3">{{ $t('page.system.user.userPhone') }}</NText>
              <NText>{{ profile.userPhone || '-' }}</NText>
            </div>
            <div class="flex justify-between py-8px">
              <NText depth="3">{{ $t('page.system.user.userEmail') }}</NText>
              <NText>{{ profile.userEmail || '-' }}</NText>
            </div>
            <div class="flex justify-between py-8px">
              <NText depth="3">{{ $t('page.system.user.userStatus') }}</NText>
              <NTag :type="profile.status === '1' ? 'success' : 'warning'" size="small">
                {{ $t(enableStatusRecord[profile.status as keyof typeof enableStatusRecord] || '') }}
              </NTag>
            </div>
            <div class="flex justify-between py-8px">
              <NText depth="3">{{ $t('page.profile.registerTime') }}</NText>
              <NText>{{ profile.createTime }}</NText>
            </div>
          </NSpace>
        </NCard>
      </NGi>

      <!-- 右侧 Tab -->
      <NGi span="24 m:16">
        <NCard :bordered="false" class="card-wrapper h-full">
          <NTabs v-model:value="activeTab" type="line" animated>
            <!-- 基本信息 -->
            <NTabPane name="info" :tab="$t('page.profile.baseInfo')">
              <NForm
                ref="infoFormRef"
                :model="infoModel"
                :rules="infoRules"
                label-placement="left"
                :label-width="80"
                class="mt-16px"
              >
                <NFormItem :label="$t('page.system.user.userName')" path="userName">
                  <NInput :value="profile.userName" disabled />
                </NFormItem>
                <NFormItem :label="$t('page.system.user.nickname')" path="nickname">
                  <NInput v-model:value="infoModel.nickname" :placeholder="$t('page.system.user.form.nickname')" />
                </NFormItem>
                <NFormItem :label="$t('page.system.user.userGender')" path="userGender">
                  <NRadioGroup v-model:value="infoModel.userGender">
                    <NRadio v-for="item in genderOptions" :key="item.value" :value="item.value" :label="item.label" />
                  </NRadioGroup>
                </NFormItem>
                <NFormItem :label="$t('page.system.user.userPhone')" path="userPhone">
                  <NInput v-model:value="infoModel.userPhone" :placeholder="$t('page.system.user.form.userPhone')" />
                </NFormItem>
                <NFormItem :label="$t('page.system.user.userEmail')" path="userEmail">
                  <NInput v-model:value="infoModel.userEmail" :placeholder="$t('page.system.user.form.userEmail')" />
                </NFormItem>
                <NDivider />
                <NSpace justify="end">
                  <NButton @click="loadProfile">{{ $t('common.reset') }}</NButton>
                  <NButton type="primary" :loading="savingInfo" @click="handleSaveInfo">
                    {{ $t('common.confirm') }}
                  </NButton>
                </NSpace>
              </NForm>
            </NTabPane>

            <!-- 修改密码 -->
            <NTabPane name="password" :tab="$t('page.system.user.resetPwd.title')">
              <NForm
                ref="pwdFormRef"
                :model="pwdModel"
                :rules="pwdRules"
                label-placement="left"
                :label-width="80"
                class="mt-16px"
              >
                <NFormItem :label="$t('page.profile.oldPassword')" path="oldPassword">
                  <NInput
                    v-model:value="pwdModel.oldPassword"
                    type="password"
                    show-password-on="click"
                    :placeholder="$t('page.profile.oldPasswordPlaceholder')"
                  />
                </NFormItem>
                <NFormItem :label="$t('page.profile.newPassword')" path="newPassword">
                  <NInput
                    v-model:value="pwdModel.newPassword"
                    type="password"
                    show-password-on="click"
                    :placeholder="$t('page.system.user.form.password')"
                  />
                </NFormItem>
                <NFormItem :label="$t('page.profile.confirmPassword')" path="confirmPassword">
                  <NInput
                    v-model:value="pwdModel.confirmPassword"
                    type="password"
                    show-password-on="click"
                    :placeholder="$t('page.profile.confirmPasswordPlaceholder')"
                  />
                </NFormItem>
                <NDivider />
                <NSpace justify="end">
                  <NButton @click="resetPwdForm">{{ $t('common.reset') }}</NButton>
                  <NButton type="primary" :loading="changingPwd" @click="handleChangePassword">
                    {{ $t('common.confirm') }}
                  </NButton>
                </NSpace>
              </NForm>
            </NTabPane>
          </NTabs>
        </NCard>
      </NGi>
    </NGrid>
    <!-- 头像选择弹窗 -->
    <NModal v-model:show="avatarModalVisible" preset="card" :title="$t('page.profile.changeAvatar')" class="w-400px">
      <NSpace vertical :size="16">
        <NText depth="3">{{ $t('page.profile.presetAvatar') }}</NText>
        <NGrid :cols="6" :x-gap="12" :y-gap="12">
          <NGi v-for="icon in PRESET_AVATARS" :key="icon">
            <div
              class="flex-center h-48px cursor-pointer rounded-md border-2 transition-colors"
              :class="profile.userAvatar === icon ? 'border-primary' : 'border-transparent hover:border-gray-300'"
              @click="saveAvatar(icon)"
            >
              <Icon :icon="icon" class="text-32px" />
            </div>
          </NGi>
        </NGrid>
        <NDivider style="margin: 0" />
        <NUpload accept="image/*" :max="1" :show-file-list="false" :custom-request="handleAvatarUpload">
          <NButton block>
            <template #icon>
              <icon-ic-round-cloud-upload class="text-icon" />
            </template>
            {{ $t('page.profile.uploadAvatar') }}
          </NButton>
        </NUpload>
      </NSpace>
    </NModal>
  </NSpace>
</template>

<style scoped></style>
