import { mergeConfig } from 'vite';
import baseConfig from './vite.config.base';

export default mergeConfig(
  {
    mode: 'development',
    server: {
      open: false,
      fs: {
        strict: true,
      },
      host: true,
      port:9500,
      proxy: {
        '/admin': {
          target: 'http://127.0.0.1:8500/admin',//代理的地址(http://youdomain.cn替换你自己的)
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/admin/, '')//这里的/需要转义
        },
        '/robot-map-api': {
          target: 'http://10.21.31.100:9000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/robot-map-api/, ''),
        },
      }
    },
    plugins: [
    ],
  },
  baseConfig
);
