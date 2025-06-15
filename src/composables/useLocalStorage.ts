import { watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useComfyStore } from '../stores/comfy';
import type { TGenerateSetting } from '../types';

// LocalStorageのキー
const STORAGE_KEY = 'comfyui-settings';

// デフォルト設定
export function useLocalStorage() {
  const store = useComfyStore();
  const { settings } = storeToRefs(store);

  // デフォルト設定（checkpointは後で設定される）
  const defaultSettings: TGenerateSetting = {
    workflowName: '',
    positive: '',
    negative: '',
    checkpoint: undefined,
    seed: -1,
    batchCount: 1,
    steps: 20,
    cfg: 7,
    width: 512,
    height: 512
  };

  // 設定をLocalStorageに保存する関数
  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
  }
  
  // 設定をLocalStorageから読み込む関数
  function loadSettings(): TGenerateSetting {
    const settingsJson = localStorage.getItem(STORAGE_KEY);
    if (settingsJson) {
      try {
        const loadedSettings = JSON.parse(settingsJson);
        // デフォルト値とマージして、不足しているプロパティがあれば補完
        store.updateSettings({
          ...defaultSettings,
          ...loadedSettings
        });
      } catch (error) {
        console.error('Failed to parse settings from localStorage:', error);
        store.updateSettings(defaultSettings);
      }
    } else {
      store.updateSettings(defaultSettings);
    }
    return settings.value;
  }
  
  // LocalStorageの設定を削除する関数
  function clearSettings() {
    localStorage.removeItem(STORAGE_KEY);
    store.updateSettings(defaultSettings);
  }
  
  // 設定が変更されたときにLocalStorageに保存
  watch(settings, () => {
    saveSettings();
  }, { deep: true });
  
  // 初期化時に設定を読み込む
  loadSettings();
  
  return {
    settings,
    saveSettings,
    loadSettings,
    clearSettings
  };
}
