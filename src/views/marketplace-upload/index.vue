<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import type { UploadFileInfo } from 'naive-ui';
import { uploadApp } from '@/service/api/marketplace';

defineOptions({ name: 'MarketplaceUpload', meta: { title: '上传应用', i18nKey: 'route.marketplace_upload' } });

const router = useRouter();
const fileRef = ref<File | null>(null);
const fileList = ref<UploadFileInfo[]>([]);
const manifestText = ref('');
const uploading = ref(false);

const defaultManifest = `{
  "name": "我的应用",
  "slug": "my-app",
  "version": "1.0.0",
  "type": "lowcode",
  "category": "business",
  "description": "应用描述",
  "data_schema": {
    "type": "object",
    "properties": {
      "name": { "type": "string", "title": "名称", "default": "" }
    },
    "required": ["name"]
  },
  "pages": [
    { "key": "list", "title": "列表", "page_type": "table" },
    { "key": "form", "title": "表单", "page_type": "form" }
  ],
  "menu": { "title": "我的应用", "icon": "PeopleOutline" }
}`;

function onFileChange(options: { file: UploadFileInfo; fileList: UploadFileInfo[] }) {
  fileList.value = options.fileList;
  fileRef.value = options.file.file || null;
}

async function onUpload() {
  if (!fileRef.value) {
    window.$message?.warning('请选择应用包');
    return;
  }
  if (!manifestText.value.trim()) {
    window.$message?.warning('请填写 manifest');
    return;
  }

  // Validate JSON
  try {
    JSON.parse(manifestText.value);
  } catch {
    window.$message?.error('manifest JSON 格式错误');
    return;
  }

  uploading.value = true;
  try {
    const { error } = await uploadApp(fileRef.value, manifestText.value);
    if (error) {
      window.$message?.error(error.message || '上传失败');
    } else {
      window.$message?.success('上传成功，等待审核');
      router.push('/marketplace');
    }
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <div class="p-4">
    <NCard title="上传应用包">
      <NSpace vertical size="large">
        <!-- File upload -->
        <NUpload v-model:file-list="fileList" :max="1" accept=".zip" :default-upload="false" @change="onFileChange">
          <NUploadDragger>
            <div class="text-center py-4">
              <p class="text-lg">点击或拖拽上传 .zip 应用包</p>
              <p class="text-gray-400 text-sm mt-2">包内必须包含 app.json</p>
            </div>
          </NUploadDragger>
        </NUpload>

        <!-- Manifest editor -->
        <div>
          <p class="font-bold mb-2">Manifest (JSON)</p>
          <NInput
            v-model:value="manifestText"
            type="textarea"
            :placeholder="defaultManifest"
            :rows="20"
            style="font-family: monospace"
          />
        </div>

        <!-- Submit -->
        <NSpace>
          <NButton type="primary" size="large" :loading="uploading" @click="onUpload">上传</NButton>
        </NSpace>
      </NSpace>
    </NCard>
  </div>
</template>
