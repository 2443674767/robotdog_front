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
  return defHttp.get({ url: Api.getMapList, params }, { errorMessageMode: 'message' });
}

export function uploadMap(params: object) {
  return defHttp.post({ url: Api.uploadMap, params }, { errorMessageMode: 'message' });
}
