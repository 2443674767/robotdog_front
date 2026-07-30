<template>
  <div class="cockpit-panel msg-panel">
    <div class="panel-title">实时消息</div>
    <div class="msg-list">
      <div v-for="item in realtimeMessages" :key="item.id" class="msg-item">
        <span class="msg-time">{{ item.time }}</span>
        <span class="msg-level" :class="levelClass(item.level)">{{ item.level }}</span>
        <span class="msg-content">{{ item.content }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { realtimeMessages } from './mock';

const levelClass = (level: string) => {
  if (level === '告警') return 'is-alarm';
  if (level === '预警') return 'is-warn';
  return 'is-info';
};
</script>

<style lang="less" scoped>
@import './panel.less';

.msg-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.msg-list {
  flex: 1;
  overflow: auto;
  padding-right: 4px;
}

.msg-item {
  display: grid;
  grid-template-columns: 64px 44px 1fr;
  gap: 8px;
  align-items: start;
  padding: 8px 0;
  border-bottom: 1px solid rgba(64, 158, 255, 0.12);
  font-size: 12px;
  line-height: 1.5;
}

.msg-time {
  color: rgba(186, 220, 255, 0.65);
  font-variant-numeric: tabular-nums;
}

.msg-level {
  text-align: center;
  border-radius: 2px;
  padding: 0 4px;
  font-size: 11px;
  line-height: 18px;

  &.is-alarm {
    color: #ff9a9a;
    background: rgba(245, 63, 63, 0.2);
  }
  &.is-warn {
    color: #ffe08a;
    background: rgba(247, 186, 30, 0.2);
  }
  &.is-info {
    color: #8fd0ff;
    background: rgba(22, 119, 255, 0.2);
  }
}

.msg-content {
  color: rgba(232, 243, 255, 0.9);
}
</style>
