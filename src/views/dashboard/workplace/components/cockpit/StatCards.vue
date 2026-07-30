<template>
  <div class="cockpit-panel stats-panel">
    <div class="panel-title">关键指标</div>
    <div class="stat-cards">
      <div v-for="item in statCards" :key="item.label" class="stat-card">
        <div class="stat-label">{{ item.label }}</div>
        <div class="stat-value">
          <span class="num">{{ item.value }}</span>
          <span class="unit">{{ item.unit }}</span>
        </div>
        <div class="stat-trend">较昨日 {{ item.trend }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { statCards } from './mock';
</script>

<style lang="less" scoped>
@import './panel.less';

.stats-panel {
  min-height: 0;
}

.stat-cards {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-rows: repeat(3, 1fr);
  gap: 8px;
}

.stat-card {
  box-sizing: border-box;
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.18), rgba(0, 180, 255, 0.06));
  border: 1px solid rgba(64, 158, 255, 0.28);
  border-radius: 4px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
}

.stat-label {
  color: rgba(186, 220, 255, 0.85);
  font-size: 12px;
  margin-bottom: 4px;
}

.stat-value {
  display: flex;
  align-items: baseline;
  gap: 4px;

  .num {
    color: #e8f3ff;
    font-size: 22px;
    font-weight: 700;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  .unit {
    color: rgba(186, 220, 255, 0.7);
    font-size: 12px;
  }
}

.stat-trend {
  margin-top: 2px;
  color: #3cdc9b;
  font-size: 11px;
}
</style>
