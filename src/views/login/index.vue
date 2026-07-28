<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <img class="login-logo" src="/logo.png" alt="logo" />
        <div class="login-title">{{ $t('login.form.welcome') }}{{ AppTitle }}</div>
      </div>

      <EmailLogin v-show="isEmailLogin" />
      <a-tabs v-show="!isEmailLogin" class="login-tabs" default-active-key="1">
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
import { ref, computed } from 'vue';
import AccountLogin from './components/account/index.vue';
import PhoneLogin from './components/phone/index.vue';
import EmailLogin from './components/email/index.vue';
import useLocale from '@/hooks/locale';

const { currentLocale } = useLocale();
const isEmailLogin = ref(false);

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
