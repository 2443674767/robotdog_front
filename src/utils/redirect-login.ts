/** 整页进入登录页，清除布局/弹层/播放器等残留，避免登录表单无法输入 */
export function redirectToLogin(redirectName?: string) {
  const base = import.meta.env.BASE_URL || '/';
  const redirectQuery =
    redirectName && redirectName !== 'login'
      ? `?redirect=${encodeURIComponent(redirectName)}`
      : '';

  // Hash 模式仅改 # 路径不会触发整页刷新，需改 search 强制重新加载文档
  const url = `${window.location.origin}${base}?_r=${Date.now()}#/login${redirectQuery}`;
  window.location.href = url;
}
