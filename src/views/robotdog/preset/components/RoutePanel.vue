<template>
  <div class="route-panel">
    <div class="panel-hd">
      <span class="panel-title">航线 / 航点</span>
      <a-button size="mini" type="outline" :loading="loading" @click="emit('refresh')">刷新</a-button>
    </div>

    <a-spin :loading="loading" style="width: 100%; flex: 1; min-height: 0; display: flex; flex-direction: column">
      <div class="route-list">
        <div
          v-for="route in routes"
          :key="route.id"
          class="route-item"
          :class="{ active: route.id === activeRouteId }"
          @click="emit('select-route', route.id)"
        >
          <div class="route-name">{{ route.name }}</div>
          <a-tag size="small" :color="statusColor(route.status)">{{ statusText(route.status) }}</a-tag>
        </div>
        <a-empty v-if="!loading && !routes.length" description="暂无已发布航线" />
      </div>

      <div class="panel-sub">航点列表</div>
      <div class="waypoint-list">
        <div
          v-for="(wp, idx) in currentWaypoints"
          :key="wp.id"
          class="waypoint-item"
          :class="{ active: wp.id === activeWaypointId }"
          @click="emit('select-waypoint', wp.id)"
        >
          <div class="wp-index">{{ wp.seq ?? idx + 1 }}</div>
          <div class="wp-body">
            <div class="wp-name-row">
              <span class="wp-name">{{ wp.name }}</span>
              <a-tag v-if="Number(wp.is_task) === 1" size="small" color="orangered">任务</a-tag>
            </div>
            <div class="wp-meta">
              <template v-if="Number(wp.is_task) === 1">
                预置位 {{ Number(wp.preset_id) > 0 ? `#${wp.preset_id}` : '未设置' }}
              </template>
              <template v-else>普通航点</template>
            </div>
          </div>
          <a-button size="mini" type="text" @click.stop="emit('goto-waypoint', wp.id)">前往</a-button>
        </div>
        <a-empty v-if="!loading && !currentWaypoints.length" description="请选择航线" />
      </div>

      <div class="route-actions">
        <a-button type="primary" size="small" :disabled="!activeRouteId" @click="emit('run-route', 'start')">执行航线</a-button>
        <a-button size="small" :disabled="!activeRouteId" @click="emit('run-route', 'pause')">暂停</a-button>
        <a-button size="small" status="warning" :disabled="!activeRouteId" @click="emit('run-route', 'stop')">停止</a-button>
      </div>
    </a-spin>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type { PresetRoute, PresetWaypoint } from '@/api/robotdog/preset';

const props = defineProps<{
  routes: PresetRoute[];
  activeRouteId: number | null;
  activeWaypointId: number | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-route', id: number): void;
  (e: 'select-waypoint', id: number): void;
  (e: 'goto-waypoint', id: number): void;
  (e: 'run-route', action: string): void;
  (e: 'refresh'): void;
}>();

const currentWaypoints = computed<PresetWaypoint[]>(() => {
  const route = props.routes.find((r) => r.id === props.activeRouteId);
  return route?.waypoints || [];
});

const statusText = (status?: string) => {
  if (status === 'running') return '执行中';
  if (status === 'done') return '已完成';
  if (status === 'paused') return '已暂停';
  return '待执行';
};

const statusColor = (status?: string) => {
  if (status === 'running') return 'arcoblue';
  if (status === 'done') return 'green';
  if (status === 'paused') return 'orangered';
  return 'gray';
};
</script>

<style lang="less" scoped>
.route-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  padding: 12px;
}

.panel-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.panel-title,
.panel-sub {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
}

.panel-sub {
  margin: 12px 0 8px;
  padding-left: 8px;
  border-left: 3px solid rgb(var(--primary-6));
}

.route-list,
.waypoint-list {
  min-height: 0;
  overflow: auto;
}

.route-list {
  max-height: 36%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.route-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover,
  &.active {
    border-color: rgb(var(--primary-6));
    background: rgba(var(--primary-6), 0.06);
  }
}

.route-name {
  font-size: 13px;
  color: var(--color-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.waypoint-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.waypoint-item {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  cursor: pointer;

  &:hover,
  &.active {
    border-color: rgb(var(--primary-6));
    background: rgba(var(--primary-6), 0.06);
  }
}

.wp-index {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--primary-6), 0.12);
  color: rgb(var(--primary-6));
  font-size: 12px;
  font-weight: 600;
}

.wp-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.wp-name {
  font-size: 13px;
  color: var(--color-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wp-meta {
  margin-top: 2px;
  font-size: 11px;
  color: var(--color-text-3);
}

.route-actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--color-border-2);
}
</style>
