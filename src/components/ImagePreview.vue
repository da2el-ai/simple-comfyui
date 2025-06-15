<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useComfyStore } from '../stores/comfy';

const store = useComfyStore();
const { previewImages } = storeToRefs(store);

const selectImage = (index: number) => {
  store.selectImageIndex = index;
  store.galleryOpened = true;
}

</script>


<template>
    <div class="preview-container">
      <h2 class="text-xl font-semibold mb-2">Preview</h2>
      <div class="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-4 gap-4">
        <div 
          v-for="(image, index) in previewImages" 
          :key="index" 
          class="preview-item cursor-pointer"
          @click="selectImage(index)"
        >
          <img :src="image" class="w-full h-auto rounded-md" />
        </div>
      </div>
    </div>
</template>
