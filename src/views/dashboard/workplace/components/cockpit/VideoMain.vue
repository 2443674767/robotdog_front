<template>
  <div class="video-main">
    <div class="video-header">
      <span class="video-title">实时监控</span>
      <span class="video-clock">{{ nowText }}</span>
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
      <div v-if="!playing" class="video-placeholder">
        <div class="placeholder-clock">{{ nowText }}</div>
        <div class="placeholder-tip">
          {{ streamPlayUrl ? '视频流加载中…' : '暂无浏览器可播地址，请配置 StreamPlayUrl（由 RTSP 转码）' }}
        </div>
        <div v-if="rtspUrl" class="placeholder-rtsp">RTSP: {{ rtspUrl }}</div>
        <div v-if="errorMsg" class="placeholder-error">{{ errorMsg }}</div>
      </div>
      <div v-else class="video-overlay-clock">{{ nowText }}</div>
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
      const videoCanPlayNatively = el.canPlayType('application/vnd.apple.mpegurl');
      if (videoCanPlayNatively) {
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
          } catch (e) {
            errorMsg.value = '自动播放失败，请检查浏览器权限';
            playing.value = false;
          }
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data?.fatal) {
            errorMsg.value = 'HLS 播放失败，请检查 StreamPlayUrl';
            playing.value = false;
          }
        });
        hlsPlayer = hls;
        return;
      }
      errorMsg.value = '当前浏览器不支持 HLS 播放';
      return;
    }

    if (isFlv(url)) {
      const mpegts = (await import('mpegts.js')).default;
      if (mpegts.getFeatureList().mseLivePlayback) {
        const player = mpegts.createPlayer({
          type: 'flv',
          isLive: true,
          url,
        });
        player.attachMediaElement(el);
        player.load();
        await player.play();
        flvPlayer = player;
        playing.value = true;
        return;
      }
      errorMsg.value = '当前浏览器不支持 FLV 播放';
      return;
    }

    // 普通 mp4 / 其它直链
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
.video-main {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: rgba(4, 14, 30, 0.92);
  border: 1px solid rgba(64, 158, 255, 0.45);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 0 24px rgba(22, 119, 255, 0.15);
}

.video-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: linear-gradient(90deg, rgba(22, 119, 255, 0.25), transparent);
  border-bottom: 1px solid rgba(64, 158, 255, 0.25);
}

.video-title {
  color: #e8f3ff;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
}

.video-clock {
  color: #7ed0ff;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
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

.video-overlay-clock {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #7ed0ff;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

.video-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  text-align: center;
  background:
    radial-gradient(circle at center, rgba(22, 119, 255, 0.12), transparent 55%),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 19px,
      rgba(64, 158, 255, 0.05) 20px
    );
}

.placeholder-clock {
  color: #e8f3ff;
  font-size: 28px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
}

.placeholder-tip {
  color: rgba(186, 220, 255, 0.85);
  font-size: 13px;
  max-width: 420px;
  line-height: 1.6;
}

.placeholder-rtsp {
  color: rgba(126, 208, 255, 0.7);
  font-size: 12px;
  word-break: break-all;
  max-width: 90%;
}

.placeholder-error {
  color: #ff9a9a;
  font-size: 12px;
}
</style>
