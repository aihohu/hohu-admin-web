<script setup lang="tsx">
import { computed, ref, watch } from 'vue';
import type { SelectOption } from 'naive-ui';
import { enableStatusOptions, menuIconTypeOptions, menuTypeOptions } from '@/constants/business';
import { fetchGetMenuTree, fetchSaveMenu, fetchUpdateMenu } from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { getLocalIcons } from '@/utils/icon';
import { $t } from '@/locales';
import IconPicker from '@/components/custom/icon-picker.vue';
import SvgIcon from '@/components/custom/svg-icon.vue';
import {
  getLayoutAndPage,
  getPathParamFromRoutePath,
  getRoutePathByRouteName,
  getRoutePathWithParam,
  transformLayoutAndPageToComponent
} from './shared';

defineOptions({
  name: 'MenuOperateModal'
});

export type OperateType = NaiveUI.TableOperateType | 'addChild';

interface Props {
  /** the type of operation */
  operateType: OperateType;
  /** the edit menu data or the parent menu data when adding a child menu */
  rowData?: Api.SystemManage.Menu | null;
  /** all pages */
  allPages: string[];
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<OperateType, string> = {
    add: $t('page.system.menu.addMenu'),
    addChild: $t('page.system.menu.addChildMenu'),
    edit: $t('page.system.menu.editMenu')
  };
  return titles[props.operateType];
});

type Model = Pick<
  Api.SystemManage.Menu,
  | 'menuType'
  | 'menuName'
  | 'routeName'
  | 'routePath'
  | 'component'
  | 'order'
  | 'i18nKey'
  | 'icon'
  | 'iconType'
  | 'status'
  | 'parentId'
  | 'keepAlive'
  | 'constant'
  | 'href'
  | 'hideInMenu'
  | 'activeMenu'
  | 'multiTab'
  | 'fixedIndexInTab'
> & {
  query: NonNullable<Api.SystemManage.Menu['query']>;
  buttons: NonNullable<Api.SystemManage.Menu['buttons']>;
  layout: string;
  page: string;
  pathParam: string;
};

const model = ref(createDefaultModel());

function createDefaultModel(): Model {
  return {
    menuType: 'M',
    menuName: '',
    routeName: '',
    routePath: '',
    pathParam: '',
    component: '',
    layout: 'base',
    page: '',
    i18nKey: null,
    icon: '',
    iconType: '1',
    parentId: '0',
    status: '1',
    keepAlive: false,
    constant: false,
    order: 0,
    href: null,
    hideInMenu: false,
    activeMenu: null,
    multiTab: false,
    fixedIndexInTab: null,
    query: [],
    buttons: []
  };
}

type RuleKey = Extract<keyof Model, 'menuName' | 'status' | 'routeName' | 'routePath'>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  menuName: defaultRequiredRule,
  status: defaultRequiredRule,
  routeName: defaultRequiredRule,
  routePath: defaultRequiredRule
};

const disabledMenuType = computed(() => props.operateType === 'edit');

const loading = ref(false);

const parentTreeOptions = ref<Api.SystemManage.MenuTree[]>([]);
const editingMenuId = ref<string | null>(null);

async function loadMenuTree() {
  const { data, error } = await fetchGetMenuTree();
  if (!error && data) {
    parentTreeOptions.value = data;
  }
}

const localIcons = getLocalIcons();
const localIconOptions = localIcons.map<SelectOption>(item => ({
  label: () => (
    <div class="flex-y-center gap-16px">
      <SvgIcon localIcon={item} class="text-icon" />
      <span>{item}</span>
    </div>
  ),
  value: item
}));

const showLayout = computed(() => model.value.parentId === '0');

const showPage = computed(() => model.value.menuType === 'C');

const pageOptions = computed(() => {
  const allPages = [...props.allPages];

  if (model.value.routeName && !allPages.includes(model.value.routeName)) {
    allPages.unshift(model.value.routeName);
  }

  const opts: CommonType.Option[] = allPages.map(page => ({
    label: page,
    value: page
  }));

  return opts;
});

const layoutOptions: CommonType.Option[] = [
  {
    label: 'base',
    value: 'base'
  },
  {
    label: 'blank',
    value: 'blank'
  }
];

function handleInitModel() {
  model.value = createDefaultModel();
  editingMenuId.value = null;

  if (!props.rowData) return;

  if (props.operateType === 'addChild') {
    const { menuId } = props.rowData;

    Object.assign(model.value, { parentId: menuId });
  }

  if (props.operateType === 'edit') {
    editingMenuId.value = props.rowData.menuId;
    const {
      menuType, menuName, routeName, routePath, component, order,
      i18nKey, icon, iconType, status, parentId, keepAlive, constant,
      href, hideInMenu, activeMenu, multiTab, fixedIndexInTab, query, buttons
    } = props.rowData;

    const { layout, page } = getLayoutAndPage(component);
    const { path, param } = getPathParamFromRoutePath(routePath);

    Object.assign(model.value, {
      menuType, menuName, routeName, routePath: path, component,
      order, i18nKey, icon, iconType, status, parentId, keepAlive,
      constant, href, hideInMenu, activeMenu, multiTab, fixedIndexInTab,
      query: query || [],
      buttons: buttons || [],
      layout, page, pathParam: param
    });
  }

  if (!model.value.query) {
    model.value.query = [];
  }
  if (!model.value.buttons) {
    model.value.buttons = [];
  }
}

function closeDrawer() {
  visible.value = false;
}

function handleUpdateRoutePathByRouteName() {
  if (model.value.routeName) {
    model.value.routePath = getRoutePathByRouteName(model.value.routeName);
    if (model.value.menuType === 'M') {
      model.value.page = '';
    } else if (model.value.menuType === 'C') {
      model.value.page = model.value.routeName;
    }
  } else {
    model.value.routePath = '';
  }
}

function handleUpdateI18nKeyByRouteName() {
  if (model.value.routeName) {
    model.value.i18nKey = `route.${model.value.routeName}` as App.I18n.I18nKey;
  } else {
    model.value.i18nKey = null;
  }
}

function handleCreateButton() {
  const prefix = getPermissionPrefix();
  const buttonItem: Api.SystemManage.MenuButton = {
    code: prefix ? `${prefix}:` : '',
    desc: ''
  };

  return buttonItem;
}

const crudPresets = [
  { code: 'list', labelKey: 'page.system.menu.presetButton.list' as const, desc: '查询' },
  { code: 'add', labelKey: 'page.system.menu.presetButton.add' as const, desc: '新增' },
  { code: 'edit', labelKey: 'page.system.menu.presetButton.edit' as const, desc: '修改' },
  { code: 'delete', labelKey: 'page.system.menu.presetButton.delete' as const, desc: '删除' },
  { code: 'batch-delete', labelKey: 'page.system.menu.presetButton.batchDelete' as const, desc: '批量删除' },
  { code: 'export', labelKey: 'page.system.menu.presetButton.export' as const, desc: '导出' },
  { code: 'import', labelKey: 'page.system.menu.presetButton.import' as const, desc: '导入' }
];

function getPermissionPrefix(): string {
  const routeName = model.value.routeName;
  if (!routeName) return '';
  return routeName.replace(/_/g, ':');
}

function handleAddPresetButton(preset: (typeof crudPresets)[number]) {
  const prefix = getPermissionPrefix();
  const code = prefix ? `${prefix}:${preset.code}` : preset.code;
  const existingCodes = model.value.buttons.map(b => b.code);
  if (!existingCodes.includes(code)) {
    model.value.buttons.push({ code, desc: preset.desc });
  }
}

function handleAddAllPresetButtons() {
  for (const preset of crudPresets) {
    handleAddPresetButton(preset);
  }
}

function getSubmitParams() {
  const { layout, page, pathParam, ...params } = model.value;

  const component = transformLayoutAndPageToComponent(layout, page);
  const routePath = getRoutePathWithParam(model.value.routePath, pathParam);

  params.component = component;
  params.routePath = routePath;

  return params;
}

async function handleSubmit() {
  await validate();
  loading.value = true;
  try {
    const params = getSubmitParams();
    let res;
    if (props.operateType === 'edit' && props.rowData) {
      res = await fetchUpdateMenu(props.rowData.menuId, params);
    } else {
      res = await fetchSaveMenu(params);
    }

    const { error, response } = res;
    if (!error) {
      const successMsg =
        response?.data?.msg || $t(props.operateType === 'edit' ? 'common.updateSuccess' : 'common.saveSuccess');
      window.$message?.success(successMsg);
      closeDrawer();
      emit('submitted');
    }
  } finally {
    loading.value = false;
  }
}

watch(visible, () => {
  if (visible.value) {
    handleInitModel();
    restoreValidation();
    loadMenuTree();
  }
});

watch(
  () => model.value.routeName,
  () => {
    if (props.operateType !== 'edit') {
      handleUpdateRoutePathByRouteName();
      handleUpdateI18nKeyByRouteName();
    }
  }
);
</script>

<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-800px">
    <NScrollbar class="h-480px pr-20px">
      <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" :label-width="100">
        <NGrid responsive="screen" item-responsive>
          <NFormItemGi span="24 m:12" :label="$t('page.system.menu.menuType')" path="menuType">
            <NRadioGroup v-model:value="model.menuType" :disabled="disabledMenuType">
              <NRadio v-for="item in menuTypeOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.system.menu.parentMenu')" path="parentId">
            <NTreeSelect
              v-model:value="model.parentId"
              :options="parentTreeOptions"
              :placeholder="$t('page.system.menu.form.parentMenu')"
              key-field="id"
              label-field="label"
              children-field="children"
              clearable
            />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.system.menu.menuName')" path="menuName">
            <NInput v-model:value="model.menuName" :placeholder="$t('page.system.menu.form.menuName')" />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.system.menu.routeName')" path="routeName">
            <NInput v-model:value="model.routeName" :placeholder="$t('page.system.menu.form.routeName')" />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.system.menu.routePath')" path="routePath">
            <NInput v-model:value="model.routePath" disabled :placeholder="$t('page.system.menu.form.routePath')" />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.system.menu.pathParam')" path="pathParam">
            <NInput v-model:value="model.pathParam" :placeholder="$t('page.system.menu.form.pathParam')" />
          </NFormItemGi>
          <NFormItemGi v-if="showLayout" span="24 m:12" :label="$t('page.system.menu.layout')" path="layout">
            <NSelect
              v-model:value="model.layout"
              :options="layoutOptions"
              :placeholder="$t('page.system.menu.form.layout')"
            />
          </NFormItemGi>
          <NFormItemGi v-if="showPage" span="24 m:12" :label="$t('page.system.menu.page')" path="page">
            <NSelect
              v-model:value="model.page"
              :options="pageOptions"
              :placeholder="$t('page.system.menu.form.page')"
            />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.system.menu.i18nKey')" path="i18nKey">
            <NInput v-model:value="model.i18nKey" :placeholder="$t('page.system.menu.form.i18nKey')" />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.system.menu.order')" path="order">
            <NInputNumber v-model:value="model.order" class="w-full" :placeholder="$t('page.system.menu.form.order')" />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.system.menu.iconTypeTitle')" path="iconType">
            <NRadioGroup v-model:value="model.iconType">
              <NRadio
                v-for="item in menuIconTypeOptions"
                :key="item.value"
                :value="item.value"
                :label="$t(item.label)"
              />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.system.menu.icon')" path="icon">
            <IconPicker v-if="model.iconType === '1'" v-model:value="model.icon" class="flex-1" />
            <template v-if="model.iconType === '2'">
              <NSelect
                v-model:value="model.icon"
                :placeholder="$t('page.system.menu.form.localIcon')"
                :options="localIconOptions"
              />
            </template>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.system.menu.menuStatus')" path="status">
            <NRadioGroup v-model:value="model.status">
              <NRadio
                v-for="item in enableStatusOptions"
                :key="item.value"
                :value="item.value"
                :label="$t(item.label)"
              />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.system.menu.keepAlive')" path="keepAlive">
            <NRadioGroup v-model:value="model.keepAlive">
              <NRadio :value="true" :label="$t('common.yesOrNo.yes')" />
              <NRadio :value="false" :label="$t('common.yesOrNo.no')" />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.system.menu.constant')" path="constant">
            <NRadioGroup v-model:value="model.constant">
              <NRadio :value="true" :label="$t('common.yesOrNo.yes')" />
              <NRadio :value="false" :label="$t('common.yesOrNo.no')" />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.system.menu.href')" path="href">
            <NInput v-model:value="model.href" :placeholder="$t('page.system.menu.form.href')" />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.system.menu.hideInMenu')" path="hideInMenu">
            <NRadioGroup v-model:value="model.hideInMenu">
              <NRadio :value="true" :label="$t('common.yesOrNo.yes')" />
              <NRadio :value="false" :label="$t('common.yesOrNo.no')" />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi
            v-if="model.hideInMenu"
            span="24 m:12"
            :label="$t('page.system.menu.activeMenu')"
            path="activeMenu"
          >
            <NSelect
              v-model:value="model.activeMenu"
              :options="pageOptions"
              clearable
              :placeholder="$t('page.system.menu.form.activeMenu')"
            />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.system.menu.multiTab')" path="multiTab">
            <NRadioGroup v-model:value="model.multiTab">
              <NRadio :value="true" :label="$t('common.yesOrNo.yes')" />
              <NRadio :value="false" :label="$t('common.yesOrNo.no')" />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.system.menu.fixedIndexInTab')" path="fixedIndexInTab">
            <NInputNumber
              v-model:value="model.fixedIndexInTab"
              class="w-full"
              clearable
              :placeholder="$t('page.system.menu.form.fixedIndexInTab')"
            />
          </NFormItemGi>
          <NFormItemGi span="24" :label="$t('page.system.menu.query')">
            <NDynamicInput
              v-model:value="model.query"
              preset="pair"
              :key-placeholder="$t('page.system.menu.form.queryKey')"
              :value-placeholder="$t('page.system.menu.form.queryValue')"
            >
              <template #action="{ index, create, remove }">
                <NSpace class="ml-12px">
                  <NButton size="medium" @click="() => create(index)">
                    <IconIcRoundPlus class="text-icon" />
                  </NButton>
                  <NButton size="medium" @click="() => remove(index)">
                    <IconIcRoundRemove class="text-icon" />
                  </NButton>
                </NSpace>
              </template>
            </NDynamicInput>
          </NFormItemGi>
          <NFormItemGi span="24" :label="$t('page.system.menu.button')">
            <NSpace vertical class="w-full">
              <NSpace :size="8" align="center">
                <NButton size="small" type="primary" :disabled="!model.routeName" @click="handleAddAllPresetButtons">
                  {{ $t('page.system.menu.presetButton.addAll') }}
                </NButton>
                <NDivider vertical />
                <NButton
                  v-for="item in crudPresets"
                  :key="item.code"
                  size="small"
                  :disabled="!model.routeName"
                  @click="handleAddPresetButton(item)"
                >
                  {{ $t(item.labelKey) }}
                </NButton>
              </NSpace>
              <NDynamicInput v-model:value="model.buttons" :on-create="handleCreateButton">
                <template #default="{ value }">
                  <div class="ml-8px flex-y-center flex-1 gap-12px">
                    <NInput
                      v-model:value="value.code"
                      :placeholder="getPermissionPrefix() ? `${getPermissionPrefix()}:` : $t('page.system.menu.form.buttonCode')"
                      class="flex-1"
                    />
                    <NInput
                      v-model:value="value.desc"
                      :placeholder="$t('page.system.menu.form.buttonDesc')"
                      class="flex-1"
                    />
                  </div>
                </template>
                <template #action="{ index, create, remove }">
                  <NSpace class="ml-12px">
                    <NButton size="medium" @click="() => create(index)">
                      <IconIcRoundPlus class="text-icon" />
                    </NButton>
                    <NButton size="medium" @click="() => remove(index)">
                      <IconIcRoundRemove class="text-icon" />
                    </NButton>
                  </NSpace>
                </template>
              </NDynamicInput>
            </NSpace>
          </NFormItemGi>
        </NGrid>
      </NForm>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" :loading="loading" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
