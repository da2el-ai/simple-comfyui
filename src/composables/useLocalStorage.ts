import { ref, watch } from 'vue';
import type { TGenerateSetting } from '../types';

// LocalStorageのキー
const STORAGE_KEY = 'comfyui-settings';


// デフォルト設定
export function useLocalStorage() {
  // デフォルト設定（checkpointは後で設定される）
  const defaultSettings: TGenerateSetting = {
    positive: '',
    negative: '',
    checkpoint: undefined,
    batchCount: 1
  };

  // 設定の状態
  const settings = ref<TGenerateSetting>({ ...defaultSettings });
  
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
        settings.value = {
          ...defaultSettings,
          ...loadedSettings
        };
      } catch (error) {
        console.error('Failed to parse settings from localStorage:', error);
        settings.value = { ...defaultSettings };
      }
    } else {
      settings.value = { ...defaultSettings };
    }
    return settings.value;
  }
  
  // LocalStorageの設定を削除する関数
  function clearSettings() {
    localStorage.removeItem(STORAGE_KEY);
    settings.value = { ...defaultSettings };
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
