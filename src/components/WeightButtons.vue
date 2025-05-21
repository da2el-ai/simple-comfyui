<script setup lang="ts">
import { nextTick } from 'vue';

// プロパティの定義
const props = defineProps<{
  modelValue: string;
  targetElement: HTMLTextAreaElement | null;
}>();

// イベントの定義
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

/**
 * カーソル位置の単語に重みを付与または更新する関数
 * @param {string} text - カンマ区切りのテキスト
 * @param {number} cursorPos - カーソル位置
 * @param {number} weightChange - 追加/減算する重み (正負両方対応)
 * @return {{text: string, lengthDiff: number}} 加工後のテキストと長さの差分
 */
function updateWordWeight(text:string, cursorPos:number, weightChange:number) :{text: string, lengthDiff: number} {
  // カンマで分割して配列にする
  const words = text.split(',');
  
  let currentPos = 0;
  let lengthDiff = 0;
  
  // カーソルがある単語を特定
  for (let i = 0; i < words.length; i++) {
    const wordLength = words[i].length;
    
    // カンマの長さも考慮（最後の要素以外）
    const segmentLength = i < words.length - 1 ? wordLength + 1 : wordLength;
    
    // このセグメント内にカーソルがあるか確認
    if (cursorPos >= currentPos && cursorPos <= currentPos + segmentLength) {
      const word = words[i].trim();
      const originalLength = words[i].length;
      
      // 既に重みパターンかどうかチェック (例: (word:1.2))
      const weightPattern = /^\((.+):([+-]?\d+(\.\d+)?)\)$/;
      const match = word.match(weightPattern);
      
      if (match) {
        // 既存の重みに加算/減算
        const originalWord = match[1];
        const currentWeight = parseFloat(match[2]);
        const newWeight = currentWeight + weightChange;
        
        // 重みが丁度1の場合は装飾なしの単語だけにする
        if (Math.abs(newWeight - 1.0) < 0.0001) {
          words[i] = originalWord;
        } else {
          words[i] = `(${originalWord}:${newWeight.toFixed(1)})`;
        }
      } else {
        // 新しく重みを付ける
        const baseWeight = 1.0;
        const newWeight = baseWeight + weightChange;
        // 重みが丁度1の場合は装飾不要
        if (Math.abs(newWeight - 1.0) < 0.0001) {
          words[i] = word;
        } else {
          words[i] = `(${word}:${newWeight.toFixed(1)})`;
        }
      }
      
      // カーソル位置より前の部分の長さの差分を計算
      if (cursorPos > currentPos) {
        lengthDiff = words[i].length - originalLength;
      }
      break;
    }
    
    currentPos += segmentLength;
  }
  
  // 加工した配列を再度カンマで結合
  return {
    text: words.join(','),
    lengthDiff
  };
}

const setWeight = async (weightChange: number) => {
    if (!props.targetElement) return;
    
    const originalPos = props.targetElement.selectionStart;
    const result = updateWordWeight(props.modelValue, originalPos, weightChange);
    emit('update:modelValue', result.text);
    
    // DOMの更新を待ってからカーソル位置を復元（文字数の変更を考慮）
    await nextTick();
    const newPos = originalPos + result.lengthDiff;
    props.targetElement.setSelectionRange(newPos, newPos);
    props.targetElement.focus();
};

const setWeightPlus = () => {
    setWeight(0.1);
};

const setWeightMinus = () => {
    setWeight(-0.1);
};

</script>

<template>
    <div class="w-1/3 flex gap-4">
      <button 
        @click="setWeightPlus"
        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
      >
        ▲
      </button>

      <button 
        @click="setWeightMinus" 
        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
      >
        ▼
      </button>
    </div>
</template>
