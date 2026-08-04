<template>
  <div class="video-panel-wrap">
    <LiveStreamPlayer
      :title="isThermal ? '红外' : '可见光'"
      :clock="nowText"
      :play-url="currentUrl"
    >
      <template #overlay>
        <button type="button" class="switch-btn" @click="toggleStream">
          {{ isThermal ? '切可见光' : '切红外' }}
        </button>
      </template>
    </LiveStreamPlayer>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import dayjs from 'dayjs';
import LiveStreamPlayer from '@/components/video/LiveStreamPlayer.vue';

defineProps<{
  playUrl?: string;
  rtspUrl?: string;
}>();

const nowText = ref(dayjs().format('YYYY-MM-DD HH:mm:ss'));
const isThermal = ref(false);
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

const currentUrl = computed(() => (isThermal.value ? thermalUrl.value : visibleUrl.value));

const toggleStream = () => {
  isThermal.value = !isThermal.value;
};

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
.video-panel-wrap {
  height: 100%;
  min-height: 0;
}

.switch-btn {
  appearance: none;
  border: 1px solid rgba(126, 208, 255, 0.55);
  background: rgba(6, 20, 40, 0.78);
  color: #e8f3ff;
  font-size: 12px;
  line-height: 1;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: all 0.15s;

  &:hover {
    border-color: #7ed0ff;
    background: rgba(22, 119, 255, 0.45);
  }
}
</style>
