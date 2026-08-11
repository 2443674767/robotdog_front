import { Message } from '@arco-design/web-vue';
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
  getRouteWaypointAll = './robotdog/waypoint/getRouteWaypointAll',
  getPointCloud = './robotdog/waypoint/getPointCloud',
  getPcdMap = './robotdog/waypoint/getPcdMap',
  getMapList = './robotdog/waypoint/getMapList',
  getPcdMapList = './robotdog/waypoint/getPcdMapList',
  uploadMap = './robotdog/waypoint/uploadMap',
  uploadPcdMap = './robotdog/waypoint/uploadPcdMap',
  delPcdMap = './robotdog/waypoint/delPcdMap',
  getNavData = './robotdog/waypoint/getNavData',
  getAllMapNavData = './robotdog/waypoint/getAllMapNavData',
}

/** PCD 地图图层 */
export interface PcdMapLayer {
  key: string;
  name: string;
  /** MinIO object path，如 maps/xxx/global_map.pcd */
  path?: string;
  downsize_path?: string;
  /** 后端代理地址（推荐给 PCDLoader，避免 MinIO CORS） */
  url?: string;
  downsize_url?: string;
  /** MinIO 直链，仅作后备 */
  file_url?: string;
  downsize_file_url?: string;
}

/** PCD 点云地图 */
export interface PcdMapItem {
  id: number;
  tenant_id?: number;
  name: string;
  format?: string;
  url?: string;
  file_url?: string;
  preview_url?: string;
  origin_x?: number;
  origin_y?: number;
  origin_z?: number;
  scale?: number;
  layers?: PcdMapLayer[];
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
  /** 1 = 任务航点（可绑云台预置位）；0 = 普通航点 */
  is_task?: number;
  remark?: string;
}

export interface RouteTaskParams {
  /** switch_map：地图名；relocalize 时可附带所属地图名 */
  map_name?: string;
  /** switch_map：设备地图列表序号，从 1 起 */
  map_id?: number;
  /** navigate 子任务必填，关联航点 ID */
  waypoint_id?: number;
  /** relocalize：导航点位在所属地图 points[] 中的序号，从 1 起 */
  id?: number;
  /** relocalize：导航点名称 */
  point_name?: string;
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

/** 航线航点精简全量：GET /robotdog/waypoint/getRouteWaypointAll */
export interface RouteWaypointSlimItem {
  seq: number;
  id: number;
  name: string;
  /** 1 = 任务航点；0 = 普通航点 */
  is_task?: number;
  /** 关联预置位 ID；无则为 0 */
  preset_id?: number;
}

export interface RouteWaypointAllItem {
  route_id: number;
  route_name: string;
  waypoints: RouteWaypointSlimItem[];
}

export function getRouteWaypointAll(params?: {
  tenant_id?: number;
  route_id?: number;
  id?: number;
  dog_id?: number;
  status?: string;
  run_status?: string;
  route_name?: string;
  name?: string;
}) {
  return defHttp.get<PageResult<RouteWaypointAllItem>>(
    { url: Api.getRouteWaypointAll, params },
    { errorMessageMode: 'message' }
  );
}

/** 获取单张点云地图（优先新路径 getPcdMap） */
export function getPcdMap(params?: { map_id?: number; dog_id?: number; tenant_id?: number }) {
  return defHttp.get<PcdMapItem>(
    { url: Api.getPcdMap, params },
    { errorMessageMode: 'message' }
  );
}

/** @deprecated 请改用 getPcdMap */
export function getPointCloud(params?: object) {
  return defHttp.get<PcdMapItem>(
    { url: Api.getPointCloud, params },
    { errorMessageMode: 'message' }
  );
}

/** 获取点云地图列表 */
export function getPcdMapList(params?: {
  page?: number;
  limit?: number;
  name?: string;
  tenant_id?: number;
}) {
  return defHttp.get<PageResult<PcdMapItem>>(
    { url: Api.getPcdMapList, params },
    { errorMessageMode: 'message' }
  );
}

/** @deprecated 请改用 getPcdMapList；设备侧地图列表仍可能走此接口 */
export function getMapList(params?: object) {
  return defHttp.get<{
    data?: Array<{ col1?: string; col2?: string; col3?: string }>;
    list?: Array<{ id?: number; name?: string; col1?: string }>;
    totalPages?: number;
    total?: number;
  }>({ url: Api.getMapList, params }, { errorMessageMode: 'none' });
}

/**
 * 上传多图层 PCD 地图（multipart：files[] + name）
 * 注意：不能走 defHttp.post(FormData)，VAxios.request 内 cloneDeep 会清空 FormData。
 */
export function uploadPcdMap(files: File[], options?: { name?: string }) {
  const formData = new FormData();
  files.forEach((file) => formData.append('files[]', file));
  if (options?.name?.trim()) {
    formData.append('name', options.name.trim());
  }

  const mainUrl =
    import.meta.env.VITE_APP_ENV === 'production'
      ? window?.globalConfig?.Main_url
      : window?.globalConfig?.Main_url_dev;
  const url = `${mainUrl}/robotdog/waypoint/uploadPcdMap`;

  // Content-Type: false 让 axios 删除默认 application/json，由浏览器自动带 multipart boundary
  return defHttp
    .getAxios()
    .request({
      url,
      method: 'POST',
      data: formData,
      timeout: 120000,
      headers: {
        // @ts-expect-error axios 用 false 表示删除该头
        'Content-Type': false,
        // @ts-ignore
        ignoreCancelToken: true,
      },
    })
    .then((res) => {
      const body = res?.data;
      if (body && Reflect.has(body, 'code') && body.code === 0) {
        return body.data as PcdMapItem;
      }
      const msg = body?.message || '上传地图失败';
      Message.error({ content: msg, id: 'errmsg' });
      return Promise.reject(new Error(msg));
    });
}

/** @deprecated 请改用 uploadPcdMap */
export function uploadMap(params: object) {
  return defHttp.post({ url: Api.uploadMap, params }, { errorMessageMode: 'message' });
}

/** 删除点云地图（含 MinIO 下 .pcd 对象） */
export function delPcdMap(params: { id: number }) {
  return defHttp.post(
    { url: Api.delPcdMap, params },
    { errorMessageMode: 'message' }
  );
}

export interface MapNavPointItem {
  /** 点位在所属地图 points[] 中的序号，从 1 起 */
  id: number;
  name: string;
}

export interface MapNavMapItem {
  /** 地图在 data[] 中的序号，从 1 起 */
  id: number;
  name: string;
  points: MapNavPointItem[];
}

export interface AllMapNavData {
  current_map_name: string;
  maps: MapNavMapItem[];
}

/** 一次获取全部地图及其导航点位（后端转发 get_all_map_nav_data） */
export function getAllMapNavDataRaw() {
  return defHttp.get<{
    current_map_name?: string;
    data?: Array<{ name?: string; points?: string[] }>;
  }>({ url: Api.getAllMapNavData }, { errorMessageMode: 'none' });
}

/** 规范化；失败返回空数据，不阻断页面 */
export async function fetchAllMapNavData(): Promise<AllMapNavData> {
  try {
    const res = await getAllMapNavDataRaw();
    const raw = Array.isArray(res?.data) ? res.data : [];
    const maps: MapNavMapItem[] = [];
    raw.forEach((item, index) => {
      const name = String(item?.name || '').trim();
      if (!name) return;
      const points: MapNavPointItem[] = [];
      (Array.isArray(item?.points) ? item.points : []).forEach((p, pi) => {
        const pname = String(p || '').trim();
        if (!pname) return;
        points.push({ id: pi + 1, name: pname });
      });
      maps.push({ id: index + 1, name, points });
    });
    return {
      current_map_name: String(res?.current_map_name || '').trim(),
      maps,
    };
  } catch {
    return { current_map_name: '', maps: [] };
  }
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

/** @deprecated 请改用 fetchAllMapNavData */
export function getNavData(params?: { page?: number }) {
  return defHttp.get<{
    data?: Array<{ col1?: string; col2?: string; col3?: string; col4?: string }>;
    totalPages?: number;
  }>(
    { url: Api.getNavData, params: { page: params?.page ?? 1 } },
    { errorMessageMode: 'none' }
  );
}

/** @deprecated 请改用 fetchAllMapNavData */
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
