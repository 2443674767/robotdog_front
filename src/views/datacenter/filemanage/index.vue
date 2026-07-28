<template>
  <a-row align="stretch" :gutter="14" class="file-manage">
    <a-col :xs="0" :sm="8" :md="7" :lg="6" :xl="5" :xxl="4" flex="220px" class="h-full ov-hidden">
      <FileAside @ok="(item)=>selectedKey=item"></FileAside>
    </a-col>
    <a-col :xs="24" :sm="16" :md="17" :lg="18" :xl="19" :xxl="20" flex="1" class="h-full ov-hidden">
      <FileMain v-model="selectedKey"></FileMain>
    </a-col>
  </a-row>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import FileAside from './main/FileAside.vue'
import FileMain from './main/FileMain/index.vue'
const selectedKey=ref("all")
</script>
<script lang="ts">
  export default {
    name: 'filemanage',
  };
</script>
<style lang="less" scoped>
.h-full{
  height: 100%;
}
.file-manage {
  height: 100%;
  flex: 1;
  padding: 14px;
  overflow: hidden;
}
</style>
