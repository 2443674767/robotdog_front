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
    <VideoPanel
      class="center"
      :play-url="playUrl"
      :rtsp-url="rtspUrl"
      :photo-loading="photoLoading"
      :photo-url="photoUrl"
      :photo-name="photoName"
      :photo-preview-key="photoPreviewKey"
      @photo="onPhoto"
    />
    <ControlPanel
      ref="controlRef"
      class="right"
      v-model:active-tab="controlTab"
      :dog-id="activeDogId"
      :battery="dogBattery"
      :nav-status="dogNavStatus"
      :status-loading="statusLoading"
      :show-preset-config="isTaskWaypoint"
      :preset="currentPreset"
      :action-loading="presetActionLoading"
      :ptz-pitch="ptzPitch"
      :ptz-yaw="ptzYaw"
      :ptz-zoom="ptzZoom"
      @dog-cmd="onDogCmd"
      @dog-gait="onDogGait"
      @dog-charge="onDogCharge"
      @ptz-cmd="onPtzCmd"
      @preset-call="onPresetCall"
      @preset-update-base="onPresetUpdateBase"
      @preset-set="onPresetSet"
      @preset-del="onPresetDel"
      @preset-form-change="onPresetFormChange"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Message, Modal } from '@arco-design/web-vue';
import RoutePanel from './components/RoutePanel.vue';
import VideoPanel from './components/VideoPanel.vue';
import ControlPanel, { type PresetFormState } from './components/ControlPanel.vue';
import {
  getPlayUrl,
  getPresetRouteList,
  getPtzPresetDetail,
  getPtzRealtime,
  getTaskStatus,
  gotoWaypoint,
  ptzMove,
  ptzPhoto,
  ptzPresetDel,
  ptzSetPreset,
  ptzUpdatePresetBase,
  runRoute,
  type PresetRoute,
  type PtzPresetItem,
} from '@/api/robotdog/preset';
import {
  dogCharge,
  dogMove,
  getDogRealtime,
  parseDogRealtime,
  setDogGait,
} from '@/api/robotdog/control';
import { getRouteWaypointAll } from '@/api/robotdog/waypoint';

const routes = ref<PresetRoute[]>([]);
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

const ptzPitch = ref<number | null>(null);
const ptzYaw = ref<number | null>(null);
const ptzZoom = ref<number | null>(null);
let ptzTimer: number | undefined;

const controlTab = ref('dog');
const controlRef = ref<InstanceType<typeof ControlPanel> | null>(null);
const currentPreset = ref<PtzPresetItem | null>(null);
const presetForm = ref<PresetFormState>({
  id: undefined,
  sort_no: 1,
  servo_photo: 0,
  auto_home: 0,
});
const presetActionLoading = ref<'' | 'call' | 'base' | 'set' | 'del'>('');

const photoLoading = ref(false);
const photoUrl = ref('');
const photoName = ref('');
const photoPreviewKey = ref(0);

const activeRoute = computed(() => routes.value.find((r) => r.id === activeRouteId.value) || null);
const activeDogId = computed(() => activeRoute.value?.dog_id || null);

const activeWaypoint = computed(() => {
  if (!activeWaypointId.value) return null;
  return activeRoute.value?.waypoints?.find((w) => w.id === activeWaypointId.value) || null;
});

const isTaskWaypoint = computed(() => Number(activeWaypoint.value?.is_task) === 1);

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

const resetPtzStatus = () => {
  ptzPitch.value = null;
  ptzYaw.value = null;
  ptzZoom.value = null;
};

const parsePtzRealtime = (res: Record<string, unknown> | null | undefined) => {
  // defHttp 已解包为 data 层：{ pitch, yaw, zoom, data: { pitch_offset, ... } }
  if (!res) {
    return { pitch: null, yaw: null, zoom: null, pitchOffset: null };
  }
  const nested =
    res.data && typeof res.data === 'object' ? (res.data as Record<string, unknown>) : null;
  const pitch = Number(res.pitch ?? nested?.pitch);
  const yaw = Number(res.yaw ?? nested?.yaw);
  const zoom = Number(res.zoom ?? nested?.zoom);
  const pitchOffset = Number(nested?.pitch_offset ?? res.pitch_offset);
  return {
    pitch: Number.isFinite(pitch) ? pitch : null,
    yaw: Number.isFinite(yaw) ? yaw : null,
    zoom: Number.isFinite(zoom) ? zoom : null,
    pitchOffset: Number.isFinite(pitchOffset) ? pitchOffset : null,
  };
};

const fetchPtzRealtime = async () => {
  const dogId = activeDogId.value;
  // 两份 LIBRA4 文档均要求 dog_id 必填；无绑定机械狗时不请求
  if (!dogId) {
    resetPtzStatus();
    return;
  }
  try {
    const res = await getPtzRealtime({ dog_id: dogId });
    const parsed = parsePtzRealtime(res as Record<string, unknown>);
    ptzPitch.value = parsed.pitch;
    ptzYaw.value = parsed.yaw;
    ptzZoom.value = parsed.zoom;
  } catch {
    resetPtzStatus();
  }
};

const stopPtzPoll = () => {
  if (ptzTimer) {
    window.clearInterval(ptzTimer);
    ptzTimer = undefined;
  }
};

const startPtzPoll = () => {
  stopPtzPoll();
  if (controlTab.value !== 'ptz') {
    return;
  }
  if (!activeDogId.value) {
    resetPtzStatus();
    return;
  }
  fetchPtzRealtime();
  ptzTimer = window.setInterval(fetchPtzRealtime, 3000);
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

const loadPresetForWaypoint = async (waypointId: number | null, asTask?: boolean) => {
  currentPreset.value = null;
  const isTask = asTask ?? isTaskWaypoint.value;
  if (!waypointId || !isTask) return;

  // preset_id 来自 getRouteWaypointAll；为 0 表示未绑定，不请求后端
  const wp = activeRoute.value?.waypoints?.find((w) => w.id === waypointId);
  const presetId = Number(wp?.preset_id) || 0;
  if (presetId <= 0) return;

  try {
    currentPreset.value = await getPtzPresetDetail({ id: presetId });
  } catch {
    currentPreset.value = null;
  }
};

const fetchRoutes = async () => {
  loading.value = true;
  try {
    // 航线+航点一次取齐；另拉预置位航线列表补 dog_id / 状态
    const [allRes, metaRes] = await Promise.all([
      getRouteWaypointAll({ status: 'published' }),
      getPresetRouteList({ page: 1, limit: 100, route_status: 'published' }).catch(() => null),
    ]);
    const metaMap = new Map<number, PresetRoute>();
    (metaRes?.list || []).forEach((r) => metaMap.set(r.id, r));

    routes.value = (allRes?.list || []).map((item) => {
      const meta = metaMap.get(item.route_id);
      return {
        id: item.route_id,
        name: item.route_name,
        dog_id: meta?.dog_id ?? null,
        status: meta?.status || meta?.route_status || meta?.run_status,
        waypoints: (item.waypoints || []).map((wp) => ({
          id: wp.id,
          name: wp.name,
          seq: wp.seq,
          is_task: wp.is_task,
          preset_id: wp.preset_id,
        })),
      } as PresetRoute;
    });

    if (!routes.value.find((r) => r.id === activeRouteId.value)) {
      activeRouteId.value = routes.value[0]?.id ?? null;
    }
    const route = routes.value.find((r) => r.id === activeRouteId.value);
    if (!route?.waypoints?.find((w) => w.id === activeWaypointId.value)) {
      activeWaypointId.value = route?.waypoints?.[0]?.id ?? null;
    }
    await loadPlayUrl(route?.dog_id);
    await loadPresetForWaypoint(activeWaypointId.value);
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

watch([activeWaypointId, isTaskWaypoint], async ([id, isTask]) => {
  if (isTask && id) {
    controlTab.value = 'ptz';
    await loadPresetForWaypoint(id, true);
  } else {
    currentPreset.value = null;
  }
});

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

const onDogGait = async (gait: 'basic' | 'stair') => {
  const dogId = requireDogId('请先选择已绑定机械狗的航线后再切换步态');
  if (!dogId) return;
  await setDogGait({ dog_id: dogId, gait });
  Message.success(gait === 'stair' ? '已切换楼梯步态' : '已切换普通步态');
};

const onDogCharge = async (action: 'enter' | 'exit') => {
  const dogId = requireDogId('请先选择已绑定机械狗的航线后再操作充电桩');
  if (!dogId) return;
  await dogCharge({ dog_id: dogId, action });
  Message.success(action === 'enter' ? '已下发进入充电桩' : '已下发退出充电桩');
};

const onPtzCmd = async (cmd: string, payload?: Record<string, number | string>) => {
  const fast = Number(payload?.fast) === 1;
  const yawStep = Number(payload?.yaw_step ?? 5);
  const pitchStep = Number(payload?.pitch_step ?? 2);
  const zoomStep = Number(payload?.zoom_step ?? 0.5);
  const dogId = activeDogId.value || undefined;

  const withFast = (base: string) => (fast ? `${base}_fast` : base);

  /** 斜向：后端无对角命令，顺序发两轴相对步进 */
  const diagonalMap: Record<string, [string, string]> = {
    up_left: ['up', 'left'],
    up_right: ['up', 'right'],
    down_left: ['down', 'left'],
    down_right: ['down', 'right'],
    left_up: ['up', 'left'],
    right_up: ['up', 'right'],
    left_down: ['down', 'left'],
    right_down: ['down', 'right'],
  };

  const sendMove = async (moveCmd: string, step?: number) => {
    await ptzMove({
      cmd: moveCmd,
      dog_id: dogId,
      ...(step != null ? { step } : {}),
    });
  };

  const diag = diagonalMap[cmd];
  if (diag) {
    const [pitchCmd, yawCmd] = diag;
    await sendMove(withFast(pitchCmd), pitchStep);
    await sendMove(withFast(yawCmd), yawStep);
    await fetchPtzRealtime();
    return;
  }

  const singleMap: Record<string, { cmd: string; step?: number }> = {
    up: { cmd: withFast('up'), step: pitchStep },
    down: { cmd: withFast('down'), step: pitchStep },
    left: { cmd: withFast('left'), step: yawStep },
    right: { cmd: withFast('right'), step: yawStep },
    zoom_in: { cmd: withFast('zoom_in'), step: zoomStep },
    zoom_out: { cmd: withFast('zoom_out'), step: zoomStep },
    'zoom-in': { cmd: withFast('zoom_in'), step: zoomStep },
    'zoom-out': { cmd: withFast('zoom_out'), step: zoomStep },
    home: { cmd: 'home' },
    zoom_home: { cmd: 'zoom_home' },
    refresh: { cmd: 'refresh' },
    status: { cmd: 'refresh' },
    stop: { cmd: 'stop' },
    focus_near: { cmd: 'focus_near' },
    focus_far: { cmd: 'focus_far' },
    'focus-near': { cmd: 'focus_near' },
    'focus-far': { cmd: 'focus_far' },
  };

  const mapped = singleMap[cmd];
  if (!mapped) return;
  await sendMove(mapped.cmd, mapped.step);
  await fetchPtzRealtime();
};

const onPresetFormChange = (form: PresetFormState) => {
  presetForm.value = { ...form };
};

const getForm = (): PresetFormState => {
  const fromRef = controlRef.value?.getForm?.();
  return fromRef || presetForm.value;
};

const onPresetSet = async () => {
  if (!isTaskWaypoint.value || !activeWaypointId.value) {
    Message.warning('请先选择任务航点');
    return;
  }
  const form = getForm();
  presetActionLoading.value = 'set';
  try {
    const res = await ptzSetPreset({
      waypoint_id: activeWaypointId.value,
      dog_id: activeDogId.value || undefined,
      id: form.id,
      sort_no: form.sort_no || 1,
      servo_photo: form.servo_photo ? 1 : 0,
      auto_home: form.auto_home ? 1 : 0,
    });
    currentPreset.value = res || null;
    Message.success('预置位已保存');
    await fetchRoutes();
  } finally {
    presetActionLoading.value = '';
  }
};

const onPresetUpdateBase = async () => {
  const form = getForm();
  const id = form.id || currentPreset.value?.id;
  if (!id) {
    Message.warning('请先设置预置位');
    return;
  }
  presetActionLoading.value = 'base';
  try {
    const res = await ptzUpdatePresetBase({
      id,
      servo_photo: form.servo_photo ? 1 : 0,
      auto_home: form.auto_home ? 1 : 0,
    });
    currentPreset.value = res || { ...(currentPreset.value as PtzPresetItem), ...form, id };
    Message.success('基础配置已更新');
  } finally {
    presetActionLoading.value = '';
  }
};

const onPresetCall = async () => {
  const form = getForm();
  const id = form.id || currentPreset.value?.id;
  if (!id) {
    Message.warning('请先填写预置位 ID');
    return;
  }
  presetActionLoading.value = 'call';
  try {
    let detail: PtzPresetItem | null = currentPreset.value;
    if (!detail || detail.id !== id) {
      detail = await getPtzPresetDetail({ id });
    }
    if (!detail) {
      Message.warning('预置位不存在');
      return;
    }
    await ptzMove({
      cmd: 'angle_set',
      dog_id: activeDogId.value || undefined,
      ptz_id: detail.ptz_id,
      yaw: Number(detail.yaw ?? 0),
      pitch: Number(detail.pitch ?? 0),
    });
    Message.success('已调用预置位');
    await fetchPtzRealtime();
  } finally {
    presetActionLoading.value = '';
  }
};

const onPresetDel = () => {
  const form = getForm();
  const id = form.id || currentPreset.value?.id;
  if (!id) {
    Message.warning('请先选择要删除的预置位');
    return;
  }
  Modal.confirm({
    title: '删除预置位',
    content: `确认删除预置位 ID=${id}？`,
    onOk: async () => {
      presetActionLoading.value = 'del';
      try {
        await ptzPresetDel({ id });
        currentPreset.value = null;
        Message.success('预置位已删除');
        await fetchRoutes();
      } finally {
        presetActionLoading.value = '';
      }
    },
  });
};

const onPhoto = async () => {
  photoLoading.value = true;
  try {
    const res = await ptzPhoto({
      waypoint_id: activeWaypointId.value || undefined,
      dog_id: activeDogId.value || undefined,
    });
    photoUrl.value = res?.url || '';
    photoName.value = res?.filename || '';
    photoPreviewKey.value += 1;
    Message.success('拍照成功');
  } catch {
    photoUrl.value = '';
    photoName.value = '';
    photoPreviewKey.value += 1;
  } finally {
    photoLoading.value = false;
  }
};

watch(activeDogId, () => {
  startStatusPoll();
  if (controlTab.value === 'ptz') startPtzPoll();
});

watch(controlTab, (tab) => {
  if (tab === 'ptz') startPtzPoll();
  else stopPtzPoll();
});

onMounted(async () => {
  await fetchRoutes();
  startStatusPoll();
  if (controlTab.value === 'ptz') startPtzPoll();
});

onBeforeUnmount(() => {
  stopStatusPoll();
  stopPtzPoll();
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
