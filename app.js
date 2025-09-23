// app.js
import { parseCSV, escapeHTML, escapeRegExp } from "./helper.js"; // 你原来就有
import { useDictionary } from "./use_dictionary.js";               // 新增引入

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

    // 你 app 里其他与 LLM/输入/状态栏相关的 state，也可以逐步迁到 ref/computed 中
    const { ref } = Vue;
    const apiUrl        = ref('');
    const apiKey        = ref('');
    const apiError      = ref(null);
    const inputSentence = ref('');
    const jsonLoading   = ref(false);
    const jsonTree      = ref('');

    onMounted(() => {
      console.log('App mounted (setup)');
      loadDefaultDictionary();
    });

    // 暴露给模板
    return {
      // 字典相关
      dictRows, searchText, dictLoaded, dictError,
      sortedRows, filteredRows, loadDefaultDictionary, highlight,
      // 其他原有字段
      apiUrl, apiKey, apiError, inputSentence, jsonLoading, jsonTree,
    };
  }
}).mount('#app');
