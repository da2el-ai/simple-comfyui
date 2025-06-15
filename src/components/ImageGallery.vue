<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useComfyStore } from '../stores/comfy';

const store = useComfyStore();
const { previewImages, selectImageIndex } = storeToRefs(store);


// キーボードイベントのハンドラー
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeGallery();
  } else if (event.key === 'ArrowLeft') {
    prevImage();
  } else if (event.key === 'ArrowRight') {
    nextImage();
  }
}

// ギャラリーを閉じる
const closeGallery = () => {
  store.galleryOpened = false;
};

// 次の画像に移動
function nextImage() {
  if (selectImageIndex.value < previewImages.value.length - 1) {
    selectImageIndex.value++;
  } else {
    selectImageIndex.value = 0; // 最後の画像から最初に戻る
  }
}

// 前の画像に移動
function prevImage() {
  if (selectImageIndex.value > 0) {
    selectImageIndex.value--;
  } else {
    selectImageIndex.value = previewImages.value.length - 1; // 最初の画像から最後に移動
  }
}

// サムネイルをクリックして画像を選択
function selectImage(index: number) {
  selectImageIndex.value = index;
}

// 初期インデックスが変更されたら現在のインデックスを更新
watch(() => store.selectImageIndex, (newIndex) => {
  selectImageIndex.value = newIndex;
});

// コンポーネントがマウントされたときにキーボードイベントリスナーを追加
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
  // スクロールを無効化
  document.body.style.overflow = 'hidden';
});

// コンポーネントがアンマウントされたときにキーボードイベントリスナーを削除
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
  // スクロールを再度有効化
  document.body.style.overflow = '';
});
</script>

<template>
  <div class="gallery-overlay" v-if="store.galleryOpened">
    <div class="gallery-content" @click.stop>
      <!-- 閉じるボタン -->
      <button 
        class="close-button" 
        @click="closeGallery()"
      >
        &times;
      </button>
      
      <!-- 前へボタン -->
      <button 
        class="nav-button prev-button" 
        @click="prevImage"
        v-if="previewImages.length > 1"
      >
        &lt;
      </button>
      
      <!-- メイン画像 -->
      <div class="main-image-container">
        <img 
          :src="previewImages[selectImageIndex]" 
          class="main-image" 
          alt="Gallery image"
        />
      </div>
      
      <!-- 次へボタン -->
      <button 
        class="nav-button next-button" 
        @click="nextImage"
        v-if="previewImages.length > 1"
      >
        &gt;
      </button>
      <!-- サムネイル -->
      <div class="thumbnails-container" v-if="previewImages.length > 1">
        <div 
          v-for="(image, index) in previewImages" 
          :key="index"
          class="thumbnail"
          :class="{ active: index === selectImageIndex }"
          @click="selectImage(index)"
        >
          <img :src="image" alt="Thumbnail" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gallery-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.gallery-content {
  position: relative;
  width: 90%;
  height: 90%;
  display: flex;
  flex-direction: column;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  color: white;
  font-size: 30px;
  cursor: pointer;
  z-index: 1010;
}

.nav-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: white;
  font-size: 24px;
  padding: 15px;
  cursor: pointer;
  z-index: 1010;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.prev-button {
  left: 10px;
}

.next-button {
  right: 10px;
}

.main-image-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.main-image {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
}

.thumbnails-container {
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 10px;
  overflow-x: auto;
  background-color: rgba(0, 0, 0, 0.5);
  margin-top: 10px;
}

.thumbnail {
  width: 80px;
  height: 80px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.3s;
  overflow: hidden;
  flex: none; /* サムネイルが縮小されないようにする */
}

.thumbnail.active {
  border-color: #42b883;
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
