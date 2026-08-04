<template>
  <div class="live-stream">
    <div v-if="showHeader" class="live-hd">
      <span class="live-title">{{ title }}</span>
      <span v-if="clock" class="live-clock">{{ clock }}</span>
    </div>
    <div class="live-stage">
      <video ref="videoRef" class="video-el" muted autoplay playsinline />
      <div v-if="!playing" class="placeholder">
        <div class="tip">{{ tip }}</div>
        <div v-if="playUrl" class="url">{{ playUrl }}</div>
        <div v-if="errorMsg" class="err">{{ errorMsg }}</div>
      </div>
      <div v-if="$slots.overlay" class="overlay-slot">
        <slot name="overlay" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    title?: string;
    clock?: string;
    playUrl?: string;
    showHeader?: boolean;
  }>(),
  {
    title: '实时视频',
    showHeader: true,
    playUrl: '',
  }
);

const videoRef = ref<HTMLVideoElement | null>(null);
const playing = ref(false);
const errorMsg = ref('');
let flvPlayer: { destroy: () => void } | null = null;
let hlsPlayer: { destroy: () => void } | null = null;

const tip = computed(() => {
  if (errorMsg.value) return '视频流加载失败';
  if (!props.playUrl) return '未配置播放地址';
  return '视频流加载中…';
});

const isFlv = (url: string) => /\.flv(\?|$)/i.test(url) || /flv/i.test(url);
const isHls = (url: string) => /\.m3u8(\?|$)/i.test(url);

const destroy = () => {
  try {
    flvPlayer?.destroy();
  } catch {
    /* ignore */
  }
  flvPlayer = null;
  try {
    hlsPlayer?.destroy();
  } catch {
    /* ignore */
  }
  hlsPlayer = null;
  const el = videoRef.value;
  if (el) {
    el.removeAttribute('src');
    el.srcObject = null;
    el.load();
  }
  playing.value = false;
};

const start = async () => {
  const el = videoRef.value;
  const url = props.playUrl?.trim();
  destroy();
  errorMsg.value = '';
  if (!el || !url) return;

  try {
    if (isHls(url)) {
      if (el.canPlayType('application/vnd.apple.mpegurl')) {
        el.src = url;
        await el.play();
        playing.value = true;
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
            playing.value = true;
            resolve();
          } catch (e) {
            reject(e);
          }
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data?.fatal) reject(new Error('HLS 播放失败'));
        });
      });
      hlsPlayer = hls;
      return;
    }

    if (isFlv(url)) {
      const mpegts = (await import('mpegts.js')).default;
      if (!mpegts.getFeatureList().mseLivePlayback) {
        throw new Error('当前浏览器不支持 FLV');
      }
      const player = mpegts.createPlayer({ type: 'flv', isLive: true, url });
      player.attachMediaElement(el);
      player.load();
      await player.play();
      flvPlayer = player;
      playing.value = true;
      return;
    }

    el.src = url;
    await el.play();
    playing.value = true;
  } catch (e) {
    errorMsg.value = (e as Error)?.message || '播放失败';
    playing.value = false;
  }
};

onMounted(() => {
  window.setTimeout(() => start(), 30);
});

watch(
  () => props.playUrl,
  () => {
    window.setTimeout(() => start(), 30);
  }
);

onBeforeUnmount(() => {
  destroy();
});
</script>

<style lang="less" scoped>
.live-stream {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #0b1220;
  border: 1px solid rgba(64, 158, 255, 0.35);
  border-radius: 6px;
  overflow: hidden;
}

.live-hd {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(22, 119, 255, 0.16);
  border-bottom: 1px solid rgba(64, 158, 255, 0.25);
}

.live-title {
  color: #e8f3ff;
  font-size: 13px;
  font-weight: 600;
}

.live-clock {
  color: #7ed0ff;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.live-stage {
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
  padding: 16px;
  text-align: center;
  color: rgba(186, 220, 255, 0.85);
  font-size: 12px;
  pointer-events: none;
}

.url {
  font-size: 11px;
  color: rgba(126, 208, 255, 0.65);
  word-break: break-all;
}

.err {
  color: #ff9a9a;
  font-size: 11px;
}

.overlay-slot {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 3;
  pointer-events: auto;
}
</style>
