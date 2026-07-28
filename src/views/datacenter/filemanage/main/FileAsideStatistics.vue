<template>
  <section class="percent">
    <a-space class="statistic-space" align="center" size="medium" fill>
      <template #split>
        <a-divider direction="vertical" />
      </template>
      <a-statistic class="statistic-item" title="存储量" :value="totalData.size" :value-style="statisticValueStyle">
        <template #suffix>&nbsp;{{ totalData.unit }}</template>
      </a-statistic>
      <a-statistic class="statistic-item" title="数量" :value="totalData.number" :value-style="statisticValueStyle" />
    </a-space>
    <a-divider />
    <Chart :option="chartOption" autoresize :style="{ height: '180px', width: '160px' }" />
  </section>
</template>

<script setup lang="ts">
import { ref,onMounted} from 'vue';
import useChartOption from '@/hooks/chart-option'
import { getFileInfo } from '../api'
import { formatFileSize } from '@/utils'
const totalData = ref<any>({
  size:0,
  unit:"M",
  number:0,
})
const statisticValueStyle = { 'color': 'rgb(var(--arcoblue-5))', 'font-size': '18px' }
const chartData = ref<Array<{ name: string, value: number, size: string}>>([])
const { chartOption } = useChartOption((isDark) => {
    return {
      grid: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 10
      },
      legend: {
          show: true,
          bottom: -7,
          icon: 'circle',
          itemWidth: 6,
          itemHeight: 6,
          textStyle: {
            color: '#4E5969'
          }
        },
        tooltip: {
          show: true,
          formatter(params:any) {
            return `${params.data?.name}<br>${params.data.size}`
          }
        },
        series: [
          {
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: true,
            label: {
            show: false,
            position: 'center'
            },
            data: chartData.value
          },
        ],
      };
    });
const loading = ref(false)
const getStatisticsData = async () => {
  try {
    loading.value = true
    chartData.value =[{value: 0,name: '图片',size:'' },{ value: 0,name: '文档',size:""},{ value: 0,name: '视频',size:""},{ value: 0,name: '音频',size:""},{ value: 0,name: '其他',size:""}]
    const resData = await getFileInfo({})
    const formatSize = formatFileSize(resData.useSize).split(' ')
    totalData.value = {
      size: Number.parseFloat(formatSize[0]),
      number: resData.allnumber ?? 0,//数量
      unit: formatSize[1]??"kb"
    }
    chartData.value =[
      {name: '图片',value: resData.imageSize,size: formatFileSize(resData.imageSize)},
      {name: '文档',value: resData.fielSize,size: formatFileSize(resData.fielSize)},
      {name: '视频',value: resData.videoSize,size: formatFileSize(resData.videoSize)},
      {name: '音频',value: resData.audioSize,size: formatFileSize(resData.audioSize)},
      {name: '其他',value: resData.otherSize,size: formatFileSize(resData.otherSize)},
    ]
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  getStatisticsData()
})
</script>

<style lang="less" scoped>
.statistic-space {
  display: flex;
  justify-content: center;
  align-items: center;
}

.statistic-item {
  text-align: center;
}

.percent {
  margin-top: 10px;
  padding: 20px;
  box-sizing: border-box;
  background-color: var(--color-bg-1);
}

:deep(.arco-divider-horizontal) {
  margin: 20px 0 0 0;
}
</style>
