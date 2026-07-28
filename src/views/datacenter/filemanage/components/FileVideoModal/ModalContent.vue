<template>
  <div class="videobox">
    <video :src="GetFullPath(data.url)" controls></video>
  </div>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import type { FileItem } from '../../api'
import { GetFullPath } from "@/utils/tool";
interface Props {
  data: FileItem
}
const props = withDefaults(defineProps<Props>(), {})

onMounted(() => {
})
</script>

<style lang="less" scoped>
.arco-modal-body{
  background: #000000;
}
.videobox{
  height: 350px;
  width: 100%;
  video{
    height: 100%;
    width: 100%;
  }
}
</style>
