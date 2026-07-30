/** 整页进入登录页，清除布局/弹层/播放器等残留，避免登录表单无法输入 */
export function redirectToLogin(redirectName?: string) {
  const base = import.meta.env.BASE_URL || '/';
  const redirectQuery =
    redirectName && redirectName !== 'login'
      ? `?redirect=${encodeURIComponent(redirectName)}`
      : '';

  // 去掉 ?_r= 等 search，只保留干净 origin+base，再强制整页刷新
  //（Hash 模式仅改 hash 不会刷新文档）
  const cleanBase = `${window.location.origin}${base}`;
  window.location.replace(`${cleanBase}#/login${redirectQuery}`);
  window.location.reload();
}
