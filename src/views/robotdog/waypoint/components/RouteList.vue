<template>
  <div class="side-section" :class="{ 'is-collapsed': collapsed }">
    <div class="section-hd">
      <div class="hd-left" @click="collapsed = !collapsed">
        <icon-down class="hd-arrow" :class="{ 'is-collapsed': collapsed }" />
        <span class="hd-title">航线建立</span>
      </div>
      <div class="hd-actions">
        <a-button size="mini" type="primary" @click="emit('add')">新建航线</a-button>
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
            <div class="meta">绑定机械狗：{{ dogName(item.dog_id) }}</div>
            <div class="meta">
              航点 {{ routeWaypointCount(item) }} 个
              <span v-if="item.run_status"> · 执行 {{ runStatusText(item.run_status) }}</span>
              <span v-if="item.updated_at"> · 更新 {{ item.updated_at }}</span>
            </div>
            <div class="ops">
              <a-button size="mini" type="text" @click.stop="emit('edit', item.id)">编辑</a-button>
              <a-popconfirm
                :content="`确定执行航线「${item.name}」？`"
                @ok="emit('start', item.id)"
              >
                <a-button
                  size="mini"
                  type="text"
                  :loading="startingRouteId === item.id"
                  @click.stop
                >执行</a-button>
              </a-popconfirm>
              <a-button
                v-if="item.status !== 'published'"
                size="mini"
                type="text"
                @click.stop="emit('publish', item.id)"
              >发布</a-button>
              <a-popconfirm content="确定删除该航线？" @ok="emit('remove', item.id)">
                <a-button size="mini" type="text" status="danger" @click.stop>删除</a-button>
              </a-popconfirm>
            </div>
          </div>
          <a-empty v-if="!loading && !list.length" description="暂无航线" />
        </div>
      </a-spin>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { IconDown } from '@arco-design/web-vue/es/icon';
import type { DogItem, RouteItem } from '@/api/robotdog/waypoint';
import { routeWaypointCount } from '../utils/routeWaypoints';

const props = defineProps<{
  list: RouteItem[];
  dogs: DogItem[];
  activeId: number | null;
  loading?: boolean;
  startingRouteId?: number | null;
}>();

const emit = defineEmits<{
  (e: 'select', id: number): void;
  (e: 'add'): void;
  (e: 'edit', id: number): void;
  (e: 'publish', id: number): void;
  (e: 'remove', id: number): void;
  (e: 'start', id: number): void;
}>();

const collapsed = ref(true);

const dogName = (dogId?: number | null) =>
  props.dogs.find((d) => d.id === dogId)?.name || '未绑定';

const statusText = (s?: string) =>
  ({ draft: '草稿', ready: '待发布', published: '已发布' }[s || ''] || s || '-');

const statusColor = (s?: string) =>
  ({ draft: 'gray', ready: 'orangered', published: 'green' }[s || ''] || 'gray');

const runStatusText = (s?: string) =>
  ({ running: '运行中', completed: '已完成', failed: '失败', idle: '空闲' }[s || ''] || s || '-');
</script>

<style lang="less" scoped>
@import './list-section.less';
</style>
