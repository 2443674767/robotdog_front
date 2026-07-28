<template>
  <img v-if="isImage" class="file-image" :src="GetFullPath(props.data.url)" alt="" />
  <div v-else-if="isVideo&&props.data.cover_url" class="video-box">
    <img :src="GetFullPath(props.data.cover_url)" class="img_item"/> 
    <icon-play-circle class="folder_video" :size="30" style="color:#ffffff; text-shadow:2px 2px #777;"/>
  </div>
  <Icon v-else :size="size" :icon="getFileImg"></Icon>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {Icon} from '@/components/Icon';
import { FileIcon, ImageTypes,VideoTypes } from '../../file'
import type { FileItem } from '../../api'
import { GetFullPath } from "@/utils/tool";
import { OfficeTypes,AudioTypes } from '../../file'
interface Props {
  data: FileItem,
  size:number,
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

// 是否是视频类型文件
const isVideo = computed(() => {
  if(props.data.mimetype){
    const mimetype = props.data.mimetype.toLowerCase()
    return VideoTypes.includes(mimetype)
  }else{
     return false
  }
})

/** 获取文件后缀 */
 const GetFileExtension=()=>{
  const name = props.data.name.toLowerCase()
  if(props.data.type?.toString()=="1"){
    return "dir"
  }else if(name){
    const filearr=name.split(".")
    if(filearr.length>=2){
       return filearr[filearr.length-1]
    }else{
      return "other"
    }
  }else{
    return "other"
  }
}
// 获取文件图标，如果是图片就显示图片
const getFileImg = computed<string>(() => {
  if(props.data.mimetype){
    const mimetype = props.data.mimetype.toLowerCase()
  if (ImageTypes.includes(mimetype)) {
    return props.data.url || ''
  }
  const extension = GetFileExtension()
  if (!Object.keys(FileIcon).includes(extension)) {
    if(AudioTypes.includes(extension)){
    return FileIcon['mp3']
    }else if(OfficeTypes.includes(extension)){
      return FileIcon['othetxtr']
    }
    return FileIcon['other']
  }
  return FileIcon[extension]
  }
  return ""
})
</script>

<style lang="less" scoped>
.file-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.video-box{
  position: relative;
  width: 100%;
  height: 100%;
  .img_item{
    width: auto;
    height: 100%;
    max-width: 100%;
    transition: all 0.3s;
  }
  .folder_video{
    position: absolute;
    top: calc(50% - 15px);
    left: calc(50% - 15px);;
  }
}
</style>
