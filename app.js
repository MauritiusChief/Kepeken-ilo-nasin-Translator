import { useDictionary } from "./use_dictionary.js";
import { useLLM } from "./use_llm.js"

const { createApp, onMounted } = Vue;

createApp({
  // 用 Composition API
  setup() {
    // 复用字典逻辑
    const {
      dictRows, searchText, dictLoaded, dictError,
      sortedRows, filteredRows,
      loadDefaultDictionary, highlight
    } = useDictionary();

    const {
      apiUrl, apiKey, apiError, inputSentence, jsonLevel1TreeLoading, jsonTree,
      jsonButtonState, jsonLevel2TreeLoading, jsonLevel3TreeLoading, jsonLevel2TreeLeaves,
      inputLoadingDuration, jsonLoadingDuration,
      parseToLevel1Tree, parseToLevel2Tree, handleJsonClick,
    } = useLLM();

    onMounted(() => {
      console.log('App mounted (setup)');
      loadDefaultDictionary();
    });

    // 暴露给模板
    return {
      // 字典相关
      dictRows, searchText, dictLoaded, dictError, sortedRows, filteredRows, loadDefaultDictionary, highlight,
      // LLM相关
      apiUrl, apiKey, apiError, inputSentence, jsonLevel1TreeLoading, jsonTree,
      jsonButtonState, jsonLevel2TreeLoading, jsonLevel3TreeLoading, jsonLevel2TreeLeaves,
      inputLoadingDuration, jsonLoadingDuration,
      parseToLevel1Tree, parseToLevel2Tree, handleJsonClick,
    };
  }
}).mount('#app');
