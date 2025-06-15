import type { TWorkflowConfigOptionalItem, TWorkflowConfigRequiredItem } from '../types'
import type { TState } from './comfy'

export const getters = {
  // ワークフロー関連
  // getConfig: (state: TState): TWorkflowConfig | null => state.workflowConfig,
  // getWorkflowNameList: (state: TState): string[] => state.workflowNameList,
  // getCurrentWorkflowName: (state: TState): string => state.currentWorkflowName,

  // 生成状態関連
  // isGenerating: (state: TState): boolean => state.isGenerating,
  // getQueueCount: (state: TState): number => state.queueCount,

  // プレビュー関連
  // getPreviewImages: (state: TState): string[] => state.previewImages,

  // 設定関連
  // getSettings: (state: TState) => state.settings,

  // モデル関連
  // getCheckpoints: (state: TState): string[] => state.listItemData.checkpoint,
  // getCurrentCheckpoint: (state: TState): string => state.settings.checkpoint as string,

  // ワークフロー設定ヘルパー
  findItemFromConfig: (state: TState) => (category: "required" | "optional", id: string): TWorkflowConfigOptionalItem | TWorkflowConfigRequiredItem | null => {
    if (!state.workflowConfig || !state.workflowConfig[category]) return null
    return state.workflowConfig[category].find(item => item.id === id) || null
  },

  /**
   * ワークフローからノードを検索
   * @param searchType 
   * @param searchValue 
   * @returns 
   */
  findNodeFromWorkflow: (state: TState) => (searchType: 'class_type' | 'id' | 'title', searchValue: string | number) => {
    if (!state.workflow) return null;
    
    for (const nodeId in state.workflow) {
      const node = state.workflow[nodeId];
      const stringValue = String(searchValue);
      
      switch (searchType) {
        case 'class_type':
          if (node.class_type === searchValue) {
            return node;
          }
          break;
        case 'id':
          if (nodeId === stringValue) {
            return node;
          }
          break;
        case 'title':
          if (node._meta?.title === searchValue) {
            return node;
          }
          break;
      }
    }
    return null;
  },

}
