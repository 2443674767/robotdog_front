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
      :dog-id="activeDogId"
      :battery="dogBattery"
      :nav-status="dogNavStatus"
      :status-loading="statusLoading"
      @dog-cmd="onDogCmd"
      @dog-gait="onDogGait"
      @dog-charge="onDogCharge"
      @ptz-cmd="onPtzCmd"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Message } from '@arco-design/web-vue';
import RoutePanel from './components/RoutePanel.vue';
import VideoPanel from './components/VideoPanel.vue';
import ControlPanel from './components/ControlPanel.vue';
import {
  getPlayUrl,
  getPresetRouteList,
  getTaskStatus,
  gotoWaypoint,
  ptzMove,
  runRoute,
  type PresetRoute,
} from '@/api/robotdog/preset';
import {
  dogCharge,
  dogMove,
  getDogRealtime,
  parseDogRealtime,
  setDogGait,
} from '@/api/robotdog/control';
import { getWaypointList, type WaypointItem } from '@/api/robotdog/waypoint';

const routes = ref<PresetRoute[]>([]);
const waypointMap = ref<Map<number, WaypointItem>>(new Map());
const activeRouteId = ref<number | null>(null);
const activeWaypointId = ref<number | null>(null);
const loading = ref(false);
const playUrl = ref('');
const rtspUrl = ref('');
const lastTaskId = ref('');

const dogBattery = ref<number | null>(null);
const dogNavStatus = ref('未知');
const statusLoading = ref(false);
let statusTimer: number | undefined;

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

const resetDogStatus = () => {
  dogBattery.value = null;
  dogNavStatus.value = '未知';
};

const fetchDogRealtime = async () => {
  const dogId = activeDogId.value;
  if (!dogId) {
    resetDogStatus();
    return;
  }
  statusLoading.value = true;
  try {
    const res = await getDogRealtime({ dog_id: dogId });
    const parsed = parseDogRealtime(res);
    dogBattery.value = parsed.battery;
    dogNavStatus.value = parsed.navStatus;
  } catch {
    resetDogStatus();
  } finally {
    statusLoading.value = false;
  }
};

const stopStatusPoll = () => {
  if (statusTimer) {
    window.clearInterval(statusTimer);
    statusTimer = undefined;
  }
};

const startStatusPoll = () => {
  stopStatusPoll();
  if (!activeDogId.value) {
    resetDogStatus();
    return;
  }
  fetchDogRealtime();
  statusTimer = window.setInterval(fetchDogRealtime, 3000);
};

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
  const task = await gotoWaypoint({ dog_id: dogId, waypoint_id: id });
  lastTaskId.value = (task as { task_id?: string })?.task_id || '';
  Message.success('已下发前往航点指令');
  await fetchRoutes();
};

const onRunRoute = async (action: string) => {
  if (!activeRouteId.value) {
    Message.warning('请先选择航线');
    return;
  }
  const task = await runRoute({
    route_id: activeRouteId.value,
    action,
  });
  lastTaskId.value = (task as { task_id?: string })?.task_id || '';
  const tip =
    ({ start: '已开始执行航线', pause: '航线已暂停', resume: '航线已继续', stop: '航线已停止' } as Record<
      string,
      string
    >)[action] || '航线指令已下发';
  Message.success(tip);
  await fetchRoutes();
  if (lastTaskId.value) {
    try {
      await getTaskStatus({ task_id: lastTaskId.value });
    } catch {
      /* 状态查询失败不影响主流程 */
    }
  }
};

const requireDogId = (actionTip = '请先选择已绑定机械狗的航线') => {
  const dogId = activeDogId.value;
  if (!dogId) {
    Message.warning(actionTip);
    return null;
  }
  return dogId;
};

/** 机械狗方向：/robotdog/control/dog/move */
const onDogCmd = async (cmd: string, payload?: Record<string, number | string>) => {
  const dogId = requireDogId();
  if (!dogId) return;
  const directionMap: Record<string, string> = {
    forward: 'forward',
    back: 'backward',
    backward: 'backward',
    left: 'left',
    right: 'right',
    stop: 'stop',
  };
  const direction = directionMap[cmd];
  if (!direction) return;

  await dogMove({
    dog_id: dogId,
    direction,
    speed: Number(payload?.speed ?? 0.5),
  });
};

/** 步态：/robotdog/control/dog/setGait */
const onDogGait = async (gait: 'basic' | 'stair') => {
  const dogId = requireDogId('请先选择已绑定机械狗的航线后再切换步态');
  if (!dogId) return;
  await setDogGait({ dog_id: dogId, gait });
  Message.success(gait === 'stair' ? '已切换楼梯步态' : '已切换普通步态');
};

/** 充电桩：/robotdog/control/dog/charge */
const onDogCharge = async (action: 'enter' | 'exit') => {
  const dogId = requireDogId('请先选择已绑定机械狗的航线后再操作充电桩');
  if (!dogId) return;
  await dogCharge({ dog_id: dogId, action });
  Message.success(action === 'enter' ? '已下发进入充电桩' : '已下发退出充电桩');
};

/** 云台：/robotdog/preset/ptzMove */
const onPtzCmd = async (cmd: string, payload?: Record<string, number | string>) => {
  const cmdMap: Record<string, string> = {
    up: 'up',
    down: 'down',
    left: 'left',
    right: 'right',
    stop: 'stop',
    'zoom-in': 'zoom_in',
    'zoom-out': 'zoom_out',
    zoom_in: 'zoom_in',
    zoom_out: 'zoom_out',
    focus_near: 'focus_near',
    focus_far: 'focus_far',
    'focus-near': 'focus_near',
    'focus-far': 'focus_far',
  };
  const mapped = cmdMap[cmd];
  if (!mapped) return;

  await ptzMove({
    cmd: mapped,
    speed: Number(payload?.speed ?? 50),
    pan: Number(payload?.yaw ?? 0),
    tilt: Number(payload?.pitch ?? 0),
  });
};

watch(activeDogId, () => {
  startStatusPoll();
});

onMounted(async () => {
  await fetchRoutes();
  startStatusPoll();
});

onBeforeUnmount(() => {
  stopStatusPoll();
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
