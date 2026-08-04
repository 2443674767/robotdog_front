<template>
  <div class="dual-webrtc">
    <div v-if="showHeader" class="dual-hd">
      <span class="dual-title">{{ title }}</span>
      <span v-if="clock" class="dual-clock">{{ clock }}</span>
    </div>
    <div class="dual-grid" :class="{ 'is-single': streamItems.length <= 1 }">
      <div v-for="item in streamItems" :key="item.key" class="stream-cell">
        <div class="cell-hd">
          <span class="cell-name">{{ item.label }}</span>
          <a-tag size="small" :color="statusColor(item.key)">{{ statusText(item.key) }}</a-tag>
        </div>
        <div class="cell-stage">
          <video
            :ref="(el) => setVideoRef(item.key, el)"
            class="video-el"
            muted
            autoplay
            playsinline
          />
          <div v-if="!playingMap[item.key]" class="placeholder">
            <div class="tip">{{ tipText(item.key, item) }}</div>
            <div v-if="item.playUrl" class="rtsp">播放: {{ item.playUrl }}</div>
            <div v-else-if="item.rtsp" class="rtsp">RTSP: {{ item.rtsp }}</div>
            <div v-if="errorMap[item.key]" class="err">{{ errorMap[item.key] }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, reactive, watch } from 'vue';
import { playWebRtc, type WebRtcMode, type WebRtcSession } from '@/utils/webrtcPlayer';

export type StreamDef = {
  key: string;
  label: string;
  rtsp?: string;
  /** HTTP-FLV / HLS 等浏览器可直接播的地址（优先） */
  playUrl?: string;
  src?: string;
  whepUrl?: string;
};

const props = withDefaults(
  defineProps<{
    title?: string;
    clock?: string;
    showHeader?: boolean;
    streams?: StreamDef[];
  }>(),
  {
    title: '实时视频',
    showHeader: true,
    streams: undefined,
  }
);

const videoEls: Record<string, HTMLVideoElement | null> = {};
const webrtcSessions: Record<string, WebRtcSession | null> = {};
const flvPlayers: Record<string, { destroy: () => void } | null> = {};
const hlsPlayers: Record<string, { destroy: () => void } | null> = {};
const playingMap = reactive<Record<string, boolean>>({});
const errorMap = reactive<Record<string, string>>({});

const isFlv = (url: string) => /\.flv(\?|$)/i.test(url) || /live\.flv/i.test(url) || /flv/i.test(url);
const isHls = (url: string) => /\.m3u8(\?|$)/i.test(url);

const cfgStreams = computed<StreamDef[]>(() => {
  if (props.streams?.length) return props.streams;
  const cfg = window?.globalConfig || {};
  const list = cfg.VideoStreams as StreamDef[] | undefined;
  if (list?.length) return list;
  const play = cfg.StreamPlayUrl || '';
  if (play) {
    return [{ key: 'main', label: '实时画面', playUrl: play, rtsp: cfg.RtspUrl || '' }];
  }
  return [];
});

const streamItems = computed(() => cfgStreams.value);

const mode = computed<WebRtcMode>(
  () => (window?.globalConfig?.WebRtcMode as WebRtcMode) || 'go2rtc'
);
const gateway = computed(() => window?.globalConfig?.WebRtcGateway || '');

const setVideoRef = (key: string, el: unknown) => {
  videoEls[key] = (el as HTMLVideoElement) || null;
};

const statusText = (key: string) => {
  if (playingMap[key]) return '播放中';
  if (errorMap[key]) return '失败';
  return '连接中';
};

const statusColor = (key: string) => {
  if (playingMap[key]) return 'green';
  if (errorMap[key]) return 'red';
  return 'orangered';
};

const tipText = (key: string, item: StreamDef) => {
  if (errorMap[key]) return '视频流加载失败';
  if (item.playUrl) return '视频流加载中…';
  if (mode.value === 'go2rtc' && !gateway.value) {
    return '请配置 playUrl（FLV）或 WebRtcGateway';
  }
  return '连接中…';
};

const stopOne = (key: string) => {
  webrtcSessions[key]?.stop();
  webrtcSessions[key] = null;
  try {
    flvPlayers[key]?.destroy();
  } catch {
    /* ignore */
  }
  flvPlayers[key] = null;
  try {
    hlsPlayers[key]?.destroy();
  } catch {
    /* ignore */
  }
  hlsPlayers[key] = null;
  const el = videoEls[key];
  if (el) {
    el.removeAttribute('src');
    el.srcObject = null;
    el.load();
  }
  playingMap[key] = false;
};

const stopAll = () => {
  Object.keys(videoEls).forEach(stopOne);
  Object.keys(playingMap).forEach((k) => {
    playingMap[k] = false;
  });
};

const playFlv = async (key: string, el: HTMLVideoElement, url: string) => {
  const mpegts = (await import('mpegts.js')).default;
  if (!mpegts.getFeatureList().mseLivePlayback) {
    throw new Error('当前浏览器不支持 FLV 播放');
  }
  const player = mpegts.createPlayer({ type: 'flv', isLive: true, url });
  player.attachMediaElement(el);
  player.load();
  await player.play();
  flvPlayers[key] = player;
  playingMap[key] = true;
};

const playHls = async (key: string, el: HTMLVideoElement, url: string) => {
  if (el.canPlayType('application/vnd.apple.mpegurl')) {
    el.src = url;
    await el.play();
    playingMap[key] = true;
    return;
  }
  const Hls = (await import('hls.js')).default;
  if (!Hls.isSupported()) throw new Error('当前浏览器不支持 HLS');
  const hls = new Hls();
  hls.loadSource(url);
  hls.attachMedia(el);
  await new Promise<void>((resolve, reject) => {
    hls.on(Hls.Events.MANIFEST_PARSED, async () => {
      try {
        await el.play();
        playingMap[key] = true;
        resolve();
      } catch (e) {
        reject(e);
      }
    });
    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (data?.fatal) reject(new Error('HLS 播放失败'));
    });
  });
  hlsPlayers[key] = hls;
};

const startOne = async (item: StreamDef) => {
  const el = videoEls[item.key];
  if (!el) return;
  stopOne(item.key);
  errorMap[item.key] = '';

  const playUrl =
    item.playUrl?.trim() ||
    (streamItems.value.length === 1 ? window?.globalConfig?.StreamPlayUrl || '' : '');

  try {
    if (playUrl) {
      if (isHls(playUrl)) {
        await playHls(item.key, el, playUrl);
        return;
      }
      if (isFlv(playUrl)) {
        await playFlv(item.key, el, playUrl);
        return;
      }
      el.src = playUrl;
      await el.play();
      playingMap[item.key] = true;
      return;
    }

    const session = await playWebRtc({
      video: el,
      mode: mode.value,
      gateway: gateway.value,
      src: item.src || item.rtsp,
      whepUrl: item.whepUrl,
    });
    webrtcSessions[item.key] = session;
    await new Promise((r) => setTimeout(r, 300));
    if (el.srcObject) {
      playingMap[item.key] = true;
    } else {
      const check = window.setInterval(() => {
        if (el.srcObject) {
          playingMap[item.key] = true;
          window.clearInterval(check);
        }
      }, 200);
      window.setTimeout(() => window.clearInterval(check), 8000);
    }
  } catch (e) {
    errorMap[item.key] = (e as Error)?.message || '视频播放失败';
    playingMap[item.key] = false;
  }
};

const startAll = async () => {
  stopAll();
  await Promise.all(streamItems.value.map((item) => startOne(item)));
};

onMounted(() => {
  window.setTimeout(() => startAll(), 50);
});

watch(
  () => JSON.stringify(streamItems.value),
  () => {
    window.setTimeout(() => startAll(), 50);
  }
);

onBeforeUnmount(() => {
  stopAll();
});
</script>

<style lang="less" scoped>
.dual-webrtc {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #0b1220;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  overflow: hidden;
}

.dual-hd {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(22, 119, 255, 0.16);
  border-bottom: 1px solid rgba(64, 158, 255, 0.25);
}

.dual-title {
  color: #e8f3ff;
  font-size: 14px;
  font-weight: 600;
}

.dual-clock {
  color: #7ed0ff;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}

.dual-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: rgba(64, 158, 255, 0.2);

  &.is-single {
    grid-template-columns: 1fr;
  }
}

.stream-cell {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #020814;
}

.cell-hd {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.35);
}

.cell-name {
  color: rgba(232, 243, 255, 0.9);
  font-size: 12px;
}

.cell-stage {
  position: relative;
  flex: 1;
  min-height: 0;
}

.video-el {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  text-align: center;
  color: rgba(186, 220, 255, 0.85);
  font-size: 12px;
  pointer-events: none;
}

.rtsp {
  font-size: 11px;
  color: rgba(126, 208, 255, 0.65);
  word-break: break-all;
}

.err {
  color: #ff9a9a;
  font-size: 11px;
  word-break: break-all;
}

@media screen and (max-width: 900px) {
  .dual-grid {
    grid-template-columns: 1fr;
  }
}
</style>
