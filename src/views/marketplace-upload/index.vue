<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import type { UploadFileInfo } from 'naive-ui';
import { $t } from '@/locales';
import { uploadApp } from '@/service/api/marketplace';

const router = useRouter();
const fileRef = ref<File | null>(null);
const fileList = ref<UploadFileInfo[]>([]);
const manifestText = ref('');
const uploading = ref(false);

const defaultManifest = `{
  "name": "My App",
  "slug": "my-app",
  "version": "1.0.0",
  "type": "lowcode",
  "category": "business",
  "description": "App description",
  "data_schema": {
    "type": "object",
    "properties": {
      "name": { "type": "string", "title": "Name", "default": "" }
    },
    "required": ["name"]
  },
  "pages": [
    { "key": "list", "title": "List", "page_type": "table" },
    { "key": "form", "title": "Form", "page_type": "form" }
  ],
  "menu": { "title": "My App", "icon": "PeopleOutline" }
}`;

function onFileChange(options: { file: UploadFileInfo; fileList: UploadFileInfo[] }) {
  fileList.value = options.fileList;
  fileRef.value = options.file.file || null;
}

async function onUpload() {
  if (!fileRef.value) {
    window.$message?.warning($t('page.marketplace.messages.selectPackage'));
    return;
  }
  if (!manifestText.value.trim()) {
    window.$message?.warning($t('page.marketplace.messages.fillManifest'));
    return;
  }

  // Validate JSON
  try {
    JSON.parse(manifestText.value);
  } catch {
    window.$message?.error($t('page.marketplace.messages.invalidJson'));
    return;
  }

  uploading.value = true;
  try {
    const { error } = await uploadApp(fileRef.value, manifestText.value);
    if (error) {
      window.$message?.error(error.message || $t('page.marketplace.messages.uploadFailed'));
    } else {
      window.$message?.success($t('page.marketplace.messages.uploadSuccess'));
      router.push('/marketplace');
    }
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <div class="p-4">
    <NCard :title="$t('page.marketplace.upload.title')">
      <NSpace vertical size="large">
        <!-- File upload -->
        <NUpload
          v-model:file-list="fileList"
          :max="1"
          accept=".zip"
          :default-upload="false"
          data-testid="upload-file-input"
          @change="onFileChange"
        >
          <NUploadDragger data-testid="upload-dropzone">
            <div class="text-center py-4">
              <p class="text-lg">{{ $t('page.marketplace.upload.dropzoneTitle') }}</p>
              <p class="text-gray-400 text-sm mt-2">{{ $t('page.marketplace.upload.dropzoneDesc') }}</p>
            </div>
          </NUploadDragger>
        </NUpload>

        <!-- Manifest editor -->
        <div>
          <p class="font-bold mb-2">{{ $t('page.marketplace.upload.manifestTitle') }}</p>
          <NInput
            v-model:value="manifestText"
            type="textarea"
            :placeholder="defaultManifest"
            :rows="20"
            data-testid="upload-manifest-input"
            style="font-family: monospace"
          />
        </div>

        <!-- Submit -->
        <NSpace>
          <NButton type="primary" size="large" :loading="uploading" data-testid="upload-submit-btn" @click="onUpload">
            {{ $t('page.marketplace.upload.submit') }}
          </NButton>
        </NSpace>
      </NSpace>
    </NCard>
  </div>
</template>
