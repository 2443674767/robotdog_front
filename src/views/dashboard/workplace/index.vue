<template>
  <div class="cockpit">
    <div class="cockpit-mid">
      <InspectPie class="side-panel" />
      <VideoMain class="video-panel" />
      <AlarmTrend class="side-panel" />
    </div>
    <div class="cockpit-bottom">
      <InspectBar class="bottom-chart" />
      <RealtimeMsg class="bottom-msg" />
      <StatCards class="bottom-stats" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import StatCards from './components/cockpit/StatCards.vue';
import VideoMain from './components/cockpit/VideoMain.vue';
import InspectPie from './components/cockpit/InspectPie.vue';
import AlarmTrend from './components/cockpit/AlarmTrend.vue';
import InspectBar from './components/cockpit/InspectBar.vue';
import RealtimeMsg from './components/cockpit/RealtimeMsg.vue';
</script>

<script lang="ts">
export default {
  name: 'home',
};
</script>

<style lang="less" scoped>
.cockpit {
  --cockpit-gap: 10px;
  height: calc(100vh - 140px);
  min-height: 640px;
  display: grid;
  /* 视频区贴顶，约占高度 60%；底部约占 40% */
  grid-template-rows: minmax(0, 0.6fr) minmax(0, 0.4fr);
  gap: var(--cockpit-gap);
  padding: 4px;
  box-sizing: border-box;
  background:
    radial-gradient(ellipse at top, rgba(22, 93, 255, 0.18), transparent 45%),
    linear-gradient(180deg, #06101f 0%, #0a1628 100%);
  border-radius: 8px;
  overflow: hidden;
}

.cockpit-mid {
  display: grid;
  /* 视频约占横向 50%，左右各 25% */
  grid-template-columns: minmax(0, 0.25fr) minmax(0, 0.5fr) minmax(0, 0.25fr);
  gap: var(--cockpit-gap);
  min-height: 0;
}

.cockpit-bottom {
  display: grid;
  /* 区域巡检 | 实时消息 | 指标卡独立模块 */
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 0.7fr);
  gap: var(--cockpit-gap);
  min-height: 0;
}

.side-panel,
.video-panel,
.bottom-chart,
.bottom-msg,
.bottom-stats {
  min-height: 0;
  min-width: 0;
}

@media screen and (max-width: 1200px) {
  .cockpit {
    height: auto;
    min-height: unset;
    overflow: auto;
  }

  .cockpit-mid,
  .cockpit-bottom {
    grid-template-columns: 1fr;
  }

  .side-panel,
  .video-panel,
  .bottom-chart,
  .bottom-msg,
  .bottom-stats {
    min-height: 240px;
  }

  .video-panel {
    min-height: 360px;
  }
}
</style>
