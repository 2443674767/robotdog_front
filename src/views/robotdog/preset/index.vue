<template>
  <div class="preset-page">
    <RoutePanel
      class="left"
      :routes="routes"
      :active-route-id="activeRouteId"
      :active-waypoint-id="activeWaypointId"
      :loading="loading"
      @select-route="onSelectRoute"
      @select-waypoint="onSelectWaypoint"
      @goto-waypoint="onGotoWaypoint"
      @run-route="onRunRoute"
      @refresh="fetchRoutes"
    />
    <VideoPanel class="center" :play-url="playUrl" :rtsp-url="rtspUrl" />
    <ControlPanel
      class="right"
      @dog-cmd="onDogCmd"
      @ptz-cmd="onPtzCmd"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import RoutePanel from './components/RoutePanel.vue';
import VideoPanel from './components/VideoPanel.vue';
import ControlPanel from './components/ControlPanel.vue';
import {
  dogCmd,
  getPlayUrl,
  getPresetRouteList,
  gotoWaypoint,
  ptzCmd,
  runRoute,
  type PresetRoute,
} from '@/api/robotdog/preset';
import { getWaypointList, type WaypointItem } from '@/api/robotdog/waypoint';

const routes = ref<PresetRoute[]>([]);
const waypointMap = ref<Map<number, WaypointItem>>(new Map());
const activeRouteId = ref<number | null>(null);
const activeWaypointId = ref<number | null>(null);
const loading = ref(false);
const playUrl = ref('');
const rtspUrl = ref('');

const activeRoute = computed(() => routes.value.find((r) => r.id === activeRouteId.value) || null);
const activeDogId = computed(() => activeRoute.value?.dog_id || null);

const enrichRoutes = (list: PresetRoute[]): PresetRoute[] =>
  list.map((route) => {
    const ids = route.waypoint_ids || [];
    const waypoints = ids
      .map((id) => waypointMap.value.get(id))
      .filter(Boolean)
      .map((wp) => ({
        id: wp!.id,
        name: wp!.name,
        x: wp!.x,
        y: wp!.y,
        z: wp!.z,
        yaw: wp!.yaw,
      }));
    return { ...route, waypoints };
  });

const loadPlayUrl = async (dogId: number | null | undefined) => {
  if (!dogId) {
    playUrl.value = '';
    rtspUrl.value = '';
    return;
  }
  try {
    const res = await getPlayUrl({ dog_id: dogId });
    playUrl.value = res?.play_url || '';
    rtspUrl.value = res?.rtsp_url || '';
  } catch {
    playUrl.value = '';
    rtspUrl.value = '';
  }
};

const fetchRoutes = async () => {
  loading.value = true;
  try {
    const [routeRes, wpRes] = await Promise.all([
      getPresetRouteList({ page: 1, limit: 100, route_status: 'published' }),
      getWaypointList({ page: 1, limit: 500 }),
    ]);
    const map = new Map<number, WaypointItem>();
    (wpRes?.list || []).forEach((wp) => map.set(wp.id, wp));
    waypointMap.value = map;
    routes.value = enrichRoutes(routeRes?.list || []);

    if (!routes.value.find((r) => r.id === activeRouteId.value)) {
      activeRouteId.value = routes.value[0]?.id ?? null;
    }
    const route = routes.value.find((r) => r.id === activeRouteId.value);
    if (!route?.waypoints?.find((w) => w.id === activeWaypointId.value)) {
      activeWaypointId.value = route?.waypoints?.[0]?.id ?? null;
    }
    await loadPlayUrl(route?.dog_id);
  } finally {
    loading.value = false;
  }
};

const onSelectRoute = async (id: number) => {
  activeRouteId.value = id;
  const route = routes.value.find((r) => r.id === id);
  activeWaypointId.value = route?.waypoints?.[0]?.id ?? null;
  await loadPlayUrl(route?.dog_id);
};

const onSelectWaypoint = (id: number) => {
  activeWaypointId.value = id;
};

const onGotoWaypoint = async (id: number) => {
  const dogId = activeDogId.value;
  if (!dogId) {
    Message.warning('当前航线未绑定机械狗');
    return;
  }
  activeWaypointId.value = id;
  await gotoWaypoint({ dog_id: dogId, waypoint_id: id });
  Message.success('已下发前往航点指令');
  await fetchRoutes();
};

const onRunRoute = async (action: string) => {
  if (!activeRouteId.value) {
    Message.warning('请先选择航线');
    return;
  }
  await runRoute({
    route_id: activeRouteId.value,
    action,
    ...(activeDogId.value ? { dog_id: activeDogId.value } : {}),
  });
  const tip =
    ({ start: '已开始执行航线', pause: '航线已暂停', resume: '航线已继续', stop: '航线已停止' } as Record<
      string,
      string
    >)[action] || '航线指令已下发';
  Message.success(tip);
  await fetchRoutes();
};

const onDogCmd = async (cmd: string, payload?: Record<string, number | string>) => {
  const dogId = activeDogId.value;
  if (!dogId) {
    if (cmd !== 'stop' && cmd !== 'speed') {
      Message.warning('请先选择已绑定机械狗的航线');
    }
    return;
  }
  await dogCmd({
    dog_id: dogId,
    cmd,
    speed: Number(payload?.speed ?? 0.6),
  });
};

const onPtzCmd = async (cmd: string, payload?: Record<string, number | string>) => {
  await ptzCmd({
    cmd,
    ...(activeDogId.value ? { dog_id: activeDogId.value } : {}),
    pan: Number(payload?.yaw ?? 0),
    tilt: Number(payload?.pitch ?? 0),
    zoom: Number(payload?.zoom ?? 1),
  });
};

onMounted(() => {
  fetchRoutes();
});
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
