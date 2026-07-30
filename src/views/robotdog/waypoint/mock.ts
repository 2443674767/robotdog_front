/** 航线规划占位数据 */

export interface DogConfig {
  id: number;
  name: string;
  sn: string;
  model: string;
  status: 'online' | 'offline' | 'busy';
  maxSpeed: number;
  battery: number;
}

export interface WaypointItem {
  id: number;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  remark?: string;
}

export interface RoutePlan {
  id: number;
  name: string;
  dogId: number | null;
  waypointIds: number[];
  status: 'draft' | 'ready' | 'published';
  updatedAt: string;
}

export const mockDogs: DogConfig[] = [
  { id: 1, name: '巡检犬-01', sn: 'DOG-2026-001', model: 'X30', status: 'online', maxSpeed: 1.2, battery: 86 },
  { id: 2, name: '巡检犬-02', sn: 'DOG-2026-002', model: 'X30', status: 'busy', maxSpeed: 1.0, battery: 62 },
  { id: 3, name: '安防犬-03', sn: 'DOG-2026-003', model: 'B2', status: 'offline', maxSpeed: 0.8, battery: 15 },
];

export const mockWaypoints: WaypointItem[] = [
  { id: 101, name: '起点 WP-01', x: 0, y: 0, z: 0, yaw: 0, remark: '充电桩附近' },
  { id: 102, name: '拐点 WP-02', x: 3.2, y: 0.5, z: 0, yaw: 45 },
  { id: 103, name: '观察点 WP-03', x: 3.2, y: 4.1, z: 0.2, yaw: 90, remark: '设备间门口' },
  { id: 104, name: '终点 WP-04', x: 0.5, y: 4.1, z: 0, yaw: 180 },
];

export const mockRoutes: RoutePlan[] = [
  {
    id: 1,
    name: '东区日常巡检',
    dogId: 1,
    waypointIds: [101, 102, 103, 104],
    status: 'published',
    updatedAt: '2026-07-30 10:20',
  },
  {
    id: 2,
    name: '仓库夜巡',
    dogId: 2,
    waypointIds: [101, 103],
    status: 'draft',
    updatedAt: '2026-07-29 18:05',
  },
];
