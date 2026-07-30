/** 预置位调试占位数据，后续接真实接口替换 */

export interface Waypoint {
  id: number;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface RouteItem {
  id: number;
  name: string;
  status: 'idle' | 'running' | 'done';
  waypoints: Waypoint[];
}

export const mockRoutes: RouteItem[] = [
  {
    id: 1,
    name: '一号巡检航线',
    status: 'idle',
    waypoints: [
      { id: 101, name: '航点 A1', x: 0, y: 0, z: 0, yaw: 0 },
      { id: 102, name: '航点 A2', x: 2.5, y: 0, z: 0, yaw: 45 },
      { id: 103, name: '航点 A3', x: 2.5, y: 3.2, z: 0, yaw: 90 },
      { id: 104, name: '航点 A4', x: 0, y: 3.2, z: 0, yaw: 180 },
    ],
  },
  {
    id: 2,
    name: '二号安防航线',
    status: 'idle',
    waypoints: [
      { id: 201, name: '航点 B1', x: 1, y: 1, z: 0, yaw: 0 },
      { id: 202, name: '航点 B2', x: 4, y: 1, z: 0, yaw: 30 },
      { id: 203, name: '航点 B3', x: 4, y: 5, z: 0, yaw: 120 },
    ],
  },
  {
    id: 3,
    name: '三号预置点位',
    status: 'done',
    waypoints: [
      { id: 301, name: '预置位 P1', x: 0.5, y: 0.5, z: 0, yaw: 0 },
      { id: 302, name: '预置位 P2', x: 1.5, y: 2.0, z: 0, yaw: 60 },
    ],
  },
];
