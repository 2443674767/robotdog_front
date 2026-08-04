<template>
  <div class="video-main">
    <div class="video-header">
      <span class="video-title">实时监控</span>
      <span class="video-clock">{{ nowText }}</span>
    </div>
    <div class="video-grid">
      <LiveStreamPlayer
        class="grid-cell"
        title="可见光"
        :play-url="visibleUrl"
        :show-header="true"
      />
      <LiveStreamPlayer
        class="grid-cell"
        title="红外"
        :play-url="thermalUrl"
        :show-header="true"
      />
      <div class="grid-cell empty-cell">
        <div class="empty-hd">通道 3</div>
        <div class="empty-stage" />
      </div>
      <div class="grid-cell empty-cell">
        <div class="empty-hd">通道 4</div>
        <div class="empty-stage" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import dayjs from 'dayjs';
import LiveStreamPlayer from '@/components/video/LiveStreamPlayer.vue';

const nowText = ref(dayjs().format('YYYY-MM-DD HH:mm:ss'));
let clockTimer: number | undefined;

const visibleUrl = computed(() => {
  const cfg = window?.globalConfig || {};
  const fromList = (cfg.VideoStreams || []).find(
    (s: { key?: string }) => s.key === 'visible' || s.key === 'm20'
  );
  return fromList?.playUrl || cfg.StreamPlayUrl || cfg.StreamPlayUrlVisible || '';
});

const thermalUrl = computed(() => {
  const cfg = window?.globalConfig || {};
  const fromList = (cfg.VideoStreams || []).find(
    (s: { key?: string }) => s.key === 'thermal'
  );
  return fromList?.playUrl || cfg.StreamPlayUrlThermal || '';
});

onMounted(() => {
  clockTimer = window.setInterval(() => {
    nowText.value = dayjs().format('YYYY-MM-DD HH:mm:ss');
  }, 1000);
});

onBeforeUnmount(() => {
  if (clockTimer) window.clearInterval(clockTimer);
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

.video-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 1px;
  background: rgba(64, 158, 255, 0.25);
}

.grid-cell {
  min-width: 0;
  min-height: 0;
  border-radius: 0;
  border: none;

  :deep(.live-stream) {
    border: none;
    border-radius: 0;
  }
}

.empty-cell {
  display: flex;
  flex-direction: column;
  background: #020814;
}

.empty-hd {
  flex-shrink: 0;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(232, 243, 255, 0.55);
  background: rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid rgba(64, 158, 255, 0.15);
}

.empty-stage {
  flex: 1;
  min-height: 0;
  background: #000;
}
</style>
