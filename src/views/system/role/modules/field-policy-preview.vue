<script setup lang="ts">
import type { PolicyPreview } from '@/service/api/user-field-policy';
import { $t } from '@/locales';
defineProps<{ preview: PolicyPreview }>();
function describe(value: PolicyPreview['changes'][number]['before']) {
  return value ? `${$t(`fieldPolicy.${value.effect}`)} / ${$t(`fieldPolicy.${value.read}`)}` : $t('fieldPolicy.unset');
}
</script>

<template>
  <section class="my-4" :aria-label="$t('fieldPolicy.preview')">
    <NAlert type="info" class="mb-3">{{ $t('fieldPolicy.previewHint') }}</NAlert>
    <p v-if="!preview.changes.length">{{ $t('fieldPolicy.noChanges') }}</p>
    <ul class="flex flex-col gap-3">
      <li v-for="change in preview.changes" :key="`${change.fieldId}:${change.purpose}:${change.operation}`">
        <strong>{{ $t(`fieldPolicy.${change.fieldId}`) }}</strong>
        / {{ $t(`fieldPolicy.${change.purpose.replaceAll('.', '_')}`) }} / {{ $t(`fieldPolicy.${change.operation}`) }}
        <p>
          {{ $t('fieldPolicy.before') }}: {{ describe(change.before) }}; {{ $t('fieldPolicy.after') }}:
          {{ describe(change.after) }}
        </p>
      </li>
    </ul>
    <h3 class="mt-4 font-semibold">{{ $t('fieldPolicy.effectiveSamples') }}</h3>
    <p class="my-2 text-sm">{{ $t('fieldPolicy.sampleHint') }}</p>
    <p v-if="preview.samplesTruncated">{{ $t('fieldPolicy.samplesTruncated') }}</p>
    <div class="max-h-80 overflow-auto">
      <table class="w-full text-left text-sm">
        <thead>
          <tr>
            <th>{{ $t('fieldPolicy.subject') }}</th>
            <th>{{ $t('fieldPolicy.record') }}</th>
            <th>{{ $t('fieldPolicy.field') }}</th>
            <th>{{ $t('fieldPolicy.operation') }}</th>
            <th>{{ $t('fieldPolicy.before') }}</th>
            <th>{{ $t('fieldPolicy.after') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="sample in preview.effectiveSamples"
            :key="`${sample.subjectUserId}:${sample.recordUserId}:${sample.fieldId}:${sample.purpose}:${sample.operation}`"
          >
            <td>{{ sample.subjectUserId }}</td>
            <td>{{ sample.recordUserId }}</td>
            <td>{{ $t(`fieldPolicy.${sample.fieldId}`) }}</td>
            <td>{{ $t(`fieldPolicy.${sample.operation}`) }}</td>
            <td>
              {{ $t(`fieldPolicy.${sample.before.allowed ? 'allow' : 'deny'}`) }} /
              {{ $t(`fieldPolicy.${sample.before.read}`) }}
            </td>
            <td>
              {{ $t(`fieldPolicy.${sample.after.allowed ? 'allow' : 'deny'}`) }} /
              {{ $t(`fieldPolicy.${sample.after.read}`) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
