<template>
  <WaypointPage />
</template>

<script lang="ts" setup>
/**
 * 后台菜单「组件路径」为 robotdog/waypoint 时的入口。
 * 业务实现在同目录 waypoint/ 下。
 */
import WaypointPage from './waypoint/index.vue';
</script>

<script lang="ts">
export default {
  name: 'robotdog-waypoint',
};
</script>
