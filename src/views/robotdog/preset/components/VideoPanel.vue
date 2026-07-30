<template>
  <div class="video-panel">
    <div class="video-hd">
      <span class="title">实时视频</span>
      <span class="clock">{{ nowText }}</span>
    </div>
    <div class="video-stage">
      <video
        v-show="playing"
        ref="videoRef"
        class="video-el"
        muted
        autoplay
        playsinline
      />
      <div v-if="!playing" class="placeholder">
        <div class="tip">
          {{ streamPlayUrl ? '视频流加载中…' : '请配置 StreamPlayUrl（RTSP 转码后地址）' }}
        </div>
        <div v-if="rtspUrl" class="rtsp">RTSP: {{ rtspUrl }}</div>
        <div v-if="errorMsg" class="err">{{ errorMsg }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import dayjs from 'dayjs';

const videoRef = ref<HTMLVideoElement | null>(null);
const nowText = ref(dayjs().format('YYYY-MM-DD HH:mm:ss'));
const playing = ref(false);
const errorMsg = ref('');
let clockTimer: number | undefined;
let flvPlayer: { destroy: () => void } | null = null;
let hlsPlayer: { destroy: () => void } | null = null;

const rtspUrl = computed(() => window?.globalConfig?.RtspUrl || '');
const streamPlayUrl = computed(() => window?.globalConfig?.StreamPlayUrl || '');

const isFlv = (url: string) => /\.flv(\?|$)/i.test(url) || /flv/i.test(url);
const isHls = (url: string) => /\.m3u8(\?|$)/i.test(url);

const destroyPlayers = () => {
  if (flvPlayer) {
    try {
      flvPlayer.destroy();
    } catch {
      /* ignore */
    }
    flvPlayer = null;
  }
  if (hlsPlayer) {
    try {
      hlsPlayer.destroy();
    } catch {
      /* ignore */
    }
    hlsPlayer = null;
  }
  if (videoRef.value) {
    videoRef.value.removeAttribute('src');
    videoRef.value.load();
  }
};

const startPlay = async () => {
  const url = streamPlayUrl.value?.trim();
  const el = videoRef.value;
  if (!url || !el) {
    playing.value = false;
    return;
  }
  destroyPlayers();
  errorMsg.value = '';
  try {
    if (isHls(url)) {
      const canNative = el.canPlayType('application/vnd.apple.mpegurl');
      if (canNative) {
        el.src = url;
        await el.play();
        playing.value = true;
        return;
      }
      const Hls = (await import('hls.js')).default;
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(el);
        hls.on(Hls.Events.MANIFEST_PARSED, async () => {
          try {
            await el.play();
            playing.value = true;
          } catch {
            errorMsg.value = '自动播放失败';
            playing.value = false;
          }
        });
        hlsPlayer = hls;
        return;
      }
      errorMsg.value = '当前浏览器不支持 HLS';
      return;
    }
    if (isFlv(url)) {
      const mpegts = (await import('mpegts.js')).default;
      if (mpegts.getFeatureList().mseLivePlayback) {
        const player = mpegts.createPlayer({ type: 'flv', isLive: true, url });
        player.attachMediaElement(el);
        player.load();
        await player.play();
        flvPlayer = player;
        playing.value = true;
        return;
      }
      errorMsg.value = '当前浏览器不支持 FLV';
      return;
    }
    el.src = url;
    await el.play();
    playing.value = true;
  } catch (e) {
    errorMsg.value = (e as Error)?.message || '视频播放失败';
    playing.value = false;
  }
};

onMounted(() => {
  clockTimer = window.setInterval(() => {
    nowText.value = dayjs().format('YYYY-MM-DD HH:mm:ss');
  }, 1000);
  startPlay();
});

onBeforeUnmount(() => {
  if (clockTimer) window.clearInterval(clockTimer);
  destroyPlayers();
});
</script>

<style lang="less" scoped>
.video-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #0b1220;
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  overflow: hidden;
}

.video-hd {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(22, 119, 255, 0.16);
  border-bottom: 1px solid rgba(64, 158, 255, 0.25);

  .title {
    color: #e8f3ff;
    font-size: 14px;
    font-weight: 600;
  }
  .clock {
    color: #7ed0ff;
    font-variant-numeric: tabular-nums;
    font-size: 13px;
  }
}

.video-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  background: #020814;
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
  padding: 20px;
  text-align: center;
  color: rgba(186, 220, 255, 0.85);
  font-size: 13px;
}

.rtsp {
  font-size: 12px;
  color: rgba(126, 208, 255, 0.7);
  word-break: break-all;
}

.err {
  color: #ff9a9a;
  font-size: 12px;
}
</style>
