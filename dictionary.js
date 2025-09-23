import { parseCSV, escapeHTML, escapeRegExp } from './helper.js';

// 在 CDN + 全局构建下，直接从全局 Vue 取 API
// 也可以改成从参数里解构（见文末可选写法）
const { ref, computed } = Vue;

export function useDictionary() {
  // state
  const dictRows   = ref([]);   // [[道本语, 翻译, 释义], ...]
  const searchText = ref('');
  const dictLoaded = ref(false);
  const dictError  = ref(null);

  // computed
  const sortedRows = computed(() => {
    return [...dictRows.value].sort((a, b) =>
      String(a?.[0] ?? '').localeCompare(String(b?.[0] ?? ''), 'zh')
    );
  });

  const filteredRows = computed(() => {
    const q = searchText.value.trim().toLowerCase();
    if (!q) return sortedRows.value;
    return sortedRows.value.filter(row =>
      row.some(cell => String(cell ?? '').toLowerCase().includes(q))
    );
  });

  // methods
  async function loadDefaultDictionary() {
    try {
      dictError.value = null;
      const res = await fetch('./dictionary.csv', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const rows = parseCSV(text);

      // 跳过表头
      const dataRows = rows.slice(1).map(cols => [
        cols[0] ?? '',
        cols[1] ?? '',
        cols[2] ?? '',
      ]);

      dictRows.value = dataRows;
      dictLoaded.value = true;
      console.log('默认字典加载完成');
    } catch (e) {
      console.error('加载字典失败：', e);
      dictError.value = e?.message || String(e);
      dictLoaded.value = false;
    }
  }

  function highlight(cell) {
    const text = String(cell ?? '');
    const q = searchText.value.trim();
    if (!q) return escapeHTML(text);

    const pattern = new RegExp(escapeRegExp(q), 'gi');
    let result = '';
    let lastIndex = 0;
    text.replace(pattern, (match, offset) => {
      result += escapeHTML(text.slice(lastIndex, offset));
      result += `<strong class="font-semibold">${escapeHTML(match)}</strong>`;
      lastIndex = offset + match.length;
      return match;
    });
    result += escapeHTML(text.slice(lastIndex));
    return result;
  }

  return {
    // state
    dictRows, searchText, dictLoaded, dictError,
    // computed
    sortedRows, filteredRows,
    // methods
    loadDefaultDictionary, highlight,
  };
}
