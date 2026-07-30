<template>
  <div class="route-panel">
    <div class="panel-hd">
      <span class="panel-title">航线 / 航点</span>
      <a-button size="mini" type="outline" @click="emit('refresh')">刷新</a-button>
    </div>

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
        <div class="wp-index">{{ idx + 1 }}</div>
        <div class="wp-body">
          <div class="wp-name">{{ wp.name }}</div>
          <div class="wp-meta">
            X {{ wp.x }} · Y {{ wp.y }} · Z {{ wp.z }} · Yaw {{ wp.yaw }}°
          </div>
        </div>
        <a-button size="mini" type="text" @click.stop="emit('goto-waypoint', wp.id)">前往</a-button>
      </div>
      <a-empty v-if="!currentWaypoints.length" description="请选择航线" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type { RouteItem, Waypoint } from '../mock';

const props = defineProps<{
  routes: RouteItem[];
  activeRouteId: number | null;
  activeWaypointId: number | null;
}>();

const emit = defineEmits<{
  (e: 'select-route', id: number): void;
  (e: 'select-waypoint', id: number): void;
  (e: 'goto-waypoint', id: number): void;
  (e: 'refresh'): void;
}>();

const currentWaypoints = computed<Waypoint[]>(() => {
  const route = props.routes.find((r) => r.id === props.activeRouteId);
  return route?.waypoints || [];
});

const statusText = (status: RouteItem['status']) => {
  if (status === 'running') return '执行中';
  if (status === 'done') return '已完成';
  return '待执行';
};

const statusColor = (status: RouteItem['status']) => {
  if (status === 'running') return 'arcoblue';
  if (status === 'done') return 'green';
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

.wp-name {
  font-size: 13px;
  color: var(--color-text-1);
}

.wp-meta {
  margin-top: 2px;
  font-size: 11px;
  color: var(--color-text-3);
}
</style>
