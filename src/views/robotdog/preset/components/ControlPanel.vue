<template>
  <div class="control-panel">
    <div class="panel-title">设备控制</div>

    <div class="section">
      <div class="section-title">机械狗</div>
      <div class="pad">
        <div class="pad-row">
          <span />
          <a-button long @click="emitDog('forward')">前进</a-button>
          <span />
        </div>
        <div class="pad-row">
          <a-button long @click="emitDog('left')">左移</a-button>
          <span />
          <a-button long @click="emitDog('right')">右移</a-button>
        </div>
        <div class="pad-row">
          <span />
          <a-button long @click="emitDog('backward')">后退</a-button>
          <span />
        </div>
      </div>
      <div class="speed">
        <span>速度</span>
        <a-slider v-model="dogSpeed" :min="0.1" :max="1" :step="0.1" :style="{ flex: 1 }" />
        <span class="speed-val">{{ dogSpeed.toFixed(1) }}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">云台</div>
      <div class="pad">
        <div class="pad-row">
          <span />
          <a-button long @click="emitPtz('up')">上仰</a-button>
          <span />
        </div>
        <div class="pad-row">
          <a-button long @click="emitPtz('left')">左转</a-button>
          <span />
          <a-button long @click="emitPtz('right')">右转</a-button>
        </div>
        <div class="pad-row">
          <span />
          <a-button long @click="emitPtz('down')">下俯</a-button>
          <span />
        </div>
      </div>
      <div class="actions">
        <a-button size="small" type="outline" @click="emitPtz('zoom_in')">变焦+</a-button>
        <a-button size="small" type="outline" @click="emitPtz('zoom_out')">变焦-</a-button>
        <span />
      </div>
      <div class="ptz-values">
        <div>俯仰 Pitch：{{ ptz.pitch }}°</div>
        <div>偏航 Yaw：{{ ptz.yaw }}°</div>
        <div>变焦 Zoom：{{ ptz.zoom.toFixed(1) }}x</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue';

const emit = defineEmits<{
  (e: 'dog-cmd', cmd: string, payload?: Record<string, number | string>): void;
  (e: 'ptz-cmd', cmd: string, payload?: Record<string, number | string>): void;
}>();

const dogSpeed = ref(0.6);
const ptz = reactive({ pitch: 0, yaw: 0, zoom: 1 });

const emitDog = (cmd: string) => {
  emit('dog-cmd', cmd, { speed: dogSpeed.value });
};

const emitPtz = (cmd: string) => {
  if (cmd === 'up') ptz.pitch = Math.min(90, ptz.pitch + 5);
  if (cmd === 'down') ptz.pitch = Math.max(-90, ptz.pitch - 5);
  if (cmd === 'left') ptz.yaw = Math.max(-180, ptz.yaw - 5);
  if (cmd === 'right') ptz.yaw = Math.min(180, ptz.yaw + 5);
  if (cmd === 'zoom_in') ptz.zoom = Math.min(10, +(ptz.zoom + 0.5).toFixed(1));
  if (cmd === 'zoom_out') ptz.zoom = Math.max(1, +(ptz.zoom - 0.5).toFixed(1));
  emit('ptz-cmd', cmd, { ...ptz, speed: 50 });
};
</script>

<style lang="less" scoped>
.control-panel {
  height: 100%;
  min-height: 0;
  overflow: auto;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  padding: 12px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
  margin-bottom: 12px;
}

.section {
  & + .section {
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px dashed var(--color-border-2);
  }
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-1);
  margin-bottom: 10px;
  padding-left: 8px;
  border-left: 3px solid rgb(var(--primary-6));
}

.pad {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pad-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}

.speed {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  font-size: 12px;
  color: var(--color-text-2);
}

.speed-val {
  width: 28px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.ptz-values {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-2);
  line-height: 1.6;
}
</style>
