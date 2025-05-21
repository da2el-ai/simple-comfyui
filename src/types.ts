/**
 * 生成設定の定義
 */
type TGenerateSetting = {
  positive: string;
  negative: string;
  checkpoint: string | undefined;
  batchCount: number;
  [key: string]: string | number | undefined;
};

/**
 * リスト形式の内容を保持する変数
 */
type TListItemData = {
    checkpoint: string[];
    [key: string]: string[];
};

/**
 * ワークフロー設定YAMLの型定義
 */
type TWorkflowConfigRequiredItem = {
  id: string;
  workflow: {
    search_type: 'class_type' | 'id' | 'title';
    search_value: string | number;
    input_name: string;
  };
};

// 継承の代わりに交差型を使用して拡張
type TWorkflowConfigOptionalItem = TWorkflowConfigRequiredItem & {
  input: {
    title: string;
    type: 'list' | 'text' | 'number';
    value: any;
    default?: string | number
  };
};

type TWorkflowConfig = {
  output_node_id: number;
  required: TWorkflowConfigRequiredItem[];
  optional: TWorkflowConfigOptionalItem[];
};

export type { 
    TWorkflowConfigRequiredItem, TWorkflowConfigOptionalItem, TWorkflowConfig,
    TListItemData,
    TGenerateSetting
 }

