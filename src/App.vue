<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ImageGallery from './components/ImageGallery.vue';
import ImagePreview from './components/ImagePreview.vue';
import GenerateSettings from './components/GenerateSettings.vue';
import { useComfyApi } from './composables/useComfyApi';

// ComfyAPI
const comfyApi = ref();

// ComfyUI Endpointの取得とAPI初期化
onMounted(async () => {
  const response = await fetch('/api/comfyui_endpoint');
  const { endpoint } = await response.json();
  comfyApi.value = useComfyApi({ endpoint });
});

</script>

<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">ComfyUI Simple Interface</h1>
    
    <GenerateSettings v-if="comfyApi" />

    <!--  プレビューコンポーネント -->
    <ImagePreview v-if="comfyApi" />
    
    <!-- ギャラリーコンポーネント -->
    <ImageGallery  v-if="comfyApi" />
  </div>
</template>
