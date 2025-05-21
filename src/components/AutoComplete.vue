<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useAutoCompleteTags } from '../composables/useAutoCompleteTags';

// プロパティの定義
const props = defineProps<{
  modelValue: string;
  targetElement: HTMLTextAreaElement | null;
}>();

// イベントの定義
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

// タグ関連の機能を取得
const { filterTags } = useAutoCompleteTags();

// ローカルの状態
const suggestionsRef = ref<HTMLDivElement | null>(null);
const filteredTags = ref<string[]>([]);
const showSuggestions = ref(false);
const searchTerm = ref('');
const cursorPosition = ref({ top: 0, left: 0 });
const selectionStart = ref(0);
const selectionEnd = ref(0);

/**
 * テキストエリアの入力を監視する関数
 */
function watchTextareaInput() {
  if (!props.targetElement) return;
  
  const textarea = props.targetElement;
  const value = textarea.value;
  
  // カーソル位置を保存
  selectionStart.value = textarea.selectionStart;
  selectionEnd.value = textarea.selectionEnd;
  
  // カーソル位置の前の文字列を取得
  const textBeforeCursor = value.substring(0, textarea.selectionStart);
  
  // カーソル位置の前の単語を取得（英数字とアンダースコアのみ）
  const match = textBeforeCursor.match(/[0-9a-zA-Z_]+$/);
  
  if (match && match[0].length >= 2) {
    // 2文字以上の単語が見つかった場合
    searchTerm.value = match[0];
    
    // 共有のフィルタリング関数を使用
    const filtered = filterTags(searchTerm.value);
    filteredTags.value = filtered;
    
    if (filteredTags.value.length > 0) {
      // 候補を表示
      showSuggestions.value = true;
      // DOMの更新後にカーソル位置を計算
      nextTick(() => {
        calculateCursorPosition();
      });
    } else {
      showSuggestions.value = false;
    }
  } else {
    // 単語が見つからない、または2文字未満の場合
    showSuggestions.value = false;
  }
}

/**
 * カーソル位置を計算
 */
function calculateCursorPosition() {
  if (!props.targetElement) return;
  
  const textarea = props.targetElement;
  const { selectionStart } = textarea;
  
  // カーソル位置の座標を計算するための一時的な要素
  const mirror = document.createElement('div');
  mirror.style.cssText = window.getComputedStyle(textarea).cssText;
  mirror.style.height = 'auto';
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  
  // テキストエリアの内容をコピー
  const textBeforeCursor = textarea.value.substring(0, selectionStart);
  mirror.textContent = textBeforeCursor;
  
  document.body.appendChild(mirror);
  
  // カーソル位置の少し下に表示するために、行の高さ分だけ下にずらす
  const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) * 0.5 || 10;

  // 候補リストの位置を計算
  let left = mirror.clientWidth;
  
  // ウィンドウの右端を超えないように調整。150はmin-widthの値
  const suggestionsRect = suggestionsRef.value ? suggestionsRef.value.getBoundingClientRect() : {width:150};
  const viewportWidth = window.innerWidth;
  
  if (left + suggestionsRect.width > viewportWidth) {
    left = Math.max(0, viewportWidth - suggestionsRect.width);
  }

  cursorPosition.value = {
    top: mirror.clientHeight + lineHeight,
    left: left
  };
  
  document.body.removeChild(mirror);
}

/**
 * 候補をクリック
 * @param tag 
 */
function selectSuggestion(tag: string) {
  if (!props.targetElement) return;
  
  const textarea = props.targetElement;
  const value = textarea.value;
  
  // カーソル位置の前の文字列を取得
  const textBeforeCursor = value.substring(0, selectionStart.value);
  const textAfterCursor = value.substring(selectionEnd.value);
  
  // カーソル位置の前の単語を取得（英数字とアンダースコアのみ）
  const match = textBeforeCursor.match(/[0-9a-zA-Z_]+$/);
  
  if (match) {
    // 検索語を候補で置き換え
    const newTextBeforeCursor = textBeforeCursor.substring(0, textBeforeCursor.length - match[0].length) + tag + ', ';
    const newValue = newTextBeforeCursor + textAfterCursor;
    
    // モデル値を更新
    emit('update:modelValue', newValue);
    
    // カーソル位置を更新
    nextTick(() => {
      if (props.targetElement) {
        props.targetElement.focus();
        const newCursorPosition = newTextBeforeCursor.length;
        props.targetElement.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    });
  }
  
  // 候補を非表示
  showSuggestions.value = false;
}

/**
 * クリックイベントを処理
 * @param event 
 */
function handleClickOutside(event: MouseEvent) {
  if (suggestionsRef.value && !suggestionsRef.value.contains(event.target as Node)) {
    showSuggestions.value = false;
  }
}

/**
 * キーダウンイベントを処理
 * @param event 
 */
 function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && showSuggestions.value) {
    showSuggestions.value = false;
    event.preventDefault();
  }
}

// コンポーネントがマウントされたときの処理
onMounted(() => {
  // クリックイベントリスナーを追加
  document.addEventListener('click', handleClickOutside);
  
  // キーダウンイベントリスナーを追加
  document.addEventListener('keydown', handleKeyDown);
  
  // テキストエリアの入力イベントリスナーを追加
  if (props.targetElement) {
    props.targetElement.addEventListener('input', watchTextareaInput);
  }
});

// コンポーネントがアンマウントされたときにイベントリスナーを削除
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeyDown);
  
  // テキストエリアの入力イベントリスナーを削除
  if (props.targetElement) {
    props.targetElement.removeEventListener('input', watchTextareaInput);
  }
});

// targetElementが変更されたときの処理
watch(() => props.targetElement, (newElement: HTMLTextAreaElement | null, oldElement: HTMLTextAreaElement | null) => {
  // 古い要素からイベントリスナーを削除
  if (oldElement) {
    oldElement.removeEventListener('input', watchTextareaInput);
  }
  
  // 新しい要素にイベントリスナーを追加
  if (newElement) {
    newElement.addEventListener('input', watchTextareaInput);
  }
});
</script>

<template>
  <div
    v-if="showSuggestions"
    ref="suggestionsRef"
    class="suggestions-container"
    :style="{
      top: `${cursorPosition.top}px`,
      left: `${cursorPosition.left}px`
    }"
  >
    <div
      v-for="(tag, index) in filteredTags"
      :key="index"
      class="suggestion-item"
      @click="selectSuggestion(tag)"
    >
      {{ tag }}
    </div>
  </div>
</template>

<style scoped>
.suggestions-container {
  position: absolute;
  z-index: 10;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 0.25rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  width: auto;
  min-width: 150px;
}

.suggestion-item {
  padding: 0.5rem;
  cursor: pointer;
}

.suggestion-item:hover {
  background-color: #f0f0f0;
}
</style>
