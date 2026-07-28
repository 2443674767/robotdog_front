import type { RouteRecordNormalized } from 'vue-router';
import type { AppRouteRecordRaw } from '/@/router/types';
export interface AppState {
  theme: string;
  layout: string;
  colorWeak: boolean;
  navbar: boolean;
  menu: boolean;
  topMenu: boolean;
  hideMenu: boolean;
  menuCollapse: boolean;
  footer: boolean;
  breadcrumb: boolean;
  breadcrumbHeight: number;
  themeColor: string;
  menuDark: boolean;
  navBg: boolean;
  menuWidth: number;
  globalSettings: boolean;
  device: string;
  tabBar: boolean;
  tabMode: string;
  menuFromServer: boolean;
  menuAccordion: boolean;
  serverMenu: RouteRecordNormalized[];
  serverRoute: AppRouteRecordRaw[];
  isDynamicAddedRoute:boolean;
  [key: string]: unknown;
}
