import { defHttp } from '@/utils/http';

/**
 * 机械狗 / 云台控制接口：/robotdog/control/...
 * 使用 ./ 走 Main_url，避免拼到 /admin 下
 */
enum Api {
  dogMove = './robotdog/control/dog/move',
  dogRealtime = './robotdog/control/dog/getRealtime',
  ptzMove = './robotdog/control/ptz/move',
  ptzRealtime = './robotdog/control/ptz/getRealtime',
}

export type DogDirection = 'forward' | 'backward' | 'left' | 'right' | 'stop' | string;

export function dogMove(params: {
  dog_id: number;
  direction: DogDirection;
  speed?: number;
  duration?: number;
}) {
  return defHttp.post({ url: Api.dogMove, params }, { errorMessageMode: 'message' });
}

export function getDogRealtime(params: { dog_id: number }) {
  return defHttp.get({ url: Api.dogRealtime, params }, { errorMessageMode: 'message' });
}

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

export function getPtzRealtime(params?: { ptz_id?: number }) {
  return defHttp.get({ url: Api.ptzRealtime, params }, { errorMessageMode: 'message' });
}
