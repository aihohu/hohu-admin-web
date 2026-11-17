<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { fetchGetDeptUsers, fetchUpdateDeptUsers } from '@/service/api';
import { fieldCapability, fieldRead } from '@/hooks/business/user-field-draft';
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
onScopeDispose(() => {
  loadGeneration += 1;
});

/** final member user ids (NTransfer target) */
const memberIds = ref<string[]>([]);

/** NTransfer options — all enabled users, members are moved to the right column */
const transferOptions = computed(() =>
  users.value.map(u => ({
    label: u.nickname && fieldRead(u, 'nickname') === 'plain' ? `${u.userName} (${u.nickname})` : u.userName!,
    value: u.userId,
    disabled: u.isPrimary
  }))
);

const memberCount = computed(() => memberIds.value.length);

async function loadData() {
  const generation = ++loadGeneration;
  const deptId = props.deptId;
  loading.value = true;
  loadedSuccessfully.value = false;
  try {
    const records: Api.SystemManage.DeptUserItem[] = [];
    let current = 1;
    let hasMore = true;
    let epoch: string | undefined;
    let total: number | undefined;
    const seen = new Set<string>();
    do {
      const { error, data } = await fetchGetDeptUsers(deptId, {
        current,
        size: 100
      });
      if (error || !data || generation !== loadGeneration) return;
      if (
        data.current !== current ||
        data.size !== 100 ||
        !Number.isInteger(data.total) ||
        data.total < 0 ||
        data.total > 10000 ||
        current > 100
      )
        return;
      if (typeof data.authorizationEpoch !== 'string' || !/^[1-9][0-9]{0,18}$/.test(data.authorizationEpoch)) return;
      if (epoch !== undefined && (epoch !== data.authorizationEpoch || total !== data.total)) return;
      epoch = data.authorizationEpoch;
      total = data.total;
      if (
        !Array.isArray(data.records) ||
        data.records.length !== Math.min(100, Math.max(0, total - (current - 1) * 100))
      )
        return;
      if (
        data.records.some(
          user =>
            typeof user.isMember !== 'boolean' ||
            typeof user.isPrimary !== 'boolean' ||
            !Object.hasOwn(user, 'fieldAccess') ||
            fieldRead(user, 'departments') !== 'plain' ||
            !fieldCapability(user, 'departments', 'replace') ||
            typeof user.userName !== 'string' ||
            !user.userName ||
            fieldRead(user, 'userName') !== 'plain' ||
            typeof user.userId !== 'string' ||
            seen.has(user.userId)
        )
      )
        return;
      for (const user of data.records) seen.add(user.userId);
      records.push(...data.records);
      hasMore = data.current * data.size < data.total;
      current = data.current + 1;
    } while (hasMore);

    if (generation === loadGeneration && records.length === total && seen.size === total) {
      users.value = records;
      memberIds.value = records.filter(user => user.isMember).map(user => user.userId);
      loadedSuccessfully.value = true;
    }
  } catch {
    // A failed page invalidates the whole replacement session.
  } finally {
    if (generation === loadGeneration) loading.value = false;
  }
}

async function handleSubmit() {
  if (loading.value || submitting.value || !loadedSuccessfully.value) return;
  const generation = loadGeneration;
  const deptId = props.deptId;
  const available = new Set(users.value.map(user => user.userId));
  if (new Set(memberIds.value).size !== memberIds.value.length || memberIds.value.some(id => !available.has(id)))
    return;
  submitting.value = true;
  try {
    const { error, response } = await fetchUpdateDeptUsers(deptId, {
      userIds: [...memberIds.value]
    });
    if (generation !== loadGeneration || !visible.value) return;
    if (!error) {
      const msg = response?.data?.msg || $t('common.modifySuccess');
      window.$message?.success(msg);
      visible.value = false;
      emit('updated');
    }
  } finally {
    if (generation === loadGeneration) submitting.value = false;
  }
}

watch(
  [visible, () => props.deptId],
  ([val]) => {
    submitting.value = false;
    if (val) {
      users.value = [];
      memberIds.value = [];
      loadData();
    } else {
      loadGeneration += 1;
      loading.value = false;
      loadedSuccessfully.value = false;
    }
  },
  { immediate: true, flush: 'sync' }
);
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
      <NAlert v-if="!loading && !loadedSuccessfully" type="warning" class="mb-3">
        {{ $t('fieldPolicy.relationUnavailable') }}
      </NAlert>
      <div class="mb-8px text-gray-500">
        {{ $t('page.system.dept.manageUsersTip', { count: memberCount }) }}
      </div>
      <NTransfer
        v-model:value="memberIds"
        :disabled="loading || submitting || !loadedSuccessfully"
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
