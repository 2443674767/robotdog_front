<template>
  <div class="route-task-table">
    <div class="table-hd">
      <span>子任务流程</span>
      <a-button size="mini" type="primary" @click="addRow()">添加子任务</a-button>
    </div>
    <div class="table-wrap">
      <div class="thead">
        <div class="col col-drag" />
        <div class="col col-seq">ID</div>
        <div class="col col-action">功能</div>
        <div class="col col-wait">等待(秒)</div>
        <div class="col col-ops">操作</div>
      </div>
      <VueDraggable
        v-model="innerList"
        :animation="180"
        handle=".drag-handle"
        :force-fallback="true"
        fallback-class="route-task-fallback"
        :fallback-on-body="true"
        :bubble-scroll="true"
        @end="renumber"
      >
        <div v-for="(row, index) in innerList" :key="row.uid" class="trow">
          <div class="col col-drag">
            <span class="drag-handle" title="拖动排序">⋮⋮</span>
          </div>
          <div class="col col-seq">{{ index + 1 }}</div>
          <div class="col col-action">
            <div class="action-row">
              <a-select
                :model-value="row.action || undefined"
                placeholder="选择功能"
                allow-clear
                style="min-width: 140px; flex: 1"
                @change="(v: string) => onActionSelect(row, v)"
              >
                <a-option v-for="opt in ACTION_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </a-option>
              </a-select>
              <a-select
                v-if="row.action === 'switch_map'"
                :model-value="row.map_name || undefined"
                placeholder="选择地图"
                allow-search
                :loading="mapsLoading"
                style="min-width: 140px; flex: 1"
                @focus="ensureMapsLoaded"
                @change="(v: string) => onMapSelect(row, v)"
              >
                <a-option v-for="m in mapOptions" :key="m" :value="m">{{ m }}</a-option>
              </a-select>
              <a-select
                v-if="row.action === 'navigate'"
                :model-value="row.waypoint_id"
                placeholder="选择航点"
                allow-search
                allow-clear
                style="min-width: 140px; flex: 1"
                @change="(v: number) => onWaypointSelect(row, v)"
              >
                <a-option v-for="wp in waypoints" :key="wp.id" :value="wp.id">
                  {{ wp.name || `航点#${wp.id}` }}
                </a-option>
              </a-select>
              <a-select
                v-if="row.action === 'relocalize'"
                :model-value="row.nav_id"
                placeholder="选择导航点"
                allow-search
                allow-clear
                :loading="navLoading"
                style="min-width: 140px; flex: 1"
                @focus="ensureNavLoaded"
                @change="(v: number) => onNavSelect(row, v)"
              >
                <a-option v-for="n in navOptions" :key="n.id" :value="n.id">
                  {{ n.name }}
                </a-option>
              </a-select>
            </div>
          </div>
          <div class="col col-wait">
            <a-input-number
              :model-value="row.wait_sec"
              :min="0"
              :precision="0"
              :step="1"
              hide-button
              placeholder="0"
              style="width: 100%"
              @change="(v: number) => onWaitChange(row, v)"
            />
          </div>
          <div class="col col-ops">
            <a-button size="mini" type="text" @click="addRow(index)">增加</a-button>
            <a-button size="mini" type="text" status="danger" @click="removeRow(index)">删除</a-button>
          </div>
        </div>
      </VueDraggable>
      <a-empty v-if="!innerList.length" description="暂无子任务" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import { Message } from '@arco-design/web-vue';
import { VueDraggable } from 'vue-draggable-plus';
import {
  getMapList,
  getNavPointList,
  type NavDataItem,
  type RouteTaskItem,
  type RouteTaskParams,
  type WaypointItem,
} from '@/api/robotdog/waypoint';

export type TaskRow = {
  uid: string;
  action: string;
  wait_sec: number;
  map_name?: string;
  waypoint_id?: number;
  /** relocalize：导航点位 ID */
  nav_id?: number;
};

const ACTION_OPTIONS = [
  { value: 'lie', label: '卧倒' },
  { value: 'stand', label: '站立' },
  { value: 'navigate', label: '导航' },
  { value: 'line_navigate', label: '直线导航' },
  { value: 'photo', label: '拍照' },
  { value: 'switch_map', label: '切换地图' },
  { value: 'relocalize', label: '重定位' },
  { value: 'voice', label: '语音指令' },
];

const props = withDefaults(
  defineProps<{
    modelValue?: RouteTaskItem[];
    waypoints?: WaypointItem[];
  }>(),
  {
    waypoints: () => [],
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: RouteTaskItem[]): void;
}>();

let uidSeq = 0;
const genUid = () => `task-${Date.now()}-${++uidSeq}`;

const createEmptyRow = (): TaskRow => ({
  uid: genUid(),
  action: '',
  wait_sec: 0,
  map_name: undefined,
  waypoint_id: undefined,
  nav_id: undefined,
});

const toRows = (tasks?: RouteTaskItem[]): TaskRow[] => {
  if (!tasks?.length) return [createEmptyRow()];
  return tasks.map((t) => ({
    uid: genUid(),
    action: t.action || '',
    wait_sec: Number(t.wait_sec) || 0,
    map_name: t.params?.map_name,
    waypoint_id:
      t.params?.waypoint_id != null && Number(t.params.waypoint_id) > 0
        ? Number(t.params.waypoint_id)
        : undefined,
    nav_id:
      t.params?.id != null && Number(t.params.id) > 0 ? Number(t.params.id) : undefined,
  }));
};

const toTasks = (rows: TaskRow[]): RouteTaskItem[] =>
  rows.map((row, i) => {
    const params: RouteTaskParams = {};
    if (row.action === 'switch_map' && row.map_name) {
      params.map_name = row.map_name;
    }
    if (row.action === 'navigate' && row.waypoint_id != null) {
      params.waypoint_id = Number(row.waypoint_id);
    }
    if (row.action === 'relocalize' && row.nav_id != null) {
      params.id = Number(row.nav_id);
    }
    return {
      seq: i + 1,
      action: row.action,
      wait_sec: Number(row.wait_sec) || 0,
      params,
    };
  });

const innerList = ref<TaskRow[]>(toRows(props.modelValue));
const mapOptions = ref<string[]>([]);
const mapsLoading = ref(false);
let mapsLoaded = false;

const navOptions = ref<NavDataItem[]>([]);
const navLoading = ref(false);
let navLoaded = false;

const syncOut = () => {
  emit('update:modelValue', toTasks(innerList.value));
};

const renumber = () => {
  syncOut();
};

const addRow = (afterIndex?: number) => {
  const row = createEmptyRow();
  if (afterIndex === undefined || afterIndex < 0) {
    innerList.value.push(row);
  } else {
    innerList.value.splice(afterIndex + 1, 0, row);
  }
  syncOut();
};

const removeRow = (index: number) => {
  innerList.value.splice(index, 1);
  if (!innerList.value.length) {
    innerList.value.push(createEmptyRow());
  }
  syncOut();
};

const ensureMapsLoaded = async () => {
  if (mapsLoaded || mapsLoading.value) return;
  mapsLoading.value = true;
  try {
    const res = await getMapList({ page: 1, limit: 200 });
    mapOptions.value = (res?.list || [])
      .map((m) => String(m.name || '').trim())
      .filter(Boolean);
  } catch {
    mapOptions.value = [];
  } finally {
    mapsLoaded = true;
    mapsLoading.value = false;
  }
};

const ensureNavLoaded = async () => {
  if (navLoaded || navLoading.value) return;
  navLoading.value = true;
  try {
    const res = await getNavPointList({ page: 1 });
    navOptions.value = res.list || [];
  } catch {
    navOptions.value = [];
  } finally {
    navLoaded = true;
    navLoading.value = false;
  }
};

const onActionSelect = (row: TaskRow, v: string) => {
  row.action = v || '';
  if (row.action !== 'switch_map') {
    row.map_name = undefined;
  } else {
    ensureMapsLoaded();
  }
  if (row.action !== 'navigate') {
    row.waypoint_id = undefined;
  }
  if (row.action !== 'relocalize') {
    row.nav_id = undefined;
  } else {
    ensureNavLoaded();
  }
  syncOut();
};

const onMapSelect = (row: TaskRow, v: string) => {
  row.map_name = v || undefined;
  syncOut();
};

const onWaypointSelect = (row: TaskRow, v: number) => {
  row.waypoint_id = v != null && Number(v) > 0 ? Number(v) : undefined;
  syncOut();
};

const onNavSelect = (row: TaskRow, v: number) => {
  row.nav_id = v != null && Number(v) > 0 ? Number(v) : undefined;
  syncOut();
};

const onWaitChange = (row: TaskRow, v: number) => {
  row.wait_sec = Number(v) || 0;
  syncOut();
};

watch(
  () => props.modelValue,
  (val) => {
    const next = toRows(val);
    const sameLen = next.length === innerList.value.length;
    const sameActions =
      sameLen &&
      next.every(
        (r, i) =>
          r.action === innerList.value[i].action &&
          r.wait_sec === innerList.value[i].wait_sec &&
          (r.map_name || '') === (innerList.value[i].map_name || '') &&
          (r.waypoint_id || 0) === (innerList.value[i].waypoint_id || 0) &&
          (r.nav_id || 0) === (innerList.value[i].nav_id || 0)
      );
    if (!sameActions) {
      innerList.value = next;
    }
  },
  { deep: true }
);

onMounted(() => {
  if (innerList.value.some((r) => r.action === 'switch_map')) {
    ensureMapsLoaded();
  }
  if (innerList.value.some((r) => r.action === 'relocalize')) {
    ensureNavLoaded();
  }
});

defineExpose({
  getTasks: () => toTasks(innerList.value),
  validate: () => {
    const tasks = toTasks(innerList.value).filter((t) => t.action);
    if (!tasks.length) {
      Message.warning('请至少配置一个子任务功能');
      return false;
    }
    for (const t of tasks) {
      if (t.action === 'switch_map' && !t.params?.map_name) {
        Message.warning(`子任务 ${t.seq}：请选择地图`);
        return false;
      }
      if (t.action === 'navigate' && !t.params?.waypoint_id) {
        Message.warning(`子任务 ${t.seq}：请选择航点`);
        return false;
      }
      if (t.action === 'relocalize' && !t.params?.id) {
        Message.warning(`子任务 ${t.seq}：请选择导航点`);
        return false;
      }
    }
    return true;
  },
});
</script>

<style lang="less" scoped>
.route-task-table {
  width: 100%;
}

.table-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-1);
}

.table-wrap {
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  overflow: visible;
  background: var(--color-bg-2);
}

.thead,
.trow {
  display: grid;
  grid-template-columns: 28px 44px minmax(220px, 1.6fr) 100px 120px;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
}

.thead {
  background: var(--color-fill-2);
  font-size: 12px;
  color: var(--color-text-3);
  font-weight: 600;
}

.trow {
  border-top: 1px solid var(--color-border-2);
  background: var(--color-bg-1);
}

.drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  min-height: 28px;
  cursor: grab;
  user-select: none;
  touch-action: none;
  color: var(--color-text-3);
  letter-spacing: -2px;
  font-size: 14px;
  padding: 4px;

  &:active {
    cursor: grabbing;
  }
}

.col-seq {
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-2);
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}

.col-ops {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
}
</style>
