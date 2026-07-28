<template>
  <div>
    <a-card title="附件管理" :bordered="false" :body-style="{ padding: 0 }">
      <a-menu :default-open-keys="['0']" :selected-keys="[selectedKey]">
        <a-sub-menu key="0">
          <template #icon>
            <icon-apps></icon-apps>
          </template>
          <template #title>文件类型</template>
          <a-menu-item v-for="item in FileTypeList" :key="item.value.toString()" @click="onClickItem(item)">
            <template #icon>
              <Icon :size="28" :icon="item.icon"></Icon>
            </template>
            <span class="unselect">{{ item.name }}</span>
          </a-menu-item>
        </a-sub-menu>
      </a-menu>
    </a-card>
    <FileAsideStatistics />
  </div>
</template>

<script setup lang="ts">
import { ref,watch} from 'vue';
import { useRoute ,useRouter} from 'vue-router'
import {Icon} from '@/components/Icon';
import { FileTypeList, type FileTypeListItem } from '../file'
import FileAsideStatistics from './FileAsideStatistics.vue'
const emits = defineEmits(['ok'])
const route = useRoute()
const router = useRouter()

const selectedKey = ref('all')

// 监听路由变化
// watch(
//   () => route.query,
//   () => {
//     if (route.query.type) {
//       selectedKey.value = route.query.type as string
//     }
//   },
//   {
//     immediate: true
//   }
// )

// 点击事件
const onClickItem = (item: FileTypeListItem) => {
  selectedKey.value=item.value
  emits('ok', item.value)
  // router.push({ name: 'filemanage', query: { type: item.value } })
}
</script>

<style lang="less" scoped>
:deep(.arco-card) {
  .arco-card-header {
    border-bottom-style: dashed;
    margin: 0 16px;
    padding-left: 0;
    padding-right: 0;
  }
  .arco-card-header-title {
      color: var(--color-text-1);
      font-size: 18px;
      font-weight: 500;
      line-height: 1.5;
  }
}
</style>
