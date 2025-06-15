import type { TState } from './comfy'

// type StoreType = Store<'comfy', TState, any, any>

export const actions = {
  // 設定関連
  updateSettings(this: TState, setting: {}) {
    Object.assign(this.settings, setting)
  },

  // ワークフロー関連
  setWorkflowName(this: TState, name: string) {
    this.currentWorkflowName = name
    this.settings.workflowName = name
  },

  // プレビュー関連
  clearPreview(this: TState) {
    this.previewImages = []
  },

  // 生成状態関連
  setGenerating(this: TState, status: boolean) {
    this.isGenerating = status;
  },

  setQueueCount(this: TState, count: number) {
    this.queueCount = count
  },

  // API初期化
  initialize(this: TState, endpoint: string) {
    this.endpoint = endpoint
  },

  /**
   * ワークフローに値をセットする
   * @param category 
   * @param id 
   * @param value 
   * @returns 
   */
  setNodeValueByConfig(this: TState, category: "required"|"optional", id: string, value: any) {
    const item = (this as any).findItemFromConfig(category, id);
    if(!item) return null;

    const node = (this as any).findNodeFromWorkflow(item.workflow.search_type, item.workflow.search_value);
    if(!node) return null;

    node.inputs[item.workflow.input_name] = value;
  }
}
