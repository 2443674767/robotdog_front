import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import useMenuTree from './use-menu-tree';
import { listenerRouteChange } from '@/utils/route-listener';

const selectedPrimaryName = ref<string>('');

export default function useDualMenu() {
  const { menuTree } = useMenuTree();
  const route = useRoute();

  const primaryMenu = computed(() => menuTree.value || []);

  const selectedPrimary = computed(() =>
    primaryMenu.value.find((item) => item.name === selectedPrimaryName.value)
  );

  const secondaryMenu = computed(() => {
    const primary = selectedPrimary.value;
    if (!primary?.children?.length) return [];
    return primary.children;
  });

  const hasSecondaryMenu = computed(() => secondaryMenu.value.length > 0);

  const findPrimaryNameByRoute = (targetName: string): string | null => {
    const containsRoute = (items: RouteRecordRaw[]): boolean => {
      for (const item of items) {
        if (item.name === targetName) return true;
        if (item.children?.length && containsRoute(item.children)) return true;
      }
      return false;
    };

    for (const item of primaryMenu.value) {
      if (item.name === targetName) return item.name as string;
      if (item.children?.length && containsRoute(item.children)) {
        return item.name as string;
      }
    }
    return null;
  };

  const findFirstLeaf = (item: RouteRecordRaw): RouteRecordRaw | null => {
    if (!item.children?.length) return item;
    for (const child of item.children) {
      if (child.meta?.hideInMenu) continue;
      const leaf = findFirstLeaf(child);
      if (leaf) return leaf;
    }
    return null;
  };

  const syncPrimaryFromRoute = (routeName: string) => {
    const primaryName = findPrimaryNameByRoute(routeName);
    if (primaryName) {
      selectedPrimaryName.value = primaryName;
    } else if (primaryMenu.value.length && !selectedPrimaryName.value) {
      selectedPrimaryName.value = primaryMenu.value[0].name as string;
    }
  };

  listenerRouteChange((newRoute) => {
    const { requiresAuth, activeMenu, hideInMenu } = newRoute.meta;
    if (requiresAuth && (!hideInMenu || activeMenu)) {
      syncPrimaryFromRoute((activeMenu || newRoute.name) as string);
    }
  }, true);

  watch(
    primaryMenu,
    (tree) => {
      if (tree?.length && route.name) {
        syncPrimaryFromRoute(
          (route.meta?.activeMenu || route.name) as string
        );
      }
    },
    { immediate: true }
  );

  return {
    primaryMenu,
    secondaryMenu,
    hasSecondaryMenu,
    selectedPrimaryName,
    selectedPrimary,
    findFirstLeaf,
    findPrimaryNameByRoute,
    syncPrimaryFromRoute,
  };
}
