<template>
  <div class="waypoint-page">
    <PointCloudMap
      class="map"
      :waypoints="waypoints"
      :active-waypoint-id="activeWaypointId"
      :route-waypoint-ids="activeRouteWaypointIds"
    />
    <div class="side">
      <DogConfigList
        class="side-block"
        :list="dogs"
        :active-id="activeDogId"
        :loading="loading.dog"
        @select="(id) => (activeDogId = id)"
        @add="openDogModal()"
        @edit="openDogModal"
        @remove="removeDog"
      />
      <WaypointList
        class="side-block"
        :list="waypoints"
        :active-id="activeWaypointId"
        :loading="loading.waypoint"
        @select="(id) => (activeWaypointId = id)"
        @add="openWaypointModal()"
        @edit="openWaypointModal"
        @remove="removeWaypoint"
      />
      <RouteList
        class="side-block"
        :list="routes"
        :dogs="dogs"
        :active-id="activeRouteId"
        :loading="loading.route"
        @select="(id) => (activeRouteId = id)"
        @add="openRouteModal()"
        @edit="openRouteModal"
        @publish="publishRouteItem"
        @remove="removeRoute"
      />
    </div>

    <a-modal
      v-model:visible="dogModal.visible"
      :title="dogModal.id ? '编辑机械狗' : '新增机械狗'"
      :ok-loading="dogModal.saving"
      @ok="saveDog"
      unmount-on-close
    >
      <a-form :model="dogForm" layout="vertical">
        <a-form-item label="名称" required><a-input v-model="dogForm.name" /></a-form-item>
        <a-form-item label="SN"><a-input v-model="dogForm.sn" /></a-form-item>
        <a-form-item label="型号"><a-input v-model="dogForm.model" /></a-form-item>
        <a-form-item label="最大速度">
          <a-input-number v-model="dogForm.max_speed" :min="0.1" :max="3" :step="0.1" style="width: 100%" />
        </a-form-item>
        <a-form-item label="备注"><a-input v-model="dogForm.remark" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="wpModal.visible"
      :title="wpModal.id ? '编辑航点' : '新增航点'"
      :ok-loading="wpModal.saving"
      @ok="saveWaypointItem"
      unmount-on-close
    >
      <a-form :model="wpForm" layout="vertical">
        <a-form-item label="名称" required><a-input v-model="wpForm.name" /></a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="X">
              <a-input-number v-model="wpForm.x" :precision="2" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Y">
              <a-input-number v-model="wpForm.y" :precision="2" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Z">
              <a-input-number v-model="wpForm.z" :precision="2" :step="0.01" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Yaw"><a-input-number v-model="wpForm.yaw" :min="-180" :max="180" style="width: 100%" /></a-form-item>
        <a-form-item label="地图ID"><a-input-number v-model="wpForm.map_id" style="width: 100%" /></a-form-item>
        <a-form-item label="备注"><a-input v-model="wpForm.remark" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="routeModal.visible"
      :title="routeModal.id ? '编辑航线' : '新建航线'"
      :ok-loading="routeModal.saving"
      @ok="saveRouteItem"
      unmount-on-close
    >
      <a-form :model="routeForm" layout="vertical">
        <a-form-item label="航线名称" required><a-input v-model="routeForm.name" /></a-form-item>
        <a-form-item label="绑定机械狗">
          <a-select v-model="routeForm.dog_id" allow-clear placeholder="选择机械狗">
            <a-option v-for="d in dogs" :key="d.id" :value="d.id">{{ d.name }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="航点顺序">
          <a-select v-model="routeForm.waypoint_ids" multiple placeholder="选择航点">
            <a-option v-for="w in waypoints" :key="w.id" :value="w.id">{{ w.name }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="备注"><a-input v-model="routeForm.remark" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import PointCloudMap from './components/PointCloudMap.vue';
import DogConfigList from './components/DogConfigList.vue';
import WaypointList from './components/WaypointList.vue';
import RouteList from './components/RouteList.vue';
import {
  delDog,
  delRoute,
  delWaypoint,
  getDogList,
  getRouteList,
  getWaypointList,
  publishRoute,
  saveDog as saveDogApi,
  saveRoute as saveRouteApi,
  saveWaypoint as saveWaypointApi,
  type DogItem,
  type RouteItem,
  type WaypointItem,
} from '@/api/robotdog/waypoint';

const dogs = ref<DogItem[]>([]);
const waypoints = ref<WaypointItem[]>([]);
const routes = ref<RouteItem[]>([]);

const activeDogId = ref<number | null>(null);
const activeWaypointId = ref<number | null>(null);
const activeRouteId = ref<number | null>(null);

/** 当前选中航线的航点顺序（用于地图连线） */
const activeRouteWaypointIds = computed(() => {
  const route = routes.value.find((r) => r.id === activeRouteId.value);
  return route?.waypoint_ids || [];
});

const loading = reactive({ dog: false, waypoint: false, route: false });

const dogModal = reactive({ visible: false, id: null as number | null, saving: false });
const dogForm = reactive({
  name: '',
  sn: '',
  model: 'X30',
  max_speed: 1.0,
  remark: '',
});

const wpModal = reactive({ visible: false, id: null as number | null, saving: false });
const wpForm = reactive({
  name: '',
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  map_id: undefined as number | undefined,
  remark: '',
});

const routeModal = reactive({ visible: false, id: null as number | null, saving: false });
const routeForm = reactive<{
  name: string;
  dog_id: number | null;
  waypoint_ids: number[];
  remark: string;
}>({
  name: '',
  dog_id: null,
  waypoint_ids: [],
  remark: '',
});

const fetchDogs = async () => {
  loading.dog = true;
  try {
    const res = await getDogList({ page: 1, limit: 100 });
    dogs.value = res?.list || [];
    if (!activeDogId.value && dogs.value.length) {
      activeDogId.value = dogs.value[0].id;
    }
  } finally {
    loading.dog = false;
  }
};

const fetchWaypoints = async () => {
  loading.waypoint = true;
  try {
    const res = await getWaypointList({ page: 1, limit: 200 });
    waypoints.value = res?.list || [];
    if (!activeWaypointId.value && waypoints.value.length) {
      activeWaypointId.value = waypoints.value[0].id;
    }
  } finally {
    loading.waypoint = false;
  }
};

const fetchRoutes = async () => {
  loading.route = true;
  try {
    const res = await getRouteList({ page: 1, limit: 100 });
    routes.value = (res?.list || []).map((item) => ({
      ...item,
      waypoint_ids: item.waypoint_ids || [],
    }));
    if (!activeRouteId.value && routes.value.length) {
      activeRouteId.value = routes.value[0].id;
    }
  } finally {
    loading.route = false;
  }
};

const openDogModal = (id?: number) => {
  dogModal.id = id || null;
  if (id) {
    const item = dogs.value.find((d) => d.id === id)!;
    Object.assign(dogForm, {
      name: item.name || '',
      sn: item.sn || '',
      model: item.model || '',
      max_speed: item.max_speed ?? 1,
      remark: item.remark || '',
    });
  } else {
    Object.assign(dogForm, { name: '', sn: '', model: 'X30', max_speed: 1.0, remark: '' });
  }
  dogModal.visible = true;
};

const saveDogItem = async () => {
  if (!dogForm.name.trim()) {
    Message.warning('请填写名称');
    return;
  }
  dogModal.saving = true;
  try {
    await saveDogApi({
      ...(dogModal.id ? { id: dogModal.id } : {}),
      ...dogForm,
    });
    Message.success(dogModal.id ? '机械狗配置已更新' : '机械狗配置已新增');
    dogModal.visible = false;
    await fetchDogs();
  } finally {
    dogModal.saving = false;
  }
};

const saveDog = async () => saveDogItem();

const removeDog = async (id: number) => {
  await delDog({ id });
  Message.success('已删除');
  if (activeDogId.value === id) activeDogId.value = null;
  await fetchDogs();
};

const round2 = (n?: number | null) => Number(Number(n ?? 0).toFixed(2));

const openWaypointModal = (id?: number) => {
  wpModal.id = id || null;
  if (id) {
    const item = waypoints.value.find((w) => w.id === id)!;
    Object.assign(wpForm, {
      name: item.name,
      x: round2(item.x),
      y: round2(item.y),
      z: round2(item.z),
      yaw: item.yaw ?? 0,
      map_id: item.map_id,
      remark: item.remark || '',
    });
  } else {
    Object.assign(wpForm, {
      name: `航点 WP-${waypoints.value.length + 1}`,
      x: 0,
      y: 0,
      z: 0,
      yaw: 0,
      map_id: dogs.value.find((d) => d.id === activeDogId.value)?.map_id,
      remark: '',
    });
  }
  wpModal.visible = true;
};

const saveWaypointItem = async () => {
  if (!wpForm.name.trim()) {
    Message.warning('请填写航点名称');
    return;
  }
  wpModal.saving = true;
  try {
    await saveWaypointApi({
      ...(wpModal.id ? { id: wpModal.id } : {}),
      ...wpForm,
      x: round2(wpForm.x),
      y: round2(wpForm.y),
      z: round2(wpForm.z),
    });
    Message.success(wpModal.id ? '航点已更新' : '航点已新增');
    wpModal.visible = false;
    await fetchWaypoints();
  } finally {
    wpModal.saving = false;
  }
};

const removeWaypoint = async (id: number) => {
  try {
    await delWaypoint({ id });
    Message.success('航点已删除');
    if (activeWaypointId.value === id) activeWaypointId.value = null;
    await Promise.all([fetchWaypoints(), fetchRoutes()]);
  } catch {
    // 错误提示由 http 拦截器处理（如被航线引用）
  }
};

const openRouteModal = async (id?: number) => {
  routeModal.id = id || null;
  if (id) {
    const item = routes.value.find((r) => r.id === id)!;
    routeForm.name = item.name;
    routeForm.dog_id = item.dog_id ?? null;
    routeForm.waypoint_ids = [...(item.waypoint_ids || [])];
    routeForm.remark = item.remark || '';
  } else {
    routeForm.name = '';
    routeForm.dog_id = activeDogId.value;
    routeForm.waypoint_ids = activeWaypointId.value ? [activeWaypointId.value] : [];
    routeForm.remark = '';
  }
  routeModal.visible = true;
};

const saveRouteItem = async () => {
  if (!routeForm.name.trim()) {
    Message.warning('请填写航线名称');
    return;
  }
  if (!routeForm.waypoint_ids.length) {
    Message.warning('请至少选择一个航点');
    return;
  }
  routeModal.saving = true;
  try {
    await saveRouteApi({
      ...(routeModal.id ? { id: routeModal.id } : {}),
      name: routeForm.name,
      dog_id: routeForm.dog_id,
      waypoint_ids: routeForm.waypoint_ids,
      remark: routeForm.remark,
      status: 'draft',
    });
    Message.success(routeModal.id ? '航线已更新' : '航线已创建');
    routeModal.visible = false;
    await fetchRoutes();
  } finally {
    routeModal.saving = false;
  }
};

const publishRouteItem = async (id: number) => {
  await publishRoute({ id });
  Message.success('航线已发布');
  await fetchRoutes();
};

const removeRoute = async (id: number) => {
  await delRoute({ id });
  Message.success('航线已删除');
  if (activeRouteId.value === id) activeRouteId.value = null;
  await fetchRoutes();
};

onMounted(async () => {
  await Promise.all([fetchDogs(), fetchWaypoints(), fetchRoutes()]);
});
</script>

<script lang="ts">
export default {
  name: 'robotdog-waypoint-page',
};
</script>

<style lang="less" scoped>
.waypoint-page {
  height: calc(100vh - 140px);
  min-height: 560px;
  display: grid;
  grid-template-columns: 70% 30%;
  gap: 12px;
  box-sizing: border-box;
}

.map,
.side {
  min-width: 0;
  min-height: 0;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 2px;
  overflow: hidden;
}

.side-block {
  min-height: 0;
  display: flex;
  flex-direction: column;
}

@media screen and (max-width: 1100px) {
  .waypoint-page {
    height: auto;
    grid-template-columns: 1fr;
  }

  .map {
    min-height: 420px;
  }

  .side {
    overflow: visible;
  }

  .side-block {
    min-height: 0;
  }
}
</style>
