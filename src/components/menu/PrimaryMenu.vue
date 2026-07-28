<script lang="tsx">
  import { defineComponent, h } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRoute, useRouter, RouteRecordRaw } from 'vue-router';
  import type { RouteMeta } from 'vue-router';
  import { useAppStore,useUserStore } from '@/store';
  import { openWindow, regexUrl } from '@/utils';
  import { Icon } from '@/components/Icon';
  import useDualMenu from './use-dual-menu';
  export default defineComponent({
    setup() {
      const { t } = useI18n();
      const router = useRouter();
      const appStore = useAppStore();
      const route = useRoute();
      const {
        primaryMenu,
        selectedPrimaryName,
        findFirstLeaf,
        findPrimaryNameByRoute,
      } = useDualMenu();

      const goto = (item: RouteRecordRaw) => {
        if (regexUrl.test(item.path)) {
          openWindow(item.path);
          return;
        }
        const comp = item.component;
        if (item.meta?.isExt && typeof comp === 'string') {
          if (regexUrl.test(comp)) {
            openWindow(comp);
            return;
          }
          return;
        }
        if (item.meta?.onlypage) {
          const href = router.resolve({ path: item.path });
          let hrefStr = `${href.href}?tenant_id=${useUserStore().id}`;
          if (!item.meta?.requiresAuth) hrefStr += `&rouid=${item.meta?.id}`;
          openWindow(hrefStr);
          return;
        }
        const { hideInMenu, activeMenu } = item.meta as RouteMeta;
        if (route.name === item.name && !hideInMenu && !activeMenu) return;
        if (item.name) router.push({ name: item.name });
      };

      const handleSelect = (item: RouteRecordRaw) => {
        selectedPrimaryName.value = item.name as string;
        if (!item.children?.length) {
          goto(item);
          return;
        }
        const currentPrimary = findPrimaryNameByRoute(route.name as string);
        if (currentPrimary !== item.name) {
          const firstLeaf = findFirstLeaf(item);
          if (firstLeaf) goto(firstLeaf);
        }
      };
      
      return () => (
        <div class={['primary-menu', { 'primary-dark': appStore.menuDark }]}>
          <div class="primary-menu-logo">
            <img src="/logo.png" alt="logo" />
          </div>
          <div class="primary-menu-list">
            {primaryMenu.value.map((item) => (
              <div
                key={item.name as string}
                class={[
                  'primary-menu-item',
                  { active: selectedPrimaryName.value === item.name },
                ]}
                onClick={() => handleSelect(item)}
              >
                {item.meta?.icon ? (
                  h(Icon, { icon: item.meta.icon, size: 20 })
                ) : null}
                <span class="primary-menu-title">
                  {item.meta?.locale ? t(item.meta.locale) : item.meta?.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    },
  });
</script>

<style lang="less" scoped>
  .primary-menu {
    display: flex;
    flex-direction: column;
    height: 100%;
    // background-color: #001529;
  }
  .primary-dark{
    background-color: #001529 !important;
     .primary-menu-item {
       color: rgba(255, 255, 255, 0.65);
        &:hover {
          color: #fff;
          background-color: rgba(255, 255, 255, 0.08);
        }
        &.active {
          color: #fff;
          background-color: rgb(var(--primary-6));
        }
     }
  }
  .primary-menu-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 50px;
    flex-shrink: 0;

    img {
      height: 28px;
    }
  }

  .primary-menu-list {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 4px 0;
  }

  .primary-menu-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 10px 2px;
    margin: 2px 4px;
    border-radius: 4px;
    cursor: pointer;
    color: var(--color-neutral-10);
    transition: all 0.2s;
    user-select: none;

    &:hover {
      color: var(--color-neutral-8);
      background-color: var(--color-neutral-2);
    }

    &.active {
      color: rgb(var(--primary-6));
      background-color: var(--color-primary-light-1);
    }
  }

  .primary-menu-title {
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.3;
    text-align: center;
    width: 100%;
    padding: 0 2px;
    word-break: keep-all;
  }
</style>
