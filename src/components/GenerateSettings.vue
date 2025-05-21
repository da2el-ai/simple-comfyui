<script setup lang="ts">
import { computed, watch, ref, onMounted } from 'vue';
import { useComfyApi } from '../composables/useComfyApi';
import { useLocalStorage } from '../composables/useLocalStorage';
import AutoComplete from './AutoComplete.vue';
import DynamicInput from './DynamicInput.vue';
import WeightButtons from './WeightButtons.vue';
import type { TWorkflowConfig } from '../types';

const MAX_BATCH_COUNT = 10;

// ComfyAPIを取得
const comfyApi = useComfyApi();
const { isGenerating, queueCount, clearPreview, cancelGeneration, listItemData, currentWorkflowName, workflowNameList } = comfyApi;

// LocalStorageを取得
const localStorage = useLocalStorage();
const settings = localStorage.settings;

const configData = ref<TWorkflowConfig | null>(null);


// テキストエリアの参照
const positiveTextareaRef = ref<HTMLTextAreaElement | null>(null);
const negativeTextareaRef = ref<HTMLTextAreaElement | null>(null);

// 設定の参照を簡略化
const positive = computed({
  get: () => settings.value.positive,
  set: (value) => settings.value.positive = value
});

const negative = computed({
  get: () => settings.value.negative,
  set: (value) => settings.value.negative = value
});

// テキストエリアの入力ハンドラー
function handlePositiveInput(event: Event) {
  const textarea = event.target as HTMLTextAreaElement;
  positive.value = textarea.value;
}

function handleNegativeInput(event: Event) {
  const textarea = event.target as HTMLTextAreaElement;
  negative.value = textarea.value;
}

const batchCount = computed({
  get: () => settings.value.batchCount,
  set: (value) => settings.value.batchCount = Math.min(value, MAX_BATCH_COUNT)
});


// batchCountが50を超えないようにする
watch(() => settings.value.batchCount, (newValue) => {
  if (newValue > MAX_BATCH_COUNT) {
    settings.value.batchCount = MAX_BATCH_COUNT;
  }
}, { immediate: true });



// 初期設定の読み込み
onMounted(async () => {
  await comfyApi.initialized;
  const config = comfyApi.getConfig();
  if (config) {
    configData.value = config;
  }
  // console.log("[GenerateSettings] onMounted - ", settings.value);
});

// ワークフロー変更ハンドラー
async function handleWorkflowChange(event: Event) {
  const workflowName = (event.target as HTMLSelectElement).value;

  settings.value.workflowName = workflowName;

  await comfyApi.setWorkflow(workflowName);
  configData.value = comfyApi.getConfig();
  // console.log("[GenerateSettings.handleWorkflowChange] config", comfyApi.getConfig());
}

// 画像生成
function generateImages() {
  comfyApi.generateImages(settings.value);
}

/**
 * 設定値を取得する汎用関数
 * 優先順位：
 * 1. settings[key]の値が存在する場合はそれを使用
 * 2. optionsが存在し、要素が1つ以上ある場合は最初の要素を使用
 * 3. defaultValueまたは空文字を使用
 */
function getSettingValue(key: string, options?: string[], defaultValue: string | number = ''): string | number {
  if (settings.value[key] !== undefined) {
    return settings.value[key];
  }
  
  if (options && options.length > 0) {
    return options[0];
  }
  
  return defaultValue;
}

</script>

<template>
  <section id="generate-settings">
    <div class="mb-4">
      <label class="block text-sm font-medium mb-1">Positive Prompt</label>
      <div class="relative">
        <textarea
        ref="positiveTextareaRef"
        v-model="positive"
        placeholder="Enter your prompt here..."
        class="w-full p-2 border rounded-md resize-vertical"
        rows="4"
        @input="handlePositiveInput"
      ></textarea>
      <AutoComplete
        v-model="positive"
        :targetElement="positiveTextareaRef"
      />
    </div>
    </div>
    
    <div class="flex gap-4 mb-4">
      <div class="w-1/3">
        <label class="block text-sm font-medium mb-1">Batch Count</label>
        <input 
          v-model.number="batchCount" 
          type="number" 
          min="1" 
          max="50" 
          class="w-full p-2 border rounded-md"
        />
      </div>
      
      <div class="w-1/3">
        <label class="block text-sm font-medium mb-1">Queue Count</label>
        <div class="p-2 flex gap-4">
            <span>{{ queueCount }}</span>
            <span class="c-loading" :data-generating="queueCount > 0 ? 'true' : 'false'">★</span>
        </div>
      </div>

      <WeightButtons v-model="positive" :targetElement="positiveTextareaRef" />

    </div>
    
    <div class="flex gap-4 mb-6">
      <!-- 生成開始ボタン -->
      <button 
        @click="generateImages" 
        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
        :disabled="isGenerating || !configData"
      >
        {{ isGenerating ? 'Generating...' : 'Generate' }}
      </button>
      
      <!-- キャンセルボタン -->
      <button 
        v-if="queueCount > 0"
        @click="cancelGeneration" 
        class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
      >
        Cancel
      </button>

      <!-- プレビュー破棄ボタン -->
      <button 
        @click="clearPreview" 
        class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
      >
        Clear Preview
      </button>
    </div>

    <!-- 詳細設定 -->
    <details class=" mb-6">
      <summary>Advanced Settings</summary>

      <div class="flex gap-4 mb-6" style="flex-wrap: wrap;">
        <!-- ネガティブ -->
        <div class="w-full">
          <label class="block text-sm font-medium mb-1">Negative Prompt</label>
          <div class="relative">
            <textarea
            ref="negativeTextareaRef"
            v-model="negative"
            placeholder="Enter negative prompt here..."
            class="w-full p-2 border rounded-md resize-vertical"
            rows="2"
            @input="handleNegativeInput"
          ></textarea>
          <AutoComplete
            v-model="negative"
            :targetElement="negativeTextareaRef"
          />
        </div>
        </div>

        <!-- チェックポイント -->
        <div class="w-full">
          <label class="block text-sm font-medium mb-1">Checkpoint</label>
          <select 
            :value="getSettingValue('checkpoint', listItemData.checkpoint)"
            @change="e => settings.checkpoint = (e.target as HTMLSelectElement).value"
            class="w-full p-2 border rounded-md"
          >
            <option v-for="cp in listItemData.checkpoint" :key="cp" :value="cp">{{ cp }}</option>
          </select>
        </div>

        <!-- 追加の動的入力項目 (optional項目のみ) -->
        <template v-if="configData && configData.optional">
          <DynamicInput
            v-for="item in configData.optional"
            :key="item.id"
            :type="item.input.type"
            :title="item.input.title"
            :value="getSettingValue(item.id, listItemData[item.id], item.input.default ?? '')"
            :options="item.input.type === 'list' ? listItemData[item.id] : undefined"
            @update:value="v => settings[item.id] = v"
          />
        </template>

        <!-- ワークフロー選択 -->
        <div class="w-full">
          <label class="block text-sm font-medium mb-1">Workflow</label>
          <select 
            :value="currentWorkflowName"
            @change="handleWorkflowChange"
            class="w-full p-2 border rounded-md"
          >
            <option v-for="wf in workflowNameList" :key="wf" :value="wf">{{ wf }}</option>
          </select>
        </div>
        
      </div>
    </details>


  </section>
</template>
