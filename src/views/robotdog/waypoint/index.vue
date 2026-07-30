<template>
  <div class="waypoint-page">
    <PointCloudMap
      class="map"
      :waypoints="waypoints"
      :active-waypoint-id="activeWaypointId"
    />
    <div class="side">
      <DogConfigList
        class="side-block"
        :list="dogs"
        :active-id="activeDogId"
        @select="(id) => (activeDogId = id)"
        @add="openDogModal()"
        @edit="openDogModal"
        @remove="removeDog"
      />
      <WaypointList
        class="side-block"
        :list="waypoints"
        :active-id="activeWaypointId"
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
        @select="(id) => (activeRouteId = id)"
        @add="openRouteModal()"
        @edit="openRouteModal"
        @publish="publishRoute"
        @remove="removeRoute"
      />
    </div>

    <!-- 机械狗 -->
    <a-modal
      v-model:visible="dogModal.visible"
      :title="dogModal.id ? '编辑机械狗' : '新增机械狗'"
      @ok="saveDog"
      unmount-on-close
    >
      <a-form :model="dogForm" layout="vertical">
        <a-form-item label="名称"><a-input v-model="dogForm.name" /></a-form-item>
        <a-form-item label="SN"><a-input v-model="dogForm.sn" /></a-form-item>
        <a-form-item label="型号"><a-input v-model="dogForm.model" /></a-form-item>
        <a-form-item label="最大速度">
          <a-input-number v-model="dogForm.maxSpeed" :min="0.1" :max="3" :step="0.1" style="width: 100%" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 航点 -->
    <a-modal
      v-model:visible="wpModal.visible"
      :title="wpModal.id ? '编辑航点' : '新增航点'"
      @ok="saveWaypoint"
      unmount-on-close
    >
      <a-form :model="wpForm" layout="vertical">
        <a-form-item label="名称"><a-input v-model="wpForm.name" /></a-form-item>
        <a-row :gutter="12">
          <a-col :span="8"><a-form-item label="X"><a-input-number v-model="wpForm.x" style="width: 100%" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="Y"><a-input-number v-model="wpForm.y" style="width: 100%" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="Z"><a-input-number v-model="wpForm.z" style="width: 100%" /></a-form-item></a-col>
        </a-row>
        <a-form-item label="Yaw"><a-input-number v-model="wpForm.yaw" :min="-180" :max="180" style="width: 100%" /></a-form-item>
        <a-form-item label="备注"><a-input v-model="wpForm.remark" /></a-form-item>
      </a-form>
    </a-modal>

    <!-- 航线 -->
    <a-modal
      v-model:visible="routeModal.visible"
      :title="routeModal.id ? '编辑航线' : '新建航线'"
      @ok="saveRoute"
      unmount-on-close
    >
      <a-form :model="routeForm" layout="vertical">
        <a-form-item label="航线名称"><a-input v-model="routeForm.name" /></a-form-item>
        <a-form-item label="绑定机械狗">
          <a-select v-model="routeForm.dogId" allow-clear placeholder="选择机械狗">
            <a-option v-for="d in dogs" :key="d.id" :value="d.id">{{ d.name }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="航点顺序">
          <a-select v-model="routeForm.waypointIds" multiple placeholder="选择航点">
            <a-option v-for="w in waypoints" :key="w.id" :value="w.id">{{ w.name }}</a-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue';
import dayjs from 'dayjs';
import { Message } from '@arco-design/web-vue';
import PointCloudMap from './components/PointCloudMap.vue';
import DogConfigList from './components/DogConfigList.vue';
import WaypointList from './components/WaypointList.vue';
import RouteList from './components/RouteList.vue';
import {
  mockDogs,
  mockRoutes,
  mockWaypoints,
  type DogConfig,
  type RoutePlan,
  type WaypointItem,
} from './mock';

const dogs = ref<DogConfig[]>(JSON.parse(JSON.stringify(mockDogs)));
const waypoints = ref<WaypointItem[]>(JSON.parse(JSON.stringify(mockWaypoints)));
const routes = ref<RoutePlan[]>(JSON.parse(JSON.stringify(mockRoutes)));

const activeDogId = ref<number | null>(dogs.value[0]?.id ?? null);
const activeWaypointId = ref<number | null>(waypoints.value[0]?.id ?? null);
const activeRouteId = ref<number | null>(routes.value[0]?.id ?? null);

let idSeq = 1000;
const nextId = () => ++idSeq;

const dogModal = reactive({ visible: false, id: 0 as number | null });
const dogForm = reactive({ name: '', sn: '', model: 'X30', maxSpeed: 1.0 });

const wpModal = reactive({ visible: false, id: 0 as number | null });
const wpForm = reactive({ name: '', x: 0, y: 0, z: 0, yaw: 0, remark: '' });

const routeModal = reactive({ visible: false, id: 0 as number | null });
const routeForm = reactive<{ name: string; dogId: number | null; waypointIds: number[] }>({
  name: '',
  dogId: null,
  waypointIds: [],
});

const openDogModal = (id?: number) => {
  dogModal.id = id || null;
  if (id) {
    const item = dogs.value.find((d) => d.id === id)!;
    Object.assign(dogForm, {
      name: item.name,
      sn: item.sn,
      model: item.model,
      maxSpeed: item.maxSpeed,
    });
  } else {
    Object.assign(dogForm, { name: '', sn: '', model: 'X30', maxSpeed: 1.0 });
  }
  dogModal.visible = true;
};

const saveDog = () => {
  if (!dogForm.name.trim()) {
    Message.warning('请填写名称');
    return;
  }
  if (dogModal.id) {
    const item = dogs.value.find((d) => d.id === dogModal.id)!;
    Object.assign(item, dogForm);
    Message.success('机械狗配置已更新');
  } else {
    dogs.value.unshift({
      id: nextId(),
      ...dogForm,
      status: 'offline',
      battery: 100,
    });
    Message.success('机械狗配置已新增');
  }
  dogModal.visible = false;
};

const removeDog = (id: number) => {
  dogs.value = dogs.value.filter((d) => d.id !== id);
  if (activeDogId.value === id) activeDogId.value = dogs.value[0]?.id ?? null;
  Message.success('已删除');
};

const openWaypointModal = (id?: number) => {
  wpModal.id = id || null;
  if (id) {
    const item = waypoints.value.find((w) => w.id === id)!;
    Object.assign(wpForm, { ...item });
  } else {
    Object.assign(wpForm, {
      name: `航点 WP-${waypoints.value.length + 1}`,
      x: 0,
      y: 0,
      z: 0,
      yaw: 0,
      remark: '',
    });
  }
  wpModal.visible = true;
};

const saveWaypoint = () => {
  if (!wpForm.name.trim()) {
    Message.warning('请填写航点名称');
    return;
  }
  if (wpModal.id) {
    const item = waypoints.value.find((w) => w.id === wpModal.id)!;
    Object.assign(item, wpForm);
    Message.success('航点已更新');
  } else {
    const id = nextId();
    waypoints.value.push({ id, ...wpForm });
    activeWaypointId.value = id;
    Message.success('航点已新增');
  }
  wpModal.visible = false;
};

const removeWaypoint = (id: number) => {
  waypoints.value = waypoints.value.filter((w) => w.id !== id);
  routes.value.forEach((r) => {
    r.waypointIds = r.waypointIds.filter((wid) => wid !== id);
  });
  if (activeWaypointId.value === id) {
    activeWaypointId.value = waypoints.value[0]?.id ?? null;
  }
  Message.success('航点已删除');
};

const openRouteModal = (id?: number) => {
  routeModal.id = id || null;
  if (id) {
    const item = routes.value.find((r) => r.id === id)!;
    routeForm.name = item.name;
    routeForm.dogId = item.dogId;
    routeForm.waypointIds = [...item.waypointIds];
  } else {
    routeForm.name = '';
    routeForm.dogId = activeDogId.value;
    routeForm.waypointIds = activeWaypointId.value ? [activeWaypointId.value] : [];
  }
  routeModal.visible = true;
};

const saveRoute = () => {
  if (!routeForm.name.trim()) {
    Message.warning('请填写航线名称');
    return;
  }
  if (routeModal.id) {
    const item = routes.value.find((r) => r.id === routeModal.id)!;
    item.name = routeForm.name;
    item.dogId = routeForm.dogId;
    item.waypointIds = [...routeForm.waypointIds];
    item.updatedAt = dayjs().format('YYYY-MM-DD HH:mm');
    Message.success('航线已更新');
  } else {
    const id = nextId();
    routes.value.unshift({
      id,
      name: routeForm.name,
      dogId: routeForm.dogId,
      waypointIds: [...routeForm.waypointIds],
      status: 'draft',
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    });
    activeRouteId.value = id;
    Message.success('航线已创建');
  }
  routeModal.visible = false;
};

const publishRoute = (id: number) => {
  const item = routes.value.find((r) => r.id === id);
  if (!item) return;
  if (!item.waypointIds.length) {
    Message.warning('请先为航线添加航点');
    return;
  }
  item.status = 'published';
  item.updatedAt = dayjs().format('YYYY-MM-DD HH:mm');
  Message.success(`航线「${item.name}」已发布（接口待接入）`);
};

const removeRoute = (id: number) => {
  routes.value = routes.value.filter((r) => r.id !== id);
  if (activeRouteId.value === id) activeRouteId.value = routes.value[0]?.id ?? null;
  Message.success('航线已删除');
};
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
  display: grid;
  grid-template-rows: 1fr 1fr 1fr;
  gap: 10px;
  padding-right: 2px;
}

.side-block {
  min-height: 0;
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
    grid-template-rows: none;
  }

  .side-block {
    min-height: 240px;
  }
}
</style>
