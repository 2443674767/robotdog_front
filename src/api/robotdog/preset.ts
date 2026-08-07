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
  /** 云台控制（预置位模块）POST */
  ptzMove = './robotdog/preset/ptzMove',
  /** GET：与后端 GetPtzGetRealtime 对齐 */
  getPtzGetRealtime = './robotdog/preset/getPtzGetRealtime',
  /** @deprecated 兼容旧路径，新代码用 ptzMove */
  ptzCmd = './robotdog/preset/ptzCmd',
  ptzSetPreset = './robotdog/preset/ptzSetPreset',
  ptzUpdatePresetBase = './robotdog/preset/ptzUpdatePresetBase',
  getPtzPresetList = './robotdog/preset/getPtzPresetList',
  getPtzPresetDetail = './robotdog/preset/getPtzPresetDetail',
  ptzPresetDel = './robotdog/preset/ptzPresetDel',
  ptzPhoto = './robotdog/preset/ptzPhoto',
  getPtzPhotoList = './robotdog/preset/getPtzPhotoList',
  gotoWaypoint = './robotdog/preset/gotoWaypoint',
  runRoute = './robotdog/preset/runRoute',
  getTaskStatus = './robotdog/preset/getTaskStatus',
}

export interface PresetWaypoint {
  id: number;
  name: string;
  /** 航线内序号，从 1 开始 */
  seq?: number;
  x?: number;
  y?: number;
  z?: number;
  yaw?: number;
  /** 1 = 任务航点，可绑云台预置位 */
  is_task?: number;
  /** 关联预置位 ID；无则为 0 */
  preset_id?: number;
}

/** 云台预置位 */
export interface PtzPresetItem {
  id: number;
  tenant_id?: number;
  waypoint_id: number;
  ptz_id?: number;
  name?: string;
  sort_no?: number;
  /** 伺服拍照是否：0 / 1 */
  servo_photo?: number;
  /** 回正是否：0 / 1 */
  auto_home?: number;
  pitch?: number;
  yaw?: number;
  roll?: number;
  zoom?: number;
  focus_status?: string;
  remark?: string;
  raw_data?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PtzPhotoItem {
  id: number;
  tenant_id?: number;
  waypoint_id?: number;
  ptz_id?: number;
  filename?: string;
  file_path?: string;
  /** 预览地址 */
  url?: string;
  mode?: string;
  raw_data?: string;
  created_at?: string;
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
  dog_id?: number;
  cmd?: string;
  direction?: string;
  /** 相对步进；方向单位度，变倍单位倍 */
  step?: number;
  /** 兼容旧字段；未传 step 时可作步进 */
  speed?: number;
  duration?: number;
  axis?: 'yaw' | 'pitch' | 'zoom' | string;
  delta?: number;
  zoom_max?: number;
  yaw?: number;
  pitch?: number;
  pan?: number;
  tilt?: number;
  roll?: number;
  mode?: string;
  folder?: string;
  filename?: string;
}) {
  return defHttp.post({ url: Api.ptzMove, params }, { errorMessageMode: 'message' });
}

/** 云台实时：GET /robotdog/preset/getPtzGetRealtime
 * 文档约定：dog_id 必填（通过机械狗绑定找云台）；ptz_id 可选且优先。
 */
export function getPtzRealtime(params: { dog_id: number; ptz_id?: number; tenant_id?: number }) {
  return defHttp.get({ url: Api.getPtzGetRealtime, params }, { errorMessageMode: 'none' });
}

/** 设置/更新预置位（全部信息，含实时姿态） */
export function ptzSetPreset(params: {
  waypoint_id: number;
  ptz_id?: number;
  dog_id?: number;
  id?: number;
  sort_no?: number;
  servo_photo?: number;
  auto_home?: number;
  name?: string;
  remark?: string;
}) {
  return defHttp.post<PtzPresetItem>(
    { url: Api.ptzSetPreset, params },
    { errorMessageMode: 'message' }
  );
}

/** 仅更新伺服拍照 / 回正开关 */
export function ptzUpdatePresetBase(params: {
  id: number;
  servo_photo: number;
  auto_home: number;
}) {
  return defHttp.post<PtzPresetItem>(
    { url: Api.ptzUpdatePresetBase, params },
    { errorMessageMode: 'message' }
  );
}

export function getPtzPresetList(params?: {
  waypoint_id?: number;
  ptz_id?: number;
  page?: number;
  limit?: number;
}) {
  return defHttp.get<PageResult<PtzPresetItem>>(
    { url: Api.getPtzPresetList, params },
    { errorMessageMode: 'message' }
  );
}

export function getPtzPresetDetail(params: { id: number }) {
  return defHttp.get<PtzPresetItem>(
    { url: Api.getPtzPresetDetail, params },
    { errorMessageMode: 'message' }
  );
}

export function ptzPresetDel(params: { id: number }) {
  return defHttp.post({ url: Api.ptzPresetDel, params }, { errorMessageMode: 'message' });
}

export function ptzPhoto(params?: {
  ptz_id?: number;
  dog_id?: number;
  waypoint_id?: number;
  mode?: string;
  folder?: string;
  filename?: string;
}) {
  return defHttp.post<PtzPhotoItem>(
    { url: Api.ptzPhoto, params },
    { errorMessageMode: 'message' }
  );
}

export function getPtzPhotoList(params?: {
  waypoint_id?: number;
  ptz_id?: number;
  page?: number;
  limit?: number;
}) {
  return defHttp.get<PageResult<PtzPhotoItem>>(
    { url: Api.getPtzPhotoList, params },
    { errorMessageMode: 'message' }
  );
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
