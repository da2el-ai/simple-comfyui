import yaml from 'js-yaml';
import { useComfyStore } from '../stores/comfy';
// import type { TWorkflowConfig, TWorkflowConfigOptionalItem, TWorkflowConfigRequiredItem, TListItemData, TGenerateSetting } from '../types'; 
import type { TGenerateSetting } from '../types'; 

export interface ComfyApiOptions {
  endpoint: string;
}

// ComfyAPIの戻り値の型定義
export type TComfyApi = {
  setWorkflow: (workflowName: string) => Promise<any>;
  generateImages: (settings: TGenerateSetting) => Promise<void>;
  cancelGeneration: () => Promise<void>;
  fetchWorkflows: () => Promise<void>;
  initialized: Promise<void>;
};

// シングルトンインスタンス
let instance: TComfyApi | null = null;

// ComfyAPIを作成する関数
function createComfyApi(options: ComfyApiOptions): TComfyApi {
  const store = useComfyStore();
  
  // 状態を確実に初期化
  store.endpoint = options.endpoint;
  let promptIds: string[] = [];

  /**
   * 利用可能なワークフローの一覧を取得
   */
  async function fetchWorkflows() {
    try {
      const response = await fetch('/api/workflows');
      if (response.ok) {
        const workflows = await response.json();
        store.workflowNameList = workflows || [];
        // console.log("fetchWorkflows", workflowNameList.value);
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      store.workflowNameList = [];
    }
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
      store.workflow = await response.json();

      // ワークフロー設定を読み込む
      store.workflowConfig = await loadWorkflowConfig(workflowName);
      store.currentWorkflowName = workflowName;

      // オブジェクト情報を取得
      await fetchObjectInfo();
      
      return store.workflow;
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
    try {
      const response = await fetch(`/api/object_info`);
      store.objectInfo = await response.json();
      // console.log('Object info loaded:', objectInfo.value);

      // 追加項目データをクリア
      store.listItemData = {
        checkpoint: []
      };
      
      // Checkpointリストを取得
      if (store.objectInfo && store.objectInfo["D2 Checkpoint Loader"]?.input?.required?.ckpt_name?.[0]) {
        const ckptList = store.objectInfo["D2 Checkpoint Loader"].input.required.ckpt_name[0];
        store.listItemData.checkpoint = ckptList.sort((a:string, b:string) => a.localeCompare(b));

        // 前回の記録がなければ１つめを選択状態にする
        if(!store.settings.checkpoint){
          store.updateSettings({ checkpoint: store.listItemData.checkpoint[0] });
          // console.log("checkpoint デフォルト", settings.value.checkpoint);
        }
      }

      // 追加の入力項目でリスト取得が必要なものがあれば取得
      store.workflowConfig?.optional.forEach((item) => {
        if(item.input.value){
          let current = store.objectInfo;
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
          store.listItemData[item.id] = values;

          // 前回の記録がなければ１つめを選択状態にする
          if(!store.settings[item.id]){
            store.updateSettings({ [item.id]: values[0] });
          }
        }
      });

    } catch (error) {
      console.error('Failed to load object info:', error);
    }
  }
  

  /**
   * 画像生成
   * @param params 
   * @returns 
   */
  async function generateImages(settings: TGenerateSetting) {
    if (!store.workflow || store.isGenerating) {
      // console.log('generateImages early return - workflow:', !!store.workflow, 'isGenerating:', store.isGenerating);
      return;
    }
    
    store.setGenerating(true);
    
    try {
      // 必須項目の設定
      store.setNodeValueByConfig('required', 'positive', settings.positive);
      store.setNodeValueByConfig('required', 'negative', settings.negative);
      store.setNodeValueByConfig('required', 'checkpoint', settings.checkpoint);

      // Optional項目の設定
      if (store.workflowConfig?.optional) {
        for (const item of store.workflowConfig.optional) {
          if (item.id in settings) {
            store.setNodeValueByConfig('optional', item.id, settings[item.id]);
          }
        }
      }
      
      // バッチ処理
      promptIds = [];
      for (let i = 0; i < settings.batchCount; i++) {
        // サンプラーノードを検索してシード値を設定
        const randomSeed = Math.floor(Math.random() * 1000000000);
        store.setNodeValueByConfig('required', 'seed', randomSeed);

        // リクエストURLとボディをログに出力
        const requestUrl = `${store.endpoint}/prompt`;
        const requestBody = { prompt: store.workflow };
        // console.log("[generateImages] requestUrl", requestUrl);
        
        let data;
        try {
          const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });
          
          data = await response.json();
          if (data && data.prompt_id) {
            promptIds.push(data.prompt_id);
            store.setQueueCount(store.queueCount + 1);
          }
        } catch (error) {
          console.error('Error in fetch request:', error);
          throw new Error('画像生成のリクエストに失敗しました。');
        }
      }
      
      // 画像生成の監視を待つ
      await monitorImageGeneration();
    } catch (error) {
      console.error('Error in generateImages:', error);
      throw error;
    } finally {
      store.setGenerating(false);
    }
  }

  /**
   * 画像生成の監視
   * @returns Promise<void>
   */
  async function monitorImageGeneration(): Promise<void> {
    // console.log('Starting image generation monitoring...');
    
    while (promptIds.length > 0) {
      const promptId = promptIds[0];
      // console.log(`Monitoring prompt ID: ${promptId}`);
      
      try {
        // 生成状況を取得
        const historyUrl = `${store.endpoint}/history/${promptId}`;
        // console.log(`Fetching history from: ${historyUrl}`);
        
        const response = await fetch(historyUrl);
        // console.log(`History response status: ${response.status}`);
        
        const data = await response.json();
        // console.log(`History data:`, data);
        
        if (data[promptId] && data[promptId].outputs) {
          // console.log(`Found outputs for prompt ID: ${promptId}`);
          
          // 画像を取得
          // for (const nodeId in data[promptId].outputs) {
          const nodeId = store.workflowConfig?.output_node_id as number;
          const output = data[promptId].outputs[nodeId];
          if (output.images) {
            // console.log(`Found ${output.images.length} images in node ${nodeId}`);
            
            for (const image of output.images) {
              const preview = image.type === "temp" ? '&type=temp' : '';
              const imageUrl = `/api/get_image?filename=${image.filename}${preview}`;
              store.previewImages.unshift(imageUrl);
            }
          }
          // }
          
          // 完了したプロンプトIDを削除
          promptIds.shift();
          store.setQueueCount(store.queueCount - 1);
          // console.log(`Removed prompt ID from queue. Remaining: ${promptIds.value.length}`);
        } else {
          // console.log(`No outputs found yet for prompt ID: ${promptId}, continuing to poll...`);
        }
      } catch (error) {
        console.error('Error monitoring image generation:', error);
        // エラーが発生した場合も次のプロンプトに進む
        promptIds.shift();
        store.setQueueCount(store.queueCount - 1);
        console.log(`Error occurred, removed prompt ID from queue. Remaining: ${promptIds.length}`);
      }
      
      // 1秒待機
      console.log('Waiting 1 second before next poll...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // console.log('Image generation monitoring completed.');
  }
  
  // 生成をキャンセル
  async function cancelGeneration() {
    try {
      // console.log('Cancelling generation...');
      
      // キューの状態を取得
      const queueResponse = await fetch(`${store.endpoint}/queue`);
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
        const deleteResponse = await fetch(`${store.endpoint}/queue`, {
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
            promptIds = [runningId];
            store.setQueueCount(1); // 実行中の1個だけカウント
            // console.log('Pending generations cancelled. Remaining prompt ID:', runningId);
          } else {
            // 実行中のプロンプトIDが取得できなかった場合は全てクリア
            promptIds = [];
            store.setQueueCount(0);
            store.setGenerating(false);
            // console.log('All generations cancelled');
          }
        } else {
          console.error('Failed to cancel generation:', await deleteResponse.text());
        }
      } else {
        console.log('No queue items to cancel');
      }
      
      // 念のため、古い方法も試す
      // const clearResponse = await fetch(`${store.endpoint}/queue`, {
      await fetch(`${store.endpoint}/queue`, {
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
    setWorkflow,
    generateImages,
    cancelGeneration,
    fetchWorkflows,
    initialized: Promise.resolve()
  };

  return api;
}

// シングルトンパターンを実装したuseComfyApi関数
export function useComfyApi(options?: ComfyApiOptions) {
  if (!instance && options) {
    const api = createComfyApi(options);
    const store = useComfyStore();
    
    // apiからワークフロー一覧を取得する
    api.initialized = (async () => {
      await api.fetchWorkflows();
      const workflows = store.workflowNameList;
      const firstWorkflow = workflows && workflows.length > 0 ? workflows[0] : "";
      if (firstWorkflow) {
        await api.setWorkflow(store.settings.workflowName ? store.settings.workflowName as string : firstWorkflow);
      }
    })();
    
    instance = api;
  }
  
  if (!instance) {
    throw new Error('ComfyApi has not been initialized. Please provide options on first call.');
  }
  
  return instance;
}
