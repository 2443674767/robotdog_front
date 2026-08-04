/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}
declare interface Window {
  globalConfig: {
    RtspUrl?: string
    StreamPlayUrl?: string
    StreamPlayUrlVisible?: string
    StreamPlayUrlThermal?: string
    WebRtcMode?: 'go2rtc' | 'whep'
    WebRtcGateway?: string
    RtspVisible?: string
    RtspThermal?: string
    RtspMain?: string
    WebRtcSrcVisible?: string
    WebRtcSrcThermal?: string
    VideoStreams?: Array<{
      key: string
      label: string
      rtsp?: string
      playUrl?: string
      src?: string
      whepUrl?: string
    }>
    [key: string]: any
  }
}
declare module '@arco-design/color'
declare module '@umoteam/editor'
declare module 'hls.js'
declare module 'mpegts.js'