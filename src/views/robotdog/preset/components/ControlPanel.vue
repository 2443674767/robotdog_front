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
          <div class="ptz-mode">
            <span>快速步进</span>
            <a-switch v-model="ptzFast" size="small" />
          </div>
          <div class="pad">
            <div class="pad-row">
              <a-button long @click="emitPtz('up_left')">左上</a-button>
              <a-button long @click="emitPtz('up')">上</a-button>
              <a-button long @click="emitPtz('up_right')">右上</a-button>
            </div>
            <div class="pad-row">
              <a-button long @click="emitPtz('left')">左</a-button>
              <a-button long type="outline" @click="emitPtz('home')">回中</a-button>
              <a-button long @click="emitPtz('right')">右</a-button>
            </div>
            <div class="pad-row">
              <a-button long @click="emitPtz('down_left')">左下</a-button>
              <a-button long @click="emitPtz('down')">下</a-button>
              <a-button long @click="emitPtz('down_right')">右下</a-button>
            </div>
          </div>

          <div class="section-title mt">变倍控制</div>
          <div class="zoom-row">
            <a-button long type="outline" @click="emitPtz('zoom_in')">变倍 +</a-button>
            <a-button long type="outline" @click="emitPtz('zoom_out')">变倍 -</a-button>
          </div>
          <div class="zoom-row mt8">
            <a-button long type="outline" @click="emitPtz('zoom_home')">变倍回 1x</a-button>
            <a-button long type="outline" @click="emitPtz('refresh')">刷新姿态</a-button>
          </div>

          <div class="section-title mt">变焦控制</div>
          <div class="zoom-row">
            <a-button long type="outline" @click="emitPtz('focus_near')">近焦</a-button>
            <a-button long type="outline" @click="emitPtz('focus_far')">远焦</a-button>
          </div>
          <div class="ptz-values">
            <div>俯仰 Pitch：{{ realtimePitchText }}</div>
            <div>偏航 Yaw：{{ realtimeYawText }}</div>
            <div>变倍 Zoom：{{ realtimeZoomText }}</div>
          </div>

          <template v-if="showPresetConfig">
            <div class="section-title mt">预置位配置</div>
            <div class="preset-form">
              <div class="form-row">
                <span class="form-label">预置位 ID</span>
                <a-input-number
                  v-model="form.id"
                  :min="1"
                  :precision="0"
                  placeholder="新建可空"
                  allow-clear
                  hide-button
                  style="width: 100%"
                />
              </div>
              <div class="form-row">
                <span class="form-label">排序 ID</span>
                <a-input-number
                  v-model="form.sort_no"
                  :min="1"
                  :precision="0"
                  style="width: 100%"
                />
              </div>
              <div class="form-row switch-row">
                <span class="form-label">伺服拍照是否</span>
                <a-radio-group type="button" size="small" :model-value="form.servo_photo" @change="onServoChange">
                  <a-radio :value="1">是</a-radio>
                  <a-radio :value="0">否</a-radio>
                </a-radio-group>
              </div>
              <div class="form-row switch-row">
                <span class="form-label">回正是否</span>
                <a-radio-group type="button" size="small" :model-value="form.auto_home" @change="onHomeChange">
                  <a-radio :value="1">是</a-radio>
                  <a-radio :value="0">否</a-radio>
                </a-radio-group>
              </div>
            </div>
            <div class="preset-actions">
              <a-button size="small" type="outline" :loading="actionLoading === 'call'" @click="emit('preset-call')">
                调用
              </a-button>
              <a-button size="small" type="outline" :loading="actionLoading === 'base'" @click="emit('preset-update-base')">
                更新基础
              </a-button>
              <a-button size="small" type="primary" :loading="actionLoading === 'set'" @click="emit('preset-set')">
                设置预置位
              </a-button>
              <a-button size="small" status="danger" :loading="actionLoading === 'del'" @click="emit('preset-del')">
                删除
              </a-button>
            </div>
          </template>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue';
import type { PtzPresetItem } from '@/api/robotdog/preset';

const props = defineProps<{
  dogId?: number | null;
  battery?: number | null;
  navStatus?: string;
  statusLoading?: boolean;
  /** 选中任务航点时显示预置位配置 */
  showPresetConfig?: boolean;
  /** 当前预置位回填 */
  preset?: PtzPresetItem | null;
  actionLoading?: '' | 'call' | 'base' | 'set' | 'del';
  /** 云台实时姿态（来自 getPtzGetRealtime） */
  ptzPitch?: number | null;
  ptzYaw?: number | null;
  ptzZoom?: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:activeTab', v: string): void;
  (e: 'dog-cmd', cmd: string, payload?: Record<string, number | string>): void;
  (e: 'dog-gait', gait: 'basic' | 'stair'): void;
  (e: 'dog-charge', action: 'enter' | 'exit'): void;
  (e: 'ptz-cmd', cmd: string, payload?: Record<string, number | string>): void;
  (e: 'preset-call'): void;
  (e: 'preset-update-base'): void;
  (e: 'preset-set'): void;
  (e: 'preset-del'): void;
  (e: 'preset-form-change', form: PresetFormState): void;
}>();

export interface PresetFormState {
  id: number | undefined;
  sort_no: number;
  servo_photo: number;
  auto_home: number;
}

const activeTab = defineModel<string>('activeTab', { default: 'dog' });
const dogSpeed = ref(0.6);
const gait = ref<'basic' | 'stair'>('basic');
const chargeLoading = ref<'enter' | 'exit' | ''>('');
/** 开启后方向/变倍走 *_fast 命令（约 5 倍步进） */
const ptzFast = ref(false);
const form = reactive<PresetFormState>({
  id: undefined,
  sort_no: 1,
  servo_photo: 0,
  auto_home: 0,
});

const fmtNum = (v: number | null | undefined, suffix = '', digits = 1) => {
  if (v == null || Number.isNaN(Number(v))) return '未知';
  return `${Number(v).toFixed(digits)}${suffix}`;
};

const realtimePitchText = computed(() => fmtNum(props.ptzPitch, '°', 1));
const realtimeYawText = computed(() => fmtNum(props.ptzYaw, '°', 1));
const realtimeZoomText = computed(() => fmtNum(props.ptzZoom, 'x', 1));

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

const syncFormFromPreset = (p?: PtzPresetItem | null) => {
  if (!p) {
    form.id = undefined;
    form.sort_no = 1;
    form.servo_photo = 0;
    form.auto_home = 0;
    return;
  }
  form.id = p.id;
  form.sort_no = Number(p.sort_no) > 0 ? Number(p.sort_no) : 1;
  form.servo_photo = Number(p.servo_photo) === 1 ? 1 : 0;
  form.auto_home = Number(p.auto_home) === 1 ? 1 : 0;
};

const emitForm = () => {
  emit('preset-form-change', {
    id: form.id,
    sort_no: form.sort_no,
    servo_photo: form.servo_photo,
    auto_home: form.auto_home,
  });
};

watch(
  () => props.preset,
  (p) => {
    syncFormFromPreset(p);
    emitForm();
  },
  { immediate: true }
);

watch(
  () => props.showPresetConfig,
  (show) => {
    if (!show) syncFormFromPreset(null);
  }
);

watch(
  () => [form.id, form.sort_no, form.servo_photo, form.auto_home],
  () => emitForm(),
  { deep: true }
);

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
    window.setTimeout(() => {
      if (chargeLoading.value === action) chargeLoading.value = '';
    }, 600);
  }
};

const emitPtz = (cmd: string) => {
  // 默认步进对齐 LIBRA4 文档：yaw=5°，pitch=2°，zoom=0.5x
  emit('ptz-cmd', cmd, {
    yaw_step: 5,
    pitch_step: 2,
    zoom_step: 0.5,
    fast: ptzFast.value ? 1 : 0,
  });
};

const onServoChange = (v: string | number | boolean) => {
  form.servo_photo = Number(v) === 1 ? 1 : 0;
};

const onHomeChange = (v: string | number | boolean) => {
  form.auto_home = Number(v) === 1 ? 1 : 0;
};

watch(
  () => props.dogId,
  () => {
    gait.value = 'basic';
  }
);

defineExpose({
  getForm: () => ({ ...form }),
});
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

.mt8 {
  margin-top: 8px;
}

.ptz-mode {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--color-text-2);
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

.preset-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &.switch-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.form-label {
  font-size: 12px;
  color: var(--color-text-2);
  flex-shrink: 0;
}

.preset-actions {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
</style>
