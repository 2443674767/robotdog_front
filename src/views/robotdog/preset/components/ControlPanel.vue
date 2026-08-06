<template>
  <div class="control-panel">
    <div class="panel-title">设备控制</div>
    <a-tabs v-model:active-key="activeTab" type="rounded" size="small" class="ctrl-tabs">
      <a-tab-pane key="dog" title="机械狗">
        <div class="section">
          <div class="status-card">
            <div class="status-title">实时状态</div>
            <div class="status-row">
              <span class="label">电量</span>
              <span class="value">{{ batteryText }}</span>
            </div>
            <div class="status-row">
              <span class="label">导航状态</span>
              <span class="value status-nav" :title="navStatusText">{{ navStatusText }}</span>
            </div>
          </div>

          <div class="section-title">运动控制</div>
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

          <div class="section-title mt">步态控制</div>
          <a-radio-group
            type="button"
            size="small"
            :model-value="gait"
            class="gait-group"
            @change="onGaitChange"
          >
            <a-radio value="basic">普通步态</a-radio>
            <a-radio value="stair">楼梯步态</a-radio>
          </a-radio-group>

          <div class="section-title mt">充电桩控制</div>
          <div class="charge-row">
            <a-button long type="outline" :loading="chargeLoading === 'enter'" @click="emitCharge('enter')">
              进入充电桩
            </a-button>
            <a-button long type="outline" status="warning" :loading="chargeLoading === 'exit'" @click="emitCharge('exit')">
              退出充电桩
            </a-button>
          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane key="ptz" title="云台">
        <div class="section">
          <div class="section-title">方向控制</div>
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

          <div class="section-title mt">变倍控制</div>
          <div class="zoom-row">
            <a-button long type="outline" @click="emitPtz('zoom_in')">变倍 +</a-button>
            <a-button long type="outline" @click="emitPtz('zoom_out')">变倍 -</a-button>
          </div>

          <div class="section-title mt">变焦控制</div>
          <div class="zoom-row">
            <a-button long type="outline" @click="emitPtz('focus_near')">变焦 +</a-button>
            <a-button long type="outline" @click="emitPtz('focus_far')">变焦 -</a-button>
          </div>
          <div class="ptz-values">
            <div>俯仰 Pitch：{{ ptz.pitch }}°</div>
            <div>偏航 Yaw：{{ ptz.yaw }}°</div>
            <div>变倍 Zoom：{{ ptz.zoom.toFixed(1) }}x</div>
            <div>变焦 Focus：{{ ptz.focus.toFixed(1) }}</div>
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue';

const props = defineProps<{
  dogId?: number | null;
  battery?: number | null;
  navStatus?: string;
  statusLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'dog-cmd', cmd: string, payload?: Record<string, number | string>): void;
  (e: 'dog-gait', gait: 'basic' | 'stair'): void;
  (e: 'dog-charge', action: 'enter' | 'exit'): void;
  (e: 'ptz-cmd', cmd: string, payload?: Record<string, number | string>): void;
}>();

const activeTab = ref('dog');
const dogSpeed = ref(0.6);
const gait = ref<'basic' | 'stair'>('basic');
const chargeLoading = ref<'enter' | 'exit' | ''>('');
const ptz = reactive({ pitch: 0, yaw: 0, zoom: 1, focus: 1 });

const batteryText = computed(() => {
  if (props.dogId == null) return '未知';
  if (props.battery == null || Number.isNaN(Number(props.battery))) return '未知';
  return `${Number(props.battery).toFixed(0)}%`;
});

const navStatusText = computed(() => {
  if (props.dogId == null) return '未知';
  const s = String(props.navStatus || '').trim();
  return s || '未知';
});

const emitDog = (cmd: string) => {
  emit('dog-cmd', cmd, { speed: dogSpeed.value });
};

const onGaitChange = (v: string | number | boolean) => {
  const next = v === 'stair' ? 'stair' : 'basic';
  gait.value = next;
  emit('dog-gait', next);
};

const emitCharge = async (action: 'enter' | 'exit') => {
  chargeLoading.value = action;
  try {
    emit('dog-charge', action);
  } finally {
    // loading 由父级请求结束后很快结束；此处短暂占位避免连点
    window.setTimeout(() => {
      if (chargeLoading.value === action) chargeLoading.value = '';
    }, 600);
  }
};

const emitPtz = (cmd: string) => {
  if (cmd === 'up') ptz.pitch = Math.min(90, ptz.pitch + 5);
  if (cmd === 'down') ptz.pitch = Math.max(-90, ptz.pitch - 5);
  if (cmd === 'left') ptz.yaw = Math.max(-180, ptz.yaw - 5);
  if (cmd === 'right') ptz.yaw = Math.min(180, ptz.yaw + 5);
  if (cmd === 'zoom_in') ptz.zoom = Math.min(10, +(ptz.zoom + 0.5).toFixed(1));
  if (cmd === 'zoom_out') ptz.zoom = Math.max(1, +(ptz.zoom - 0.5).toFixed(1));
  if (cmd === 'focus_near') ptz.focus = Math.min(10, +(ptz.focus + 0.5).toFixed(1));
  if (cmd === 'focus_far') ptz.focus = Math.max(1, +(ptz.focus - 0.5).toFixed(1));
  emit('ptz-cmd', cmd, { ...ptz, speed: 50 });
};

watch(
  () => props.dogId,
  () => {
    gait.value = 'basic';
  }
);
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
  margin-bottom: 8px;
}

.ctrl-tabs {
  :deep(.arco-tabs-nav) {
    margin-bottom: 10px;
  }
  :deep(.arco-tabs-content) {
    padding-top: 0;
  }
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-1);
  margin-bottom: 10px;
  padding-left: 8px;
  border-left: 3px solid rgb(var(--primary-6));

  &.mt {
    margin-top: 16px;
  }
}

.status-card {
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--color-fill-2);
  border: 1px solid var(--color-border-2);
}

.status-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-3);
  margin-bottom: 8px;
}

.status-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  line-height: 1.5;

  & + .status-row {
    margin-top: 6px;
  }

  .label {
    flex-shrink: 0;
    width: 64px;
    color: var(--color-text-3);
  }

  .value {
    flex: 1;
    min-width: 0;
    color: var(--color-text-1);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .status-nav {
    font-weight: 500;
    word-break: break-all;
  }
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

.gait-group {
  width: 100%;
  display: flex;

  :deep(.arco-radio-button) {
    flex: 1;
    text-align: center;
  }
}

.charge-row,
.zoom-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
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
