import { ref } from 'vue';
import type { Ref } from 'vue';
import yaml from 'js-yaml';
import { useLocalStorage } from '../composables/useLocalStorage';
import type { TWorkflowConfig, TWorkflowConfigOptionalItem, TWorkflowConfigRequiredItem, TListItemData, TGenerateSetting } from '../types'; 

export interface ComfyApiOptions {
  endpoint: string;
}

// ComfyAPIの戻り値の型定義
export interface ComfyApi {
  isGenerating: Ref<boolean>;
  queueCount: Ref<number>;
  previewImages: Ref<string[]>;
  listItemData: Ref<TListItemData>;
  currentWorkflowName: Ref<string>;
  workflowNameList: Ref<string[]>;
  getConfig: () => TWorkflowConfig;
  setWorkflow: (workflowName: string) => Promise<any>;
  findItemFromConfig: (category:"required"|"optional", id:string) => TWorkflowConfigOptionalItem | TWorkflowConfigRequiredItem | null;
  generateImages: (settings: TGenerateSetting) => Promise<void>;
  clearPreview: () => void;
  cancelGeneration: () => Promise<void>;
  loadWorkflowConfig: (workflowName: string) => Promise<any>;
  fetchWorkflows: () => Promise<void>;
  initialized: Promise<void>;
}

// 画像生成のパラメータを定義するインターフェース
export interface GenerateImagesParams {
  settings: TGenerateSetting;
}

// シングルトンインスタンス
let instance: ComfyApi | null = null;

// ComfyAPIを作成する関数
function createComfyApi(options: ComfyApiOptions): ComfyApi {
  const { endpoint } = options;
  
  // 状態
  const isGenerating = ref(false);
  const queueCount = ref(0);
  const previewImages = ref<string[]>([]);
  const promptIds = ref<string[]>([]);
  const listItemData = ref<TListItemData>({checkpoint:[]});
  const objectInfo = ref<any>(null);
  
  // ワークフロー関連の状態
  let workflow: any = null;
  let config: TWorkflowConfig | null = null;
  const currentWorkflowName = ref('');
  const workflowNameList = ref<string[]>([]);

  /**
   * 利用可能なワークフローの一覧を取得
   */
  async function fetchWorkflows() {
    try {
      const response = await fetch('/api/workflows');
      if (response.ok) {
        const workflows = await response.json();
        workflowNameList.value = workflows || [];
        // console.log("fetchWorkflows", workflowNameList.value);
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      workflowNameList.value = [];
    }
  }

  /**
   * ワークフロー設定を取得
   * @returns 
   */
  function getConfig():TWorkflowConfig{
    return config as TWorkflowConfig;
  }

  /**
   * ワークフローを設定
   * @param workflowName string
   * @returns 
   */
  async function setWorkflow(workflowName: string) {
    // console.log("setWorkflow : ", workflowName);

    try {
      // JSONファイルを読み込む
      const response = await fetch(`/workflow/${workflowName}.json`);
      if (!response.ok) {
        throw new Error(`Workflow file not found: ${workflowName}.json`);
      }
      workflow = await response.json();

      // ワークフロー設定を読み込む
      config = await loadWorkflowConfig(workflowName);

      currentWorkflowName.value = workflowName;

      // オブジェクト情報を取得
      await fetchObjectInfo();
      
      return workflow;
    } catch (error) {
      console.error('Failed to load workflow:', error);
      return null;
    }
  }

  /**
   * configファイルを読み込む
   * @param workflowName 
   * @returns 
   */
  async function loadWorkflowConfig(workflowName: string) {
    try {
      const response = await fetch(`/workflow/${workflowName}_config.yaml`);
      if (!response.ok) {
        throw new Error(`Config file not found: ${workflowName}_config.yaml`);
      }
      const yamlText = await response.text();
      return yaml.load(yamlText) as any;
    } catch (error) {
      console.error('Failed to load workflow config:', error);
      return null;
    }
  }

  /**
   * チェックポイント一覧など取得
   */
  async function fetchObjectInfo() {
    // LocalStorageを取得
    const { settings } = useLocalStorage();

    try {
      const response = await fetch(`${endpoint}/object_info`);
      objectInfo.value = await response.json();
      // console.log('Object info loaded:', objectInfo.value);

      // 追加項目データをクリア
      listItemData.value = {
        checkpoint: []
      };
      
      // Checkpointリストを取得
      if (objectInfo.value && objectInfo.value["D2 Checkpoint Loader"]?.input?.required?.ckpt_name?.[0]) {
        listItemData.value.checkpoint = objectInfo.value["D2 Checkpoint Loader"].input.required.ckpt_name[0];
        // console.log(`Fetched checkpoint:`, listItemData.value.checkpoint);

        // localStorageに前回の記録がなければ１つめを選択状態にする
        if(!settings.value.checkpoint){
          settings.value.checkpoint = listItemData.value.checkpoint[0];
          // console.log("checkpoint デフォルト", settings.value.checkpoint);
        }
      }

      // 追加の入力項目でリスト取得が必要なものがあれば取得
      config?.optional.forEach((item) => {
        if(item.input.value){
          let current = objectInfo.value;
          // 最後の要素（配列のインデックス）を除いて順番に階層を辿る
          for (let i = 0; i < item.input.value.length - 1; i++) {
            if (current && current[item.input.value[i]]) {
              current = current[item.input.value[i]];
            } else {
              console.warn(`Path ${item.input.value[i]} not found in objectInfo`);
              current = null;
              break;
            }
          }

          // 最後の要素が数値の場合は配列のインデックスとして使用
          const lastItem = item.input.value[item.input.value.length - 1];
          const values = current && typeof lastItem === 'number' 
            ? current[lastItem] || []
            : current && current[lastItem] || [];
          
          // console.log(`Fetched values for ${item.id}:`, values);
          listItemData.value[item.id] = values;

          // localStorageに前回の記録がなければ１つめを選択状態にする
          if(!settings.value[item.id]){
            settings.value[item.id] = values[0];
          }

        }
      });

    } catch (error) {
      console.error('Failed to load object info:', error);
    }
  }
  
  /**
   * ワークフローからノードを検索
   * @param searchType 
   * @param searchValue 
   * @returns 
   */
  function findNode(searchType: 'class_type' | 'id' | 'title', searchValue: string | number) {
    if (!workflow) return null;
    
    for (const nodeId in workflow) {
      const node = workflow[nodeId];
      
      switch (searchType) {
        case 'class_type':
          if (node.class_type === searchValue) {
            return node;
          }
          break;
        case 'id':
          if (nodeId === searchValue.toString()) {
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
  }

  /**
   * config から id に合致するアイテムを取得
   * @param category 
   * @param id 
   * @returns 
   */
  function findItemFromConfig(category:"required"|"optional", id:string): TWorkflowConfigOptionalItem | TWorkflowConfigRequiredItem | null{
    if (!config || !config[category]) return null;

    const item = config[category].find(item => item.id === id);
    if (!item) return null;

    return item;
  }

  /**
   * ワークフローに値をセットする
   * @param category 
   * @param id 
   * @param value 
   * @returns 
   */
  function setNodeValueByConfig(category:"required"|"optional", id:string, value:any) {
    const item = findItemFromConfig(category, id);
    if(!item) return null;

    const node = findNode(item.workflow.search_type, item.workflow.search_value);
    if(!node) return null;

    node.inputs[item.workflow.input_name] = value;
  }


  /**
   * 画像生成
   * @param params 
   * @returns 
   */
  async function generateImages(settings: TGenerateSetting) {
    if (!workflow || isGenerating.value) return;
    isGenerating.value = true;
    
    try {
      // 必須項目の設定
      setNodeValueByConfig('required', 'positive', settings.positive);
      setNodeValueByConfig('required', 'negative', settings.negative);
      setNodeValueByConfig('required', 'checkpoint', settings.checkpoint);

      // Optional項目の設定
      if (config?.optional) {
        for (const item of config.optional) {
          if (item.id in settings) {
            setNodeValueByConfig('optional', item.id, settings[item.id]);
          }
        }
      }
      
      // バッチ処理
      promptIds.value = [];
      for (let i = 0; i < settings.batchCount; i++) {
        // サンプラーノードを検索してシード値を設定
        const randomSeed = Math.floor(Math.random() * 1000000000);
        setNodeValueByConfig('required', 'seed', randomSeed);
        // console.log("seed", randomSeed);

        // リクエストURLとボディをログに出力
        const requestUrl = `${endpoint}/prompt`;
        const requestBody = { prompt: workflow };
        // console.log('Request URL:', requestUrl);
        // console.log('Request Body:', requestBody);
        
        // プロンプトを送信
        let data;
        try {
          const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });
          
          // console.log('Response status:', response.status);
          // console.log('Response headers:', Object.fromEntries(response.headers.entries()));
          
          data = await response.json();
          // console.log('Response data:', data);
        } catch (error) {
          console.error('Fetch error details:', error);
          throw error;
        }
        
        if (data && data.prompt_id) {
          promptIds.value.push(data.prompt_id);
          queueCount.value++;
        }
      }
      
      // 画像生成の監視
      monitorImageGeneration();
    } catch (error) {
      console.error('Error generating images:', error);
    } finally {
      isGenerating.value = false;
    }
  }

  /**
   * 画像生成の監視
   */
  async function monitorImageGeneration() {
    // console.log('Starting image generation monitoring...');
    
    while (promptIds.value.length > 0) {
      const promptId = promptIds.value[0];
      // console.log(`Monitoring prompt ID: ${promptId}`);
      
      try {
        // 生成状況を取得
        const historyUrl = `${endpoint}/history/${promptId}`;
        // console.log(`Fetching history from: ${historyUrl}`);
        
        const response = await fetch(historyUrl);
        // console.log(`History response status: ${response.status}`);
        
        const data = await response.json();
        // console.log(`History data:`, data);
        
        if (data[promptId] && data[promptId].outputs) {
          // console.log(`Found outputs for prompt ID: ${promptId}`);
          
          // 画像を取得
          // for (const nodeId in data[promptId].outputs) {
          const nodeId = config?.output_node_id as number;
          const output = data[promptId].outputs[nodeId];
          if (output.images) {
            // console.log(`Found ${output.images.length} images in node ${nodeId}`);
            
            for (const image of output.images) {
              const preview = image.type === "temp" ? '&type=temp' : '';
              const imageUrl = `${endpoint}/view?filename=${image.filename}${preview}`;
              // console.log(`Adding image URL: ${imageUrl}`);
              previewImages.value.unshift(imageUrl);
            }
          }
          // }
          
          // 完了したプロンプトIDを削除
          promptIds.value.shift();
          queueCount.value--;
          // console.log(`Removed prompt ID from queue. Remaining: ${promptIds.value.length}`);
        } else {
          // console.log(`No outputs found yet for prompt ID: ${promptId}, continuing to poll...`);
        }
      } catch (error) {
        console.error('Error monitoring image generation:', error);
        // エラーが発生した場合も次のプロンプトに進む
        promptIds.value.shift();
        queueCount.value--;
        console.log(`Error occurred, removed prompt ID from queue. Remaining: ${promptIds.value.length}`);
      }
      
      // 1秒待機
      console.log('Waiting 1 second before next poll...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // console.log('Image generation monitoring completed.');
  }
  
  // プレビューをクリア
  function clearPreview() {
    previewImages.value = [];
  }
  
  // 生成をキャンセル
  async function cancelGeneration() {
    try {
      // console.log('Cancelling generation...');
      
      // キューの状態を取得
      const queueResponse = await fetch(`${endpoint}/queue`);
      const queueData = await queueResponse.json();
      // console.log('Current queue state:', queueData);
      
      // キューIDを抽出（保留中のキューのみ）
      const queueIds = [];
      
      // 実行中のキューは削除対象にしない
      let runningId = null;
      if (queueData && queueData.queue_running) {
        // console.log('Currently running queue item (not cancelling):', queueData.queue_running);
        // 実行中のIDを記録
        if (Array.isArray(queueData.queue_running) && queueData.queue_running.length >= 1) {
          runningId = queueData.queue_running[0][1]; // UUID
        }
      }
      
      // 保留中のキューを追加
      if (queueData && queueData.queue_pending && Array.isArray(queueData.queue_pending)) {
        // queue_pendingの各要素を処理
        for (const item of queueData.queue_pending) {
          if (Array.isArray(item) && item.length >= 2) {
            // 配列の2番目の要素（UUID）を追加
            queueIds.push(item[1]);
          } else {
            // 配列でない場合はそのまま追加
            queueIds.push(item);
          }
        }
      }
      
      // console.log('Queue IDs to delete:', queueIds);
      
      if (queueIds.length > 0) {
        // キューを削除
        const deleteResponse = await fetch(`${endpoint}/queue`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ delete: queueIds })
        });
        
        // console.log('Delete response status:', deleteResponse.status);
        
        if (deleteResponse.ok) {
          // キャンセル成功時の処理
          if (runningId) {
            // 実行中のプロンプトIDのみを残す
            promptIds.value = [runningId];
            queueCount.value = 1; // 実行中の1個だけカウント
            // console.log('Pending generations cancelled. Remaining prompt ID:', runningId);
          } else {
            // 実行中のプロンプトIDが取得できなかった場合は全てクリア
            promptIds.value = [];
            queueCount.value = 0;
            isGenerating.value = false;
            // console.log('All generations cancelled');
          }
        } else {
          console.error('Failed to cancel generation:', await deleteResponse.text());
        }
      } else {
        console.log('No queue items to cancel');
      }
      
      // 念のため、古い方法も試す
      // const clearResponse = await fetch(`${endpoint}/queue`, {
      await fetch(`${endpoint}/queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clear: "" })
      });
      
      // console.log('Clear response status:', clearResponse.status);
    } catch (error) {
      console.error('Error cancelling generation:', error);
    }
  }
  
  const api = {
    isGenerating,
    queueCount,
    previewImages,
    listItemData,
    currentWorkflowName,
    workflowNameList,
    getConfig,
    setWorkflow,
    findItemFromConfig,
    generateImages,
    clearPreview,
    cancelGeneration,
    loadWorkflowConfig,
    fetchWorkflows,
    initialized: Promise.resolve()
  };

  return api;
}

// シングルトンパターンを実装したuseComfyApi関数
export function useComfyApi(options?: ComfyApiOptions) {
  if (!instance && options) {
    console.log("init useComfyApi");
    const api = createComfyApi(options);
    // LocalStorageを取得
    const { settings } = useLocalStorage();
    
    // apiからワークフロー一覧を取得する
    api.initialized = (async () => {
      await api.fetchWorkflows();
      const workflows = api.workflowNameList.value;
      const firstWorkflow = workflows && workflows.length > 0 ? workflows[0] : null;
      if (firstWorkflow) {
        await api.setWorkflow(settings.value.workflowName ? settings.value.workflowName as string : firstWorkflow);
      }
    })();
    
    instance = api;
  }
  
  if (!instance) {
    throw new Error('ComfyApi has not been initialized. Please provide options on first call.');
  }
  
  return instance;
}
