import { defHttp } from '@/utils/http';

/**
 * 航线任务执行模块接口前缀：/robotdog/task
 * 使用 ./ 走 Main_url，避免拼到 /admin 下
 */
enum Api {
  startRoute = './robotdog/task/startRoute',
}

export interface StartRouteResult {
  task_id: string;
  route_id: number;
  dog_id?: number;
  status?: string;
  step_count?: number;
}

export function startRoute(params: { route_id: number }) {
  return defHttp.post<StartRouteResult>(
    { url: Api.startRoute, params },
    { errorMessageMode: 'message' }
  );
}
