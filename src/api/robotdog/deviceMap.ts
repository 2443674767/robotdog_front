/**
 * 设备侧地图列表（外置服务，非 GoFly /admin）
 * 全局 config 仅配置 IP/端口；本文件维护接口路径。
 * 开发环境走 Vite 代理 /robot-map-api，生产直连 http://{ip}:{port}
 */

/** 接口路径（不进 globalConfig） */
const ApiPath = {
  getMapData: '/api/extra/get_map_data',
} as const;

export type DeviceMapItem = {
  col1: string;
  col2?: string;
  col3?: string;
};

function mapApiOrigin(): string {
  const cfg = window?.globalConfig || {};
  const ip = cfg.RobotMapApiIp || '10.21.31.100';
  const port = cfg.RobotMapApiPort || 9000;
  return `http://${ip}:${port}`;
}

function mapApiBase(): string {
  if (import.meta.env.DEV) {
    return '/robot-map-api';
  }
  return mapApiOrigin();
}

/** 规范化可能略乱的 data 数组，只保留带 col1 的项 */
function normalizeMapList(raw: unknown): DeviceMapItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const col1 = String((item as DeviceMapItem).col1 || '').trim();
      if (!col1) return null;
      return {
        col1,
        col2: (item as DeviceMapItem).col2,
        col3: (item as DeviceMapItem).col3,
      };
    })
    .filter(Boolean) as DeviceMapItem[];
}

export async function getDeviceMapData(params?: { page?: number }): Promise<{
  list: DeviceMapItem[];
  totalPages?: number;
}> {
  const page = params?.page ?? 1;
  const url = `${mapApiBase()}${ApiPath.getMapData}?page=${page}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`获取地图列表失败 ${res.status}`);
  }
  const json = await res.json();
  return {
    list: normalizeMapList(json?.data),
    totalPages: Number(json?.totalPages) || undefined,
  };
}
