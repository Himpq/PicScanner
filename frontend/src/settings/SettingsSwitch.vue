<script setup>
defineProps({
  title: { type: String, required: true },
  detail: { type: String, default: '' },
  modelValue: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);
</script>

<template>
  <label class="settings-switch-row">
    <span>
      <strong>{{ title }}</strong>
      <small v-if="detail">{{ detail }}</small>
    </span>
    <input type="checkbox" :checked="modelValue" @change="emit('update:modelValue', $event.target.checked)" />
    <i aria-hidden="true"></i>
  </label>
</template>
