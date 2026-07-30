<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <img class="login-logo" src="/logo.png" alt="logo" />
        <div class="login-title">{{ $t('login.form.welcome') }}{{ AppTitle }}</div>
      </div>

      <EmailLogin v-if="formReady && isEmailLogin" />
      <a-tabs
        v-else-if="formReady"
        v-model:active-key="activeTab"
        class="login-tabs"
        :animation="false"
        destroy-on-hide
      >
        <a-tab-pane key="1" :title="$t('login.form.tabacount')">
          <AccountLogin />
        </a-tab-pane>
        <a-tab-pane key="2" :title="$t('login.form.tabmobile')">
          <PhoneLogin />
        </a-tab-pane>
      </a-tabs>

      <div class="login-switch">
        <a @click="toggleLoginMode">
          {{ isEmailLogin ? $t('login.form.tabacountmobile') : $t('login.form.tabemail') }}
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import AccountLogin from './components/account/index.vue';
import PhoneLogin from './components/phone/index.vue';
import EmailLogin from './components/email/index.vue';
import useLocale from '@/hooks/locale';

const { currentLocale } = useLocale();
const isEmailLogin = ref(false);
const activeTab = ref('1');
const formReady = ref(false);

const toggleLoginMode = () => {
  isEmailLogin.value = !isEmailLogin.value;
};

const AppTitle = computed(() => {
  switch (currentLocale.value) {
    case 'zh-CN':
      return window?.globalConfig.AppTitle_zhCN;
    case 'zh-TW':
      return window?.globalConfig.AppTitle_zhTW;
    case 'en-US':
      return window?.globalConfig.AppTitle_enUS;
    default:
      return window?.globalConfig.AppTitle_enUS;
  }
});

onMounted(() => {
  // 清理主界面残留的弹层/遮罩，避免挡住输入
  document.body.style.overflow = '';
  document.body.style.pointerEvents = '';
  document.querySelectorAll(
    '.arco-modal-mask,.arco-drawer-mask,.arco-dropdown,.arco-trigger-popup,.arco-overlay-mask'
  ).forEach((el) => el.parentElement?.removeChild(el));
  // 下一帧再挂载表单，确保布局干净
  requestAnimationFrame(() => {
    formReady.value = true;
  });
});
</script>

<style lang="less" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #1677ff;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 12px;
  padding: 40px 36px 28px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
}

.login-logo {
  height: 40px;
  margin-bottom: 12px;
}

.login-title {
  font-size: 22px;
  font-weight: 600;
  color: #1d2129;
  line-height: 1.4;
  text-align: center;
}

.login-tabs {
  margin-top: 4px;
}

/* 避免退出登录后 Tabs 高度被错误固定，导致表单只显示一部分 */
:deep(.arco-tabs-content),
:deep(.arco-tabs-content-list),
:deep(.arco-tabs-content-item),
:deep(.arco-tabs-content-item-active) {
  height: auto !important;
  overflow: visible !important;
}

.login-switch {
  margin-top: 16px;
  text-align: center;
  font-size: 13px;

  a {
    color: #1677ff;
    cursor: pointer;
  }
}

:deep(.arco-tabs-nav::before) {
  height: 0;
}

:deep(.arco-tabs-tab-title) {
  font-size: 15px;
}

:deep(.arco-input-wrapper) {
  background-color: transparent;
  border: 1px solid var(--color-neutral-3);
}
</style>
