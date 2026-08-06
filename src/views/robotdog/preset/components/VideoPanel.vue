<template>
  <div class="video-panel-wrap">
    <div class="video-toolbar">
      <a-button type="primary" size="small" :loading="photoLoading" @click="emit('photo')">
        拍照
      </a-button>
      <button type="button" class="switch-btn toolbar-switch" @click="toggleStream">
        {{ isThermal ? '切可见光' : '切红外' }}
      </button>
    </div>
    <LiveStreamPlayer
      class="video-body"
      :title="isThermal ? '红外' : '可见光'"
      :clock="nowText"
      :play-url="currentUrl"
    />

    <a-modal
      v-model:visible="previewVisible"
      title="拍照预览"
      :footer="false"
      width="520px"
      unmount-on-close
    >
      <div class="photo-preview">
        <img v-if="previewUrl" :src="previewUrl" alt="拍照预览" class="photo-img" />
        <div v-else class="photo-placeholder">暂无图片（占位）</div>
        <div v-if="previewName" class="photo-name">{{ previewName }}</div>
      </div>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import dayjs from 'dayjs';
import LiveStreamPlayer from '@/components/video/LiveStreamPlayer.vue';

const props = defineProps<{
  playUrl?: string;
  rtspUrl?: string;
  photoLoading?: boolean;
  /** 拍照结果预览地址 */
  photoUrl?: string;
  photoName?: string;
  /** 父级递增以打开预览弹窗 */
  photoPreviewKey?: number;
}>();

const emit = defineEmits<{
  (e: 'photo'): void;
}>();

const nowText = ref(dayjs().format('YYYY-MM-DD HH:mm:ss'));
const isThermal = ref(false);
const previewVisible = ref(false);
const previewUrl = ref('');
const previewName = ref('');
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

watch(
  () => props.photoPreviewKey,
  (key) => {
    if (!key) return;
    previewUrl.value = props.photoUrl || '';
    previewName.value = props.photoName || '';
    previewVisible.value = true;
  }
);

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
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.video-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 6px 8px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
}

.video-body {
  flex: 1;
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

.toolbar-switch {
  background: var(--color-fill-2);
  border-color: var(--color-border-2);
  color: var(--color-text-1);

  &:hover {
    border-color: rgb(var(--primary-6));
    background: rgba(var(--primary-6), 0.12);
    color: rgb(var(--primary-6));
  }
}

.photo-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-height: 240px;
}

.photo-img {
  max-width: 100%;
  max-height: 360px;
  object-fit: contain;
  border-radius: 4px;
  border: 1px solid var(--color-border-2);
}

.photo-placeholder {
  width: 100%;
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-fill-2);
  color: var(--color-text-3);
  border-radius: 4px;
  border: 1px dashed var(--color-border-2);
}

.photo-name {
  font-size: 12px;
  color: var(--color-text-2);
}
</style>
