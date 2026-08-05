import type { RouteItem, RouteTaskItem } from '@/api/robotdog/waypoint';

/** 从航线中解析航点 ID 顺序（兼容 waypoint_ids 与 navigate 子任务） */
export function getRouteWaypointIds(route?: {
  waypoint_ids?: number[];
  tasks?: RouteTaskItem[];
} | null): number[] {
  if (!route) return [];
  if (route.waypoint_ids?.length) return [...route.waypoint_ids];
  const ids: number[] = [];
  const tasks = [...(route.tasks || [])].sort((a, b) => (a.seq || 0) - (b.seq || 0));
  tasks.forEach((t) => {
    if (t.action === 'navigate' && t.params?.waypoint_id != null) {
      const id = Number(t.params.waypoint_id);
      if (id > 0 && !ids.includes(id)) ids.push(id);
    }
  });
  return ids;
}

export function routeWaypointCount(route: RouteItem): number {
  return getRouteWaypointIds(route).length;
}
