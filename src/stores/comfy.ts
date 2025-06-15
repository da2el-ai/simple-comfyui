import { defineStore } from 'pinia'
import type { TWorkflowConfig, TListItemData, TGenerateSetting } from '../types'

import { getters } from './getters'
import { actions } from './actions'

type TState = {
  // API関連の状態
  endpoint: string;
  isGenerating: boolean;
  queueCount: number;
  
  // ワークフロー関連
  workflow: any;
  workflowConfig: TWorkflowConfig | null;
  currentWorkflowName: string;
  workflowNameList: string[];

  // プレビュー関連
  previewImages: string[];
  
  // オブジェクト情報関連
  listItemData: TListItemData;
  objectInfo: any;

  // ギャラリー関係
  galleryOpened: boolean;
  selectImageIndex: number;

  // LocalStorage保存対象の設定
  settings: TGenerateSetting;

};

export type { TState };

export const useComfyStore = defineStore('comfy', {
  state: (): TState => ({
      // API関連の状態
      endpoint: '',
      isGenerating: false,
      queueCount: 0,
      
      // ワークフロー関連
      workflow: null as any,
      workflowConfig: null as TWorkflowConfig | null,
      currentWorkflowName: '',
      workflowNameList: [] as string[],

      // プレビュー関連
      previewImages: [] as string[],
      
      // オブジェクト情報関連
      listItemData: { checkpoint: [] } as TListItemData,
      objectInfo: null as any,

      // ギャラリー関係
      galleryOpened: false,
      selectImageIndex: 0,

      // LocalStorage保存対象の設定
      settings: {
        // ワークフロー設定
        workflowName: '',
        // 必須項目
        checkpoint: '',
        positive: '',
        negative: '',
        seed: -1,
        // 追加設定
        batchCount: 1,
        steps: 20,
        cfg: 7,
        width: 512,
        height: 512,
      }
    }),

  getters,
  actions
});
