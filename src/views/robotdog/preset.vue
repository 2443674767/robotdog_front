<template>
  <PresetPage />
</template>

<script lang="ts" setup>
/**
 * 后台菜单「组件路径」为 robotdog/preset 时的入口文件。
 * 业务实现在同目录 preset/ 下。
 */
import PresetPage from './preset/index.vue';
</script>

<script lang="ts">
export default {
  name: 'robotdog-preset',
};
</script>
