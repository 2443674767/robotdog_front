<template>
  <div class="a-row justify-center align-center">
    <div :style="{height: isImage?'120px':''}">
      <FileImage :size="33" :data="data" style="border-radius: 5px;width: auto;" />
    </div>
  </div>
  <div class="a-des">
    <div class="item">
        <div class="title">名称</div>
        <div class="text">{{ data.name }}</div>
    </div>
    <div class="item">
        <div class="title">存储名称</div>
        <div class="text">{{ data.title }}</div>
    </div>
    <div class="item">
        <div class="title">大小</div>
        <div class="text">{{ formatFileSize(data.filesize) }}</div>
    </div>
    <div class="item">
        <div class="title">上传时间</div>
        <div class="text"> {{dayjs(data.created_at).format("YYYY-MM-DD HH:mm")}}</div>
    </div>
    <div class="item">
        <div class="title">链接</div>
        <div class="text">{{ data.url}}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import FileImage from '../../main/FileMain/FileImage.vue'
import type { FileItem } from '../../api'
import { formatFileSize } from '@/utils'
import { ImageTypes } from '../../file'
import { dayjs } from '@/utils/dayjs';
interface Props {
  data: FileItem
}
const props = withDefaults(defineProps<Props>(), {})
// 是否是图片类型文件
const isImage = computed(() => {
  if(props.data.mimetype){
    const mimetype = props.data.mimetype.toLowerCase()
    return ImageTypes.includes(mimetype)
  }else{
     return false
  }
})

</script>

<style lang="less" scoped>
.a-row{
  display: flex;
  flex-flow: row wrap;
}
.justify-center{
  justify-content: center;
}
.align-center{
  align-items: center;
}
.a-des{
  margin-top: 10px;
  .item{
    .title{
      margin-bottom: 2px;
      color: var(--color-text-3);
      font-weight: 500;
      font-size: 12px;
    }
    .text{
      color: var(--color-text-1);
      font-weight: 400;
      font-size: 12px;
      margin-bottom: 10px;
      width: 100%;
      word-wrap: break-word;
      word-break: normal;
    }
  }
}
</style>
