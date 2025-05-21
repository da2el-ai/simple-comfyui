import { ref, onMounted } from 'vue';

// シングルトンとして使用するための状態
const tags = ref<string[]>([]);
const isLoaded = ref(false);
const isLoading = ref(false);
const error = ref<Error | null>(null);

/**
 * オートコンプリート用のタグリストを管理するコンポーザブル関数
 * シングルトンパターンを使用して、一度だけタグを読み込む
 * @returns タグリストと関連する関数
 */
export function useAutoCompleteTags() {

  /**
   * タグを読み込む
   */
  async function loadTags() {
    // すでに読み込み済みの場合は何もしない
    if (isLoaded.value) return;
    
    // 読み込み中の場合は何もしない
    if (isLoading.value) return;
    
    isLoading.value = true;
    error.value = null;
    
    try {
      const response = await fetch('/tags/autocomplete.csv');
      const text = await response.text();
      
      // タグと登録数のリストから、タグだけを抽出
      tags.value = text.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => line.split(',')[0]);
      
      isLoaded.value = true;
      // console.log(`Loaded ${tags.value.length} tags`);
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      console.error('Failed to load tags:', err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 検索語に一致するタグをフィルタリング
   * @param searchTerm 検索語
   * @param limit 最大件数
   * @returns フィルタリングされたタグリスト
   */
  function filterTags(searchTerm: string, limit: number = 10): string[] {
    if (searchTerm.length < 2) {
      return [];
    }
    
    // 検索語に一致するタグをフィルタリング（大文字小文字を区別しない）
    const term = searchTerm.toLowerCase();
    return tags.value
      .filter(tag => tag.toLowerCase().includes(term))
      .slice(0, limit); // 最大limit件まで表示
  }

  // コンポーネントがマウントされたときにタグを読み込む
  onMounted(() => {
    loadTags();
  });

  return {
    tags,
    isLoaded,
    isLoading,
    error,
    loadTags,
    filterTags
  };
}
