import { defHttp } from '@/utils/http';

/**
 * 机械狗控制接口：/robotdog/control/dog/...
 * 云台请走 /robotdog/preset/...
 */
enum Api {
  dogMove = './robotdog/control/dog/move',
  dogRealtime = './robotdog/control/dog/getRealtime',
  dogSetGait = './robotdog/control/dog/setGait',
  dogCharge = './robotdog/control/dog/charge',
}

export type DogDirection = 'forward' | 'backward' | 'left' | 'right' | 'stop' | string;

export type DogGait = 'basic' | 'stair' | string;

export type DogChargeAction = 'enter' | 'exit' | string;

export interface DogRealtimeData {
  battery?: number | string | null;
  /** 控制/导航状态原文，直接展示 */
  nav_status?: string | null;
  control_status?: string | null;
  [key: string]: unknown;
}

export interface DogRealtimeResult {
  device_type?: string;
  target_id?: number;
  driver?: string;
  at?: string;
  /** 规范化后的状态（后端宜直接返回） */
  battery?: number | null;
  nav_status?: string | null;
  data?: DogRealtimeData;
}

export function dogMove(params: {
  dog_id: number;
  direction: DogDirection;
  speed?: number;
  duration?: number;
}) {
  return defHttp.post({ url: Api.dogMove, params }, { errorMessageMode: 'message' });
}

export function getDogRealtime(params: { dog_id: number }) {
  return defHttp.get<DogRealtimeResult>(
    { url: Api.dogRealtime, params },
    { errorMessageMode: 'none' }
  );
}

export function setDogGait(params: { dog_id: number; gait: DogGait }) {
  return defHttp.post({ url: Api.dogSetGait, params }, { errorMessageMode: 'message' });
}

export function dogCharge(params: { dog_id: number; action: DogChargeAction }) {
  return defHttp.post({ url: Api.dogCharge, params }, { errorMessageMode: 'message' });
}

/** 从 getRealtime 响应中解析电量与导航/控制状态文案 */
export function parseDogRealtime(res?: DogRealtimeResult | null): {
  battery: number | null;
  navStatus: string;
} {
  if (!res) return { battery: null, navStatus: '未知' };
  const nested = res.data || {};
  const rawBattery = res.battery ?? nested.battery;
  let battery: number | null = null;
  if (rawBattery != null && rawBattery !== '') {
    const n = Number(rawBattery);
    if (!Number.isNaN(n)) battery = Math.max(0, Math.min(100, n));
  }
  const navStatus =
    String(
      res.nav_status ||
        nested.nav_status ||
        nested.control_status ||
        nested.ControlStatus ||
        ''
    ).trim() || '未知';
  return { battery, navStatus };
}
