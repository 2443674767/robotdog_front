import { defHttp } from '@/utils/http';

/**
 * 航线规划模块接口前缀：/robotdog/waypoint
 * 使用 ./ 走 Main_url，避免拼到 /admin 下
 */
enum Api {
  getList = './robotdog/waypoint/getList',
  save = './robotdog/waypoint/save',
  del = './robotdog/waypoint/del',
  getDetail = './robotdog/waypoint/getDetail',
  getWaypointList = './robotdog/waypoint/getWaypointList',
  saveWaypoint = './robotdog/waypoint/saveWaypoint',
  delWaypoint = './robotdog/waypoint/delWaypoint',
  importWaypoint = './robotdog/waypoint/importWaypoint',
  getRouteList = './robotdog/waypoint/getRouteList',
  saveRoute = './robotdog/waypoint/saveRoute',
  publishRoute = './robotdog/waypoint/publishRoute',
  unpublishRoute = './robotdog/waypoint/unpublishRoute',
  delRoute = './robotdog/waypoint/delRoute',
  getRouteDetail = './robotdog/waypoint/getRouteDetail',
  getPointCloud = './robotdog/waypoint/getPointCloud',
  getMapList = './robotdog/waypoint/getMapList',
  uploadMap = './robotdog/waypoint/uploadMap',
  getNavData = './robotdog/waypoint/getNavData',
}

export interface DogItem {
  id: number;
  tenant_id?: number;
  name: string;
  sn?: string;
  model?: string;
  status?: 'online' | 'offline' | 'busy' | string;
  max_speed?: number;
  battery?: number;
  stream_url?: string;
  rtsp_url?: string;
  map_id?: number;
  remark?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WaypointItem {
  id: number;
  tenant_id?: number;
  dog_id?: number;
  map_id?: number;
  name: string;
  x?: number;
  y?: number;
  z?: number;
  yaw?: number;
  remark?: string;
}

export interface RouteTaskParams {
  map_name?: string;
  /** navigate 子任务必填，关联航点 ID */
  waypoint_id?: number;
  /** relocalize 子任务必填，导航点位 ID（getNavData 列表序号，从 1 起） */
  id?: number;
  [key: string]: unknown;
}

export type RouteTaskAction =
  | 'lie'
  | 'stand'
  | 'navigate'
  | 'line_navigate'
  | 'photo'
  | 'switch_map'
  | 'relocalize'
  | 'voice'
  | string;

export interface RouteTaskItem {
  seq: number;
  action: RouteTaskAction;
  wait_sec: number;
  params?: RouteTaskParams;
}

export interface RouteItem {
  id: number;
  tenant_id?: number;
  dog_id?: number | null;
  name: string;
  status?: 'draft' | 'ready' | 'published' | string;
  run_status?: string;
  remark?: string;
  waypoint_ids?: number[];
  tasks?: RouteTaskItem[];
  updated_at?: string;
}

export interface SaveRouteParams {
  id?: number;
  name: string;
  dog_id?: number | null;
  status?: string;
  remark?: string;
  waypoint_ids?: number[];
  tasks?: RouteTaskItem[];
}

export interface PageResult<T> {
  list: T[];
  total: number;
}

export function getDogList(params?: object) {
  return defHttp.get<PageResult<DogItem>>(
    { url: Api.getList, params },
    { errorMessageMode: 'message' }
  );
}

export function saveDog(params: object) {
  return defHttp.post({ url: Api.save, params }, { errorMessageMode: 'message' });
}

export function delDog(params: { id?: number; ids?: number[] }) {
  return defHttp.delete({ url: Api.del, params }, { errorMessageMode: 'message' });
}

export function getDogDetail(params: { id: number }) {
  return defHttp.get({ url: Api.getDetail, params }, { errorMessageMode: 'message' });
}

export function getWaypointList(params?: object) {
  return defHttp.get<PageResult<WaypointItem>>(
    { url: Api.getWaypointList, params },
    { errorMessageMode: 'message' }
  );
}

export function saveWaypoint(params: object) {
  return defHttp.post({ url: Api.saveWaypoint, params }, { errorMessageMode: 'message' });
}

export function delWaypoint(params: { id?: number; ids?: number[] }) {
  return defHttp.delete({ url: Api.delWaypoint, params }, { errorMessageMode: 'message' });
}

export function importWaypoint(params: object) {
  return defHttp.post({ url: Api.importWaypoint, params }, { errorMessageMode: 'message' });
}

export function getRouteList(params?: object) {
  return defHttp.get<PageResult<RouteItem>>(
    { url: Api.getRouteList, params },
    { errorMessageMode: 'message' }
  );
}

export function saveRoute(params: SaveRouteParams | object) {
  return defHttp.post({ url: Api.saveRoute, params }, { errorMessageMode: 'message' });
}

export function publishRoute(params: { id: number }) {
  return defHttp.post({ url: Api.publishRoute, params }, { errorMessageMode: 'message' });
}

export function unpublishRoute(params: { id: number }) {
  return defHttp.post({ url: Api.unpublishRoute, params }, { errorMessageMode: 'message' });
}

export function delRoute(params: { id?: number; ids?: number[] }) {
  return defHttp.delete({ url: Api.delRoute, params }, { errorMessageMode: 'message' });
}

export function getRouteDetail(params: { id: number }) {
  return defHttp.get({ url: Api.getRouteDetail, params }, { errorMessageMode: 'message' });
}

export function getPointCloud(params?: object) {
  return defHttp.get({ url: Api.getPointCloud, params }, { errorMessageMode: 'message' });
}

export function getMapList(params?: object) {
  return defHttp.get<{ list: Array<{ id: number; name: string }>; total: number }>(
    { url: Api.getMapList, params },
    { errorMessageMode: 'none' }
  );
}

export function uploadMap(params: object) {
  return defHttp.post({ url: Api.uploadMap, params }, { errorMessageMode: 'message' });
}

export interface NavDataItem {
  /** 重定位点位 ID，按列表顺序从 1 开始 */
  id: number;
  name: string;
  col1?: string;
  col2?: string;
  col3?: string;
  col4?: string;
}

/** 后端转发设备 get_nav_data；data 内层为点位数组 */
export function getNavData(params?: { page?: number }) {
  return defHttp.get<{
    data?: Array<{ col1?: string; col2?: string; col3?: string; col4?: string }>;
    totalPages?: number;
  }>(
    { url: Api.getNavData, params: { page: params?.page ?? 1 } },
    { errorMessageMode: 'none' }
  );
}

/** 规范化导航点位列表（id = 数组序号，从 1 起）；失败时返回空列表 */
export async function getNavPointList(params?: { page?: number }): Promise<{
  list: NavDataItem[];
  totalPages?: number;
}> {
  try {
    const res = await getNavData(params);
    const raw = Array.isArray(res?.data) ? res.data : [];
    const list: NavDataItem[] = [];
    raw.forEach((item, index) => {
      const name = String(item?.col1 || '').trim();
      if (!name) return;
      list.push({
        id: index + 1,
        name,
        col1: item.col1,
        col2: item.col2,
        col3: item.col3,
        col4: item.col4,
      });
    });
    return { list, totalPages: Number(res?.totalPages) || undefined };
  } catch {
    return { list: [] };
  }
}
