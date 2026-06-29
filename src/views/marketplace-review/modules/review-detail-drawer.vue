<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { $t } from '@/locales';
import { fetchReviewDetail, approveReview, rejectReview, type Review } from '@/service/api/marketplace';

defineOptions({
  name: 'ReviewDetailDrawer'
});

interface Props {
  visible: boolean;
  reviewId: string | null;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:visible', visible: boolean): void;
  (e: 'reviewed'): void;
}>();

const loading = ref(false);
const detail = ref<Review.Detail | null>(null);
const actionLoading = ref(false);
const showRejectForm = ref(false);
const rejectComment = ref('');

const drawerVisible = computed({
  get: () => props.visible,
  set: v => emit('update:visible', v)
});

const manifestText = computed(() => {
  if (!detail.value) return '';
  return JSON.stringify(detail.value.manifest, null, 2);
});

watch(
  () => props.reviewId,
  async id => {
    if (id && props.visible) {
      await loadDetail(id);
    }
  }
);

watch(
  () => props.visible,
  v => {
    if (v && props.reviewId && !detail.value) {
      loadDetail(props.reviewId);
    }
    if (!v) {
      // reset on close
      detail.value = null;
      showRejectForm.value = false;
      rejectComment.value = '';
    }
  }
);

async function loadDetail(id: string) {
  loading.value = true;
  try {
    const { data, error } = await fetchReviewDetail(id);
    if (!error) {
      detail.value = data;
    }
  } finally {
    loading.value = false;
  }
}

async function onApprove() {
  if (!detail.value) return;
  actionLoading.value = true;
  try {
    const { error } = await approveReview(detail.value.id);
    if (!error) {
      window.$message?.success($t('page.marketplace.review.msgApproveSuccess'));
      emit('reviewed');
      drawerVisible.value = false;
    }
  } finally {
    actionLoading.value = false;
  }
}

async function onConfirmReject() {
  if (!detail.value) return;
  actionLoading.value = true;
  try {
    const { error } = await rejectReview(detail.value.id, rejectComment.value);
    if (!error) {
      window.$message?.success($t('page.marketplace.review.msgRejectSuccess'));
      emit('reviewed');
      drawerVisible.value = false;
    }
  } finally {
    actionLoading.value = false;
  }
}
</script>

<template>
  <NDrawer v-model:show="drawerVisible" :width="720" data-testid="review-detail-drawer">
    <NDrawerContent :title="$t('page.marketplace.review.title')" closable :native-scrollbar="false">
      <NSpin :show="loading">
        <div v-if="detail" class="flex flex-col gap-16px">
          <!-- Header info -->
          <NDescriptions label-placement="left" :column="2" bordered size="small">
            <NDescriptionsItem :label="$t('page.marketplace.review.colApp')">
              {{ detail.appName }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('page.marketplace.installed.colApp')">
              {{ detail.appSlug }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('page.marketplace.review.colVersion')">
              {{ detail.version }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('page.marketplace.review.colStatus')">
              <NTag size="small">{{ detail.finalStatus }}</NTag>
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('page.marketplace.review.colRisk')">
              {{ detail.aiRiskLevel || '-' }}
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('page.marketplace.review.colCreatedAt')">
              {{ detail.createdAt }}
            </NDescriptionsItem>
          </NDescriptions>

          <!-- Changelog -->
          <NCard v-if="detail.changelog" size="small" :bordered="true">
            <p class="font-bold mb-2">{{ $t('page.marketplace.review.changelogTitle') }}</p>
            <p>{{ detail.changelog }}</p>
          </NCard>

          <!-- Previous review comment -->
          <NCard v-if="detail.humanComment" size="small" :bordered="true">
            <p class="font-bold mb-2">{{ $t('page.marketplace.review.previousCommentTitle') }}</p>
            <p>{{ detail.humanComment }}</p>
          </NCard>

          <!-- Manifest -->
          <NCard size="small" :bordered="true">
            <p class="font-bold mb-2">{{ $t('page.marketplace.review.manifestTitle') }}</p>
            <NCode :code="manifestText" language="json" data-testid="review-detail-manifest" />
          </NCard>

          <!-- Reject form (collapsible) -->
          <NCard v-if="showRejectForm" size="small" :bordered="true">
            <p class="font-bold mb-2">{{ $t('page.marketplace.review.rejectTitle') }}</p>
            <NInput
              v-model:value="rejectComment"
              type="textarea"
              :rows="3"
              :placeholder="$t('page.marketplace.review.rejectPlaceholder')"
              data-testid="review-detail-reject-comment"
            />
          </NCard>
        </div>
        <NEmpty v-else :description="$t('page.marketplace.review.notFound')" class="py-20" />
      </NSpin>

      <template #footer>
        <NSpace v-if="detail && detail.finalStatus === 'pending'">
          <NButton quaternary @click="drawerVisible = false">
            {{ $t('common.close') }}
          </NButton>
          <NButton
            v-if="!showRejectForm"
            type="error"
            ghost
            data-testid="review-detail-start-reject"
            @click="showRejectForm = true"
          >
            {{ $t('page.marketplace.review.btnReject') }}
          </NButton>
          <template v-else>
            <NButton @click="showRejectForm = false">{{ $t('common.cancel') }}</NButton>
            <NButton
              type="error"
              :loading="actionLoading"
              data-testid="review-detail-confirm-reject"
              @click="onConfirmReject"
            >
              {{ $t('page.marketplace.review.btnConfirmReject') }}
            </NButton>
          </template>
          <NButton
            v-if="!showRejectForm"
            type="success"
            :loading="actionLoading"
            data-testid="review-detail-approve"
            @click="onApprove"
          >
            {{ $t('page.marketplace.review.btnApprove') }}
          </NButton>
        </NSpace>
        <NSpace v-else>
          <NButton quaternary @click="drawerVisible = false">{{ $t('common.close') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
