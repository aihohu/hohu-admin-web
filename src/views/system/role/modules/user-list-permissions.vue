<script setup lang="ts">
import { computed, h, nextTick, ref, shallowRef, watch } from 'vue';
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NCheckboxGroup,
  NEmpty,
  NRadioButton,
  NRadioGroup,
  NSpace,
  NTree
} from 'naive-ui';
import type { TreeOption } from 'naive-ui';
import { fetchGetMenuTree, fetchGetRoleMenuList } from '@/service/api';
import { $t, localizedText } from '@/locales';

type Policy = Api.FieldManagement.ListPolicy;
type Purpose = keyof Api.FieldManagement.FieldSelections;
const props = defineProps<{
  document: Api.FieldManagement.Document;
  policy: Policy | null;
  disabled: boolean;
  canMenu: boolean;
}>();
const emit = defineEmits<{ change: [policy: Policy]; menu: [] }>();
const label = (key: string) => $t(`fieldPolicy.${key}`);
const purpose = shallowRef<Purpose>('read');
const open = shallowRef(false);
const switching = shallowRef<Policy['mode'] | null>(null);
const tree = shallowRef<Api.SystemManage.MenuTree[]>([]);
const checked = shallowRef<string[]>([]);
const heading = ref<HTMLElement>();
const openButton = ref<InstanceType<typeof NButton>>();
const selection = computed(() => props.policy?.[purpose.value] ?? []);
const options = computed(() => props.document.listFields?.[purpose.value] ?? []);
const sensitiveOptions = computed(() => (props.document.sensitiveFields ?? []).filter(f => options.value.includes(f)));
const assigned = computed(() => new Set(checked.value));
const listMenus = computed(() => new Set(props.document.listMenuIds ?? []));
let lastOpener: HTMLElement | null = null;
function menuCheck({ option }: { option: TreeOption }) {
  return h(NCheckbox, {
    checked: assigned.value.has(String(option.id)),
    disabled: true,
    'aria-label': String(option.label ?? option.id)
  });
}
function menuAction({ option }: { option: TreeOption }) {
  const id = String(option.id);
  const target = (['create', 'update', 'read'] as const).find(key => props.document.actionMenuIds?.[key]?.includes(id));
  if (!target && !listMenus.value.has(id)) return null;
  return h(
    NButton,
    {
      text: true,
      type: 'primary',
      size: 'small',
      onClick: (event: MouseEvent) => {
        event.stopPropagation();
        lastOpener = event.currentTarget as HTMLElement;
        purpose.value = target ?? 'read';
        void toggle(true);
      }
    },
    () => label('title')
  );
}
function translate(nodes: Api.SystemManage.MenuTree[]): Api.SystemManage.MenuTree[] {
  return nodes.map(node => ({
    ...node,
    label: localizedText(node.label, node.i18nKey),
    children: node.children && translate(node.children)
  }));
}
watch(
  () => [props.document, props.canMenu] as const,
  async ([doc, canMenu], _, cleanup) => {
    let current = true;
    cleanup(() => {
      current = false;
    });
    tree.value = [];
    checked.value = [];
    lastOpener = null;
    switching.value = null;
    if (!canMenu) return;
    const [menu, role] = await Promise.all([fetchGetMenuTree(), fetchGetRoleMenuList(doc.role.roleId)]);
    if (current && !menu.error && !role.error && Array.isArray(menu.data) && Array.isArray(role.data)) {
      tree.value = translate(menu.data);
      checked.value = role.data;
    }
  },
  { immediate: true }
);

async function toggle(show: boolean) {
  open.value = show;
  await nextTick();
  if (show) heading.value?.focus();
  else if (lastOpener?.isConnected) lastOpener.focus();
  else openButton.value?.$el.focus();
}
function choose(copy: boolean) {
  const mode = switching.value;
  if (!mode || props.disabled) return;
  const start = copy
    ? props.document.copyFields
    : {
        read: [],
        query: [],
        ...(props.document.listFields?.create ? { create: [] } : {}),
        ...(props.document.listFields?.update ? { update: [] } : {})
      };
  if (!start) return;
  emit('change', {
    mode,
    read: [...start.read],
    query: [...start.query],
    ...(start.create ? { create: [...start.create] } : {}),
    ...(start.update ? { update: [...start.update] } : {})
  });
  switching.value = null;
}
function selectSensitive(values: (string | number)[]) {
  if (!props.policy || props.disabled) return;
  const sensitive = {
    read: [],
    query: [],
    ...props.policy.sensitive,
    [purpose.value]: values.map(String).sort()
  };
  emit('change', { ...props.policy, [purpose.value]: selection.value, sensitive });
}
function selectFields(values: (string | number)[]) {
  if (props.policy && !props.disabled)
    emit('change', {
      ...props.policy,
      [purpose.value]: values.map(String).sort()
    });
}
</script>

<template>
  <div class="permissions-grid">
    <NCard size="small" :title="$t('page.system.role.menuAuth')">
      <template #header-extra>
        <NButton v-if="canMenu" text type="primary" size="small" @click="emit('menu')">{{ $t('common.edit') }}</NButton>
      </template>
      <NTree
        v-if="tree.length"
        :data="tree"
        key-field="id"
        :selectable="false"
        :render-prefix="menuCheck"
        :render-suffix="menuAction"
        show-line
        class="menu-tree"
      />
      <p>
        {{ label('system_user') }} ·
        {{ document.listActionGranted ? label('userListGranted') : label('userListMissing') }}
      </p>
      <NButton
        ref="openButton"
        size="small"
        :aria-expanded="open"
        @click="
          lastOpener = null;
          toggle(true);
        "
      >
        {{ label('title') }}
      </NButton>
    </NCard>
    <NCard size="small" :title="label('title')">
      <template #header-extra>
        <NButton v-if="open" text size="small" @click="toggle(false)">{{ label('collapseFields') }}</NButton>
      </template>
      <div v-show="open">
        <h3 ref="heading" tabindex="-1" class="mb-3 text-base">
          {{ label('system_user') }}
        </h3>
        <NSpace class="mb-3">
          <NButton
            v-for="mode in ['restrict_selected', 'allow_selected'] as const"
            :key="mode"
            size="small"
            :type="policy?.mode === mode ? 'primary' : 'default'"
            :aria-pressed="policy?.mode === mode"
            :disabled="disabled"
            @click="switching = mode"
          >
            {{ label(mode) }}
          </NButton>
        </NSpace>
        <NAlert v-if="switching" class="mb-3" :title="label(switching)" type="info">
          <p>
            {{ label(switching === 'allow_selected' ? 'allowStart' : 'restrictStart') }}
          </p>
          <NSpace class="mt-2">
            <NButton size="small" @click="choose(false)">
              {{ label(switching === 'allow_selected' ? 'startBlank' : 'startFollow') }}
            </NButton>
            <NButton
              v-if="switching === 'allow_selected'"
              :disabled="!document.copyFields"
              size="small"
              @click="choose(true)"
            >
              {{ label('copyEffective') }}
            </NButton>
            <NButton size="small" @click="switching = null">{{ $t('common.cancel') }}</NButton>
          </NSpace>
        </NAlert>
        <template v-if="policy">
          <NRadioGroup v-model:value="purpose" :aria-label="label('purpose')" size="small">
            <NRadioButton value="read">{{ label('read') }}</NRadioButton>
            <NRadioButton value="query">{{ label('query') }}</NRadioButton>
            <NRadioButton v-if="document.listFields?.create" value="create">{{ label('create') }}</NRadioButton>
            <NRadioButton v-if="document.listFields?.update" value="update">{{ label('update') }}</NRadioButton>
          </NRadioGroup>
          <p v-if="policy[purpose] === undefined" class="my-3">{{ label('explicitWriteRules') }}</p>
          <p class="my-3">
            {{ label(policy.mode === 'restrict_selected' ? 'restrictedCount' : 'allowedCount') }}
            {{ selection.length }} / {{ options.length }}
          </p>
          <NCheckboxGroup :value="selection" :disabled="disabled || !!switching" @update:value="selectFields">
            <NSpace vertical>
              <NCheckbox
                v-for="field in options"
                :key="field"
                :value="field"
                :disabled="policy.sensitive?.[purpose]?.includes(field)"
              >
                {{ label(field) }}
              </NCheckbox>
            </NSpace>
          </NCheckboxGroup>
          <template v-if="policy.mode === 'restrict_selected' && sensitiveOptions.length">
            <p class="my-3">{{ label('explicitSensitive') }}</p>
            <NCheckboxGroup
              :value="policy.sensitive?.[purpose] ?? []"
              :disabled="disabled || !!switching"
              @update:value="selectSensitive"
            >
              <NSpace vertical>
                <NCheckbox
                  v-for="field in sensitiveOptions"
                  :key="field"
                  :value="field"
                  :disabled="selection.includes(field)"
                >
                  {{ label(field) }}
                </NCheckbox>
              </NSpace>
            </NCheckboxGroup>
          </template>
        </template>
      </div>
      <NEmpty v-if="!open" :description="label('openFieldsHint')" />
    </NCard>
  </div>
</template>

<style scoped>
.menu-tree {
  max-height: 30rem;
  overflow: auto;
  scrollbar-gutter: stable;
}
.permissions-grid {
  display: grid;
  gap: 16px;
  align-items: stretch;
  margin-bottom: 16px;
}
@media (min-width: 1100px) {
  .permissions-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}
</style>
