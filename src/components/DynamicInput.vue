<script setup lang="ts">
interface Props {
  type: 'list' | 'text' | 'number';
  title: string;
  value: any;
  options?: string[];
}

defineProps<Props>();
const emit = defineEmits(['update:value']);
</script>

<template>
  <div class="w-full">
    <label class="block text-sm font-medium mb-1">{{ title }}</label>
    
    <!-- リスト選択 -->
    <select
      v-if="type === 'list' && options"
      :value="value"
      @input="$emit('update:value', ($event.target as HTMLSelectElement).value)"
      class="w-full p-2 border rounded-md"
    >
      <option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option>
    </select>
    
    <!-- テキスト入力 -->
    <input
      v-if="type === 'text'"
      type="text"
      :value="value"
      @input="$emit('update:value', ($event.target as HTMLInputElement).value)"
      class="w-full p-2 border rounded-md"
    />
    
    <!-- 数値入力 -->
    <input
      v-if="type === 'number'"
      type="number"
      :value="value"
      @input="$emit('update:value', Number(($event.target as HTMLInputElement).value))"
      class="w-full p-2 border rounded-md"
    />
  </div>
</template>
