<template>
  <div class="cockpit-panel">
    <div class="panel-title">区域巡检</div>
    <div class="panel-body">
      <Chart height="100%" :options="chartOption" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import Chart from '@/components/chart/index.vue';
import { inspectBar } from './mock';

const chartOption = computed(() => ({
  color: ['#1677ff', '#3cdc9b'],
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(8, 20, 40, 0.9)',
    borderColor: 'rgba(64, 158, 255, 0.4)',
    textStyle: { color: '#e8f3ff' },
  },
  legend: {
    top: 0,
    right: 0,
    textStyle: { color: 'rgba(186, 220, 255, 0.85)', fontSize: 11 },
    itemWidth: 12,
    itemHeight: 8,
  },
  grid: { left: 36, right: 12, top: 32, bottom: 28 },
  xAxis: {
    type: 'category',
    data: inspectBar.areas,
    axisLine: { lineStyle: { color: 'rgba(64, 158, 255, 0.35)' } },
    axisLabel: { color: 'rgba(186, 220, 255, 0.75)', fontSize: 11 },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: 'rgba(64, 158, 255, 0.12)' } },
    axisLabel: { color: 'rgba(186, 220, 255, 0.75)', fontSize: 11 },
  },
  series: [
    {
      name: '已完成',
      type: 'bar',
      barWidth: 14,
      data: inspectBar.completed,
      itemStyle: { borderRadius: [3, 3, 0, 0] },
    },
    {
      name: '待完成',
      type: 'bar',
      barWidth: 14,
      data: inspectBar.pending,
      itemStyle: { borderRadius: [3, 3, 0, 0] },
    },
  ],
}));
</script>

<style lang="less" scoped>
@import './panel.less';

.panel-body {
  flex: 1;
  min-height: 0;
}
</style>
