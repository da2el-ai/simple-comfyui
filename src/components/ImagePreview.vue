<script setup lang="ts">

const props = defineProps<{
  images: string[];
}>();

const emit = defineEmits(['open']);

</script>


<template>
    <div class="preview-container">
      <h2 class="text-xl font-semibold mb-2">Preview</h2>
      <div class="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-4 gap-4">
        <div 
          v-for="(image, index) in props.images" 
          :key="index" 
          class="preview-item cursor-pointer"
          @click="emit('open', index)"
        >
          <img :src="image" class="w-full h-auto rounded-md" />
        </div>
      </div>
    </div>
</template>
