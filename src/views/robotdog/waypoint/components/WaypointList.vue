<template>
  <div class="side-section" :class="{ 'is-collapsed': collapsed }">
    <div class="section-hd">
      <div class="hd-left" @click="collapsed = !collapsed">
        <icon-down class="hd-arrow" :class="{ 'is-collapsed': collapsed }" />
        <span class="hd-title">航点增加</span>
      </div>
      <div class="hd-actions">
        <a-button size="mini" type="primary" @click="emit('add')">新增航点</a-button>
      </div>
    </div>
    <div v-show="!collapsed" class="section-body">
      <a-spin :loading="loading" style="width: 100%; height: 100%; display: flex; flex-direction: column; min-height: 0">
        <div class="list">
          <div
            v-for="(item, idx) in list"
            :key="item.id"
            class="card"
            :class="{ active: item.id === activeId }"
            @click="emit('select', item.id)"
          >
            <div class="row">
              <div class="name">{{ idx + 1 }}. {{ item.name }}</div>
              <div class="ops ops-inline">
                <a-button size="mini" type="text" @click.stop="emit('edit', item.id)">编辑</a-button>
                <a-popconfirm content="确定删除该航点？" @ok="emit('remove', item.id)">
                  <a-button size="mini" type="text" status="danger" @click.stop>删除</a-button>
                </a-popconfirm>
              </div>
            </div>
          </div>
          <a-empty v-if="!loading && !list.length" description="暂无航点，请新增" />
        </div>
      </a-spin>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { IconDown } from '@arco-design/web-vue/es/icon';
import type { WaypointItem } from '@/api/robotdog/waypoint';

defineProps<{
  list: WaypointItem[];
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
</script>

<style lang="less" scoped>
@import './list-section.less';

.ops-inline {
  margin-top: 0;
  flex-shrink: 0;
}
</style>
