<template>
  <div class="preset-page">
    <RoutePanel
      class="left"
      :routes="routes"
      :active-route-id="activeRouteId"
      :active-waypoint-id="activeWaypointId"
      @select-route="onSelectRoute"
      @select-waypoint="onSelectWaypoint"
      @goto-waypoint="onGotoWaypoint"
      @refresh="onRefresh"
    />
    <VideoPanel class="center" />
    <ControlPanel
      class="right"
      @dog-cmd="onDogCmd"
      @ptz-cmd="onPtzCmd"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import RoutePanel from './components/RoutePanel.vue';
import VideoPanel from './components/VideoPanel.vue';
import ControlPanel from './components/ControlPanel.vue';
import { mockRoutes, type RouteItem } from './mock';

const routes = ref<RouteItem[]>(JSON.parse(JSON.stringify(mockRoutes)));
const activeRouteId = ref<number | null>(routes.value[0]?.id ?? null);
const activeWaypointId = ref<number | null>(
  routes.value[0]?.waypoints[0]?.id ?? null
);

const onSelectRoute = (id: number) => {
  activeRouteId.value = id;
  const route = routes.value.find((r) => r.id === id);
  activeWaypointId.value = route?.waypoints[0]?.id ?? null;
};

const onSelectWaypoint = (id: number) => {
  activeWaypointId.value = id;
};

const onGotoWaypoint = (id: number) => {
  activeWaypointId.value = id;
  const route = routes.value.find((r) => r.id === activeRouteId.value);
  const wp = route?.waypoints.find((w) => w.id === id);
  Message.info(`前往航点：${wp?.name || id}（接口待接入）`);
};

const onRefresh = () => {
  routes.value = JSON.parse(JSON.stringify(mockRoutes));
  Message.success('航线已刷新（本地占位数据）');
};

const onDogCmd = (cmd: string, payload?: Record<string, number | string>) => {
  // TODO: 接入机械狗控制接口
  if (cmd !== 'stop' && cmd !== 'speed') {
    Message.info(`机械狗指令：${cmd}`);
  }
  console.debug('[dog-cmd]', cmd, payload);
};

const onPtzCmd = (cmd: string, payload?: Record<string, number | string>) => {
  // TODO: 接入云台控制接口
  if (cmd !== 'stop') {
    Message.info(`云台指令：${cmd}`);
  }
  console.debug('[ptz-cmd]', cmd, payload);
};
</script>

<script lang="ts">
export default {
  name: 'robotdog-preset-page',
};
</script>

<style lang="less" scoped>
.preset-page {
  height: calc(100vh - 140px);
  min-height: 560px;
  display: grid;
  grid-template-columns: 20% 1fr 20%;
  gap: 12px;
  box-sizing: border-box;
}

.left,
.center,
.right {
  min-width: 0;
  min-height: 0;
}

@media screen and (max-width: 1100px) {
  .preset-page {
    height: auto;
    grid-template-columns: 1fr;
  }

  .left,
  .center,
  .right {
    min-height: 320px;
  }

  .center {
    min-height: 420px;
  }
}
</style>
