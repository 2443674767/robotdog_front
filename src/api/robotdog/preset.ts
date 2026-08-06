import { defHttp } from '@/utils/http';

/**
 * 预置位调试模块接口前缀：/robotdog/preset
 * 使用 ./ 走 Main_url，避免拼到 /admin 下
 */
enum Api {
  getRouteList = './robotdog/preset/getRouteList',
  getPlayUrl = './robotdog/preset/getPlayUrl',
  /** @deprecated 请改用 /robotdog/control/dog/move */
  dogCmd = './robotdog/preset/dogCmd',
  /** 云台控制（预置位模块） */
  ptzMove = './robotdog/preset/ptzMove',
  ptzRealtime = './robotdog/preset/ptzGetRealtime',
  /** @deprecated 兼容旧路径，新代码用 ptzMove */
  ptzCmd = './robotdog/preset/ptzCmd',
  gotoWaypoint = './robotdog/preset/gotoWaypoint',
  runRoute = './robotdog/preset/runRoute',
  getTaskStatus = './robotdog/preset/getTaskStatus',
}

export interface PresetWaypoint {
  id: number;
  name: string;
  x?: number;
  y?: number;
  z?: number;
  yaw?: number;
}

export interface PresetRoute {
  id: number;
  name: string;
  status?: string;
  route_status?: string;
  dog_id?: number | null;
  waypoint_ids?: number[];
  waypoints?: PresetWaypoint[];
  remark?: string;
}

export interface PageResult<T> {
  list: T[];
  total: number;
}

export interface PlayUrlResult {
  dog_id: number;
  play_url?: string;
  rtsp_url?: string;
  protocol?: string;
  api_host?: string;
  api_port?: number;
  connected?: boolean;
}

export function getPresetRouteList(params?: object) {
  return defHttp.get<PageResult<PresetRoute>>(
    { url: Api.getRouteList, params },
    { errorMessageMode: 'message' }
  );
}

export function getPlayUrl(params: { dog_id: number }) {
  return defHttp.get<PlayUrlResult>(
    { url: Api.getPlayUrl, params },
    { errorMessageMode: 'message' }
  );
}

export function dogCmd(params: {
  dog_id: number;
  cmd: string;
  speed?: number;
  duration?: number;
}) {
  return defHttp.post({ url: Api.dogCmd, params }, { errorMessageMode: 'message' });
}

export function ptzCmd(params: {
  cmd: string;
  dog_id?: number;
  pan?: number;
  tilt?: number;
  zoom?: number;
}) {
  return defHttp.post({ url: Api.ptzCmd, params }, { errorMessageMode: 'message' });
}

/** 云台控制：POST /robotdog/preset/ptzMove */
export function ptzMove(params: {
  ptz_id?: number;
  cmd?: string;
  direction?: string;
  speed?: number;
  duration?: number;
  step?: number;
  pan?: number;
  tilt?: number;
}) {
  return defHttp.post({ url: Api.ptzMove, params }, { errorMessageMode: 'message' });
}

/** 云台实时：GET /robotdog/preset/ptzGetRealtime */
export function getPtzRealtime(params?: { ptz_id?: number }) {
  return defHttp.get({ url: Api.ptzRealtime, params }, { errorMessageMode: 'none' });
}

export function gotoWaypoint(params: { dog_id: number; waypoint_id: number }) {
  return defHttp.post({ url: Api.gotoWaypoint, params }, { errorMessageMode: 'message' });
}

export function runRoute(params: { route_id: number; action?: string; dog_id?: number }) {
  return defHttp.post({ url: Api.runRoute, params }, { errorMessageMode: 'message' });
}

export function getTaskStatus(params?: {
  task_id?: string;
  route_id?: number;
  dog_id?: number;
}) {
  return defHttp.get({ url: Api.getTaskStatus, params }, { errorMessageMode: 'message' });
}
