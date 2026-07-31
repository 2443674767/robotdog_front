<template>
  <div class="side-section" :class="{ 'is-collapsed': collapsed }">
    <div class="section-hd">
      <div class="hd-left" @click="collapsed = !collapsed">
        <icon-down class="hd-arrow" :class="{ 'is-collapsed': collapsed }" />
        <span class="hd-title">机械狗配置</span>
      </div>
      <div class="hd-actions">
        <a-button size="mini" type="primary" @click="emit('add')">新增</a-button>
      </div>
    </div>
    <div v-show="!collapsed" class="section-body">
      <a-spin :loading="loading" style="width: 100%; height: 100%; display: flex; flex-direction: column; min-height: 0">
        <div class="list">
          <div
            v-for="item in list"
            :key="item.id"
            class="card"
            :class="{ active: item.id === activeId }"
            @click="emit('select', item.id)"
          >
            <div class="row">
              <div class="name">{{ item.name }}</div>
              <a-tag size="small" :color="statusColor(item.status)">{{ statusText(item.status) }}</a-tag>
            </div>
            <div class="meta">SN {{ item.sn || '-' }} · {{ item.model || '-' }}</div>
            <div class="meta">速度 {{ item.max_speed ?? '-' }} m/s · 电量 {{ item.battery ?? '-' }}%</div>
            <div class="ops">
              <a-button size="mini" type="text" @click.stop="emit('edit', item.id)">编辑</a-button>
              <a-popconfirm content="确定删除该机械狗配置？" @ok="emit('remove', item.id)">
                <a-button size="mini" type="text" status="danger" @click.stop>删除</a-button>
              </a-popconfirm>
            </div>
          </div>
          <a-empty v-if="!loading && !list.length" description="暂无机械狗配置" />
        </div>
      </a-spin>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { IconDown } from '@arco-design/web-vue/es/icon';
import type { DogItem } from '@/api/robotdog/waypoint';

defineProps<{
  list: DogItem[];
  activeId: number | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', id: number): void;
  (e: 'add'): void;
  (e: 'edit', id: number): void;
  (e: 'remove', id: number): void;
}>();

const collapsed = ref(false);

const statusText = (s?: string) =>
  ({ online: '在线', offline: '离线', busy: '任务中' }[s || ''] || s || '-');

const statusColor = (s?: string) =>
  ({ online: 'green', offline: 'gray', busy: 'orangered' }[s || ''] || 'gray');
</script>

<style lang="less" scoped>
@import './list-section.less';
</style>
