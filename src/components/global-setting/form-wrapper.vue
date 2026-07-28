<template>
  <a-input-number
    v-if="type === 'number'"
    :style="{ width: '120px' }"
    size="small"
    :default-value="(defaultValue as number)"
    @change="handleChange"
  />
  <a-input
    v-else-if="type === 'string'"
    :style="{ width: '120px' }"
    size="small"
    :default-value="(defaultValue as string)"
    @change="handleChange"
  />
  <a-select
    v-else-if="type === 'select'"
    size="small"
    :default-value="(defaultValue as string)"
    :placeholder="$t('data.form.select')" :options="selectList" :disabled="disablSelect"
    @change="handleChange"
    :trigger-props="{ autoFitPopupMinWidth: true }" :style="{ width: '120px' }"
  >
  </a-select>
  <a-switch
    v-else
    :default-checked="(defaultValue as boolean)"
    size="small"
    @change="handleChange"
  />
</template>

<script lang="ts" setup>
  const props = defineProps({
    type: {
      type: String,
      default: '',
    },
    name: {
      type: String,
      default: '',
    },
    defaultValue: {
      type: [String, Boolean, Number],
      default: '',
    },
    selectList: {
      type: Array,
      default: [],
    },
    disablSelect: {
      type: Boolean,
      default: false,
    },
  });
  const emit = defineEmits(['inputChange']);
  const handleChange = (value: unknown) => {
    emit('inputChange', {
      value,
      key: props.name,
    });
  };
</script>
