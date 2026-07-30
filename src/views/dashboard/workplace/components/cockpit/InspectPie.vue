<template>
  <div class="cockpit-panel">
    <div class="panel-title">巡检统计</div>
    <div class="panel-body">
      <Chart height="100%" :options="chartOption" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import Chart from '@/components/chart/index.vue';
import { inspectPieData } from './mock';

const chartOption = computed(() => ({
  color: ['#3cdc9b', '#1677ff', '#f7ba1e', '#f53f3f'],
  tooltip: {
    trigger: 'item',
    backgroundColor: 'rgba(8, 20, 40, 0.9)',
    borderColor: 'rgba(64, 158, 255, 0.4)',
    textStyle: { color: '#e8f3ff' },
  },
  legend: {
    bottom: 0,
    textStyle: { color: 'rgba(186, 220, 255, 0.85)', fontSize: 11 },
    itemWidth: 10,
    itemHeight: 10,
  },
  series: [
    {
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '42%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 4,
        borderColor: '#06101f',
        borderWidth: 2,
      },
      label: { show: false },
      data: inspectPieData,
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
