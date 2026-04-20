<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAppStore } from '@/store/modules/app';
import HeaderBanner from './modules/header-banner.vue';
import CardData from './modules/card-data.vue';
import LineChart from './modules/line-chart.vue';
import PieChart from './modules/pie-chart.vue';

const appStore = useAppStore();

const gap = computed(() => (appStore.isMobile ? 0 : 16));

// ====== 文件上传演示 ======
const singleFileId = ref<string>();
const multiFileIds = ref<string[]>([]);
const singleImageId = ref<string>();
const multiImageIds = ref<string[]>([]);
</script>

<template>
  <NSpace vertical :size="16">
    <NAlert :title="$t('common.tip')" type="warning">
      {{ $t('page.home.branchDesc') }}
    </NAlert>
    <HeaderBanner />
    <CardData />
    <NGrid :x-gap="gap" :y-gap="16" responsive="screen" item-responsive>
      <NGi span="24 s:24 m:14">
        <NCard :bordered="false" class="card-wrapper">
          <LineChart />
        </NCard>
      </NGi>
      <NGi span="24 s:24 m:10">
        <NCard :bordered="false" class="card-wrapper">
          <PieChart />
        </NCard>
      </NGi>
    </NGrid>

    <!-- 文件上传演示（临时） -->
    <NCard title="文件上传组件演示" :bordered="false">
      <NSpace vertical :size="24">
        <!-- 单文件上传 -->
        <div>
          <NText strong>单文件上传（text 列表）</NText>
          <div class="mt-8px">
            <FileUpload v-model:value="singleFileId" />
          </div>
          <NText depth="3" class="mt-4px block">fileId: {{ singleFileId ?? '未上传' }}</NText>
        </div>

        <!-- 多文件上传 -->
        <div>
          <NText strong>多文件上传（text 列表，最多 3 个）</NText>
          <div class="mt-8px">
            <FileUpload v-model:value="multiFileIds" multiple :max="3" />
          </div>
          <NText depth="3" class="mt-4px block">
            fileIds: {{ multiFileIds.length ? multiFileIds.join(', ') : '未上传' }}
          </NText>
        </div>

        <!-- 单图上传 -->
        <div>
          <NText strong>单图上传（image-card）</NText>
          <div class="mt-8px">
            <FileUpload v-model:value="singleImageId" accept="image/*" list-type="image-card" :max="1" />
          </div>
          <NText depth="3" class="mt-4px block">fileId: {{ singleImageId ?? '未上传' }}</NText>
        </div>

        <!-- 多图上传 -->
        <div>
          <NText strong>多图上传（image-card，最多 4 张）</NText>
          <div class="mt-8px">
            <FileUpload v-model:value="multiImageIds" accept="image/*" list-type="image-card" :max="4" multiple />
          </div>
          <NText depth="3" class="mt-4px block">
            fileIds: {{ multiImageIds.length ? multiImageIds.join(', ') : '未上传' }}
          </NText>
        </div>
      </NSpace>
    </NCard>
  </NSpace>
</template>

<style scoped></style>
