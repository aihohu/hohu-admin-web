<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { fetchGetDeptUsers, fetchUpdateDeptUsers } from '@/service/api';
import { $t } from '@/locales';

defineOptions({
  name: 'DeptUsersModal'
});

interface Props {
  /** the dept id */
  deptId: string;
  /** the dept name from the scoped tree row */
  deptName: string;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'updated'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const loading = ref(false);
const submitting = ref(false);
const loadedSuccessfully = ref(false);
const users = ref<Api.SystemManage.DeptUserItem[]>([]);
let loadGeneration = 0;

/** final member user ids (NTransfer target) */
const memberIds = ref<string[]>([]);

/** NTransfer options — all enabled users, members are moved to the right column */
const transferOptions = computed(() =>
  users.value.map(u => ({
    label: u.nickname ? `${u.userName} (${u.nickname})` : u.userName,
    value: u.userId,
    disabled: u.isPrimary
  }))
);

const memberCount = computed(() => memberIds.value.length);

async function loadData() {
  const generation = ++loadGeneration;
  loading.value = true;
  loadedSuccessfully.value = false;
  try {
    const records: Api.SystemManage.DeptUserItem[] = [];
    let current = 1;
    let hasMore = true;
    do {
      const { error, data } = await fetchGetDeptUsers(props.deptId, {
        current,
        size: 100
      });
      if (error || !data || generation !== loadGeneration) return;
      records.push(...data.records);
      hasMore = data.current * data.size < data.total;
      current = data.current + 1;
    } while (hasMore);

    if (generation === loadGeneration) {
      users.value = records;
      memberIds.value = records.filter(user => user.isMember).map(user => user.userId);
      loadedSuccessfully.value = true;
    }
  } finally {
    if (generation === loadGeneration) loading.value = false;
  }
}

async function handleSubmit() {
  if (loading.value || submitting.value || !loadedSuccessfully.value) return;
  submitting.value = true;
  try {
    const { error, response } = await fetchUpdateDeptUsers(props.deptId, {
      userIds: memberIds.value
    });
    if (!error) {
      const msg = response?.data?.msg || $t('common.modifySuccess');
      window.$message?.success(msg);
      visible.value = false;
      emit('updated');
    }
  } finally {
    submitting.value = false;
  }
}

watch(visible, val => {
  if (val) {
    users.value = [];
    memberIds.value = [];
    loadData();
  } else {
    loadGeneration += 1;
    loading.value = false;
    loadedSuccessfully.value = false;
  }
});
</script>

<template>
  <NModal
    v-model:show="visible"
    :title="$t('page.system.dept.manageUsers') + (props.deptName ? ` - ${props.deptName}` : '')"
    preset="card"
    class="w-640px"
    :mask-closable="false"
  >
    <NSpin :show="loading">
      <div class="mb-8px text-gray-500">
        {{ $t('page.system.dept.manageUsersTip', { count: memberCount }) }}
      </div>
      <NTransfer
        v-model:value="memberIds"
        :options="transferOptions"
        :source-title="$t('page.system.dept.candidateUsers')"
        :target-title="$t('page.system.dept.deptMembers')"
        source-filterable
        target-filterable
        :source-filter-placeholder="$t('page.system.dept.searchUser')"
        :target-filter-placeholder="$t('page.system.dept.searchMember')"
        class="h-400px"
      />
    </NSpin>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="visible = false">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" :loading="submitting" :disabled="loading || !loadedSuccessfully" @click="handleSubmit">
          {{ $t('common.confirm') }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
