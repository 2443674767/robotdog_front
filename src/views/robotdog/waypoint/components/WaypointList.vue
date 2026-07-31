<template>
  <div class="side-section">
    <div class="section-hd">
      <span>航点增加</span>
      <a-button size="mini" type="primary" @click="emit('add')">新增航点</a-button>
    </div>
    <a-spin :loading="loading" style="width: 100%; flex: 1; min-height: 0">
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
          </div>
          <div class="meta">
            X {{ item.x ?? 0 }} · Y {{ item.y ?? 0 }} · Z {{ item.z ?? 0 }} · Yaw {{ item.yaw ?? 0 }}°
          </div>
          <div v-if="item.remark" class="meta">备注：{{ item.remark }}</div>
          <div class="ops">
            <a-button size="mini" type="text" @click.stop="emit('edit', item.id)">编辑</a-button>
            <a-popconfirm content="确定删除该航点？" @ok="emit('remove', item.id)">
              <a-button size="mini" type="text" status="danger" @click.stop>删除</a-button>
            </a-popconfirm>
          </div>
        </div>
        <a-empty v-if="!loading && !list.length" description="暂无航点，请新增" />
      </div>
    </a-spin>
  </div>
</template>

<script lang="ts" setup>
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
</script>

<style lang="less" scoped>
@import './list-section.less';
</style>
