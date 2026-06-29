import { defineStore } from 'pinia';
import { ref } from 'vue';
import { SetupStoreId } from '@/enum';
import { fetchAppContributes, type AppContributeMenu, type AppContributePage } from '@/service/api/lowcode';

/**
 * Marketplace app contributes store.
 *
 * Holds the aggregated menus + pages for the current tenant's enabled apps.
 * Backend caches this in Redis and invalidates on install/uninstall/enable/disable.
 *
 * Wired into routeStore.initAuthRoute so menus merge into the sidebar after login;
 * marketplace-detail view calls refresh() after install/uninstall to update live.
 */
export const useContributesStore = defineStore(SetupStoreId.Contributes, () => {
  const menus = ref<AppContributeMenu[]>([]);
  const pages = ref<AppContributePage[]>([]);
  const loaded = ref(false);

  async function fetchContributes() {
    const { data, error } = await fetchAppContributes();
    if (!error && data) {
      menus.value = data.menus;
      pages.value = data.pages;
      loaded.value = true;
    }
    // fetch failure: keep previous state (if any) so a transient API error doesn't wipe the sidebar
  }

  async function refresh() {
    await fetchContributes();
  }

  function clear() {
    menus.value = [];
    pages.value = [];
    loaded.value = false;
  }

  return { menus, pages, loaded, fetchContributes, refresh, clear };
});
