import { parseCSV, escapeHTML, escapeRegExp } from "./helper.js"

const { createApp } = Vue;

createApp({
  data() {
    return {
      // 字典查询
      dictRows: [], // [[道本语, 翻译, 释义], ...]
      searchText: '',

      // 状态栏
      dictLoaded: false,
      dictError: null,
    };
  },
  computed: {
    sortedRows() {
      // 以第一列“道本语”为准，localeCompare 更友好
      return [...this.dictRows].sort((a, b) =>
        String(a?.[0] ?? '').localeCompare(String(b?.[0] ?? ''), 'zh')
      );
    },
    filteredRows() {
      let q = this.searchText.trim();
      if (!q) return this.sortedRows;
      q = q.toLowerCase();
      return this.sortedRows.filter(row =>
        row.some(cell => String(cell ?? '').toLowerCase().includes(q))
      );
    },
  },
  methods: {
    // 字典查询功能
    async loadDefaultDictionary() {
      try {
        this.dictError = null;
        const res = await fetch('./dictionary.csv', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const rows = parseCSV(text);

        // 期待 CSV 第一行为表头，跳过表头
        const dataRows = rows.slice(1).map(cols => [
          cols[0] ?? '',
          cols[1] ?? '',
          cols[2] ?? '',
        ]);

        this.dictRows = dataRows;
        this.dictLoaded = true;
        console.log('默认字典加载完成')
      } catch (e) {
        console.error('加载字典失败：', e);
        this.dictError = e?.message || String(e);
        this.dictLoaded = false;
      }
    },
    highlight(cell) {
      const text = String(cell ?? '');
      const q = this.searchText.trim();
      if (!q) return escapeHTML(text);

      // 构造安全的正则
      const pattern = new RegExp(escapeRegExp(q), 'gi');
      // const escaped = escapeHTML(text);
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
  },
  mounted() {
    // 占位：后续在此初始化加载状态、读取本地缓存、对接 LLM API 等
    console.log('App mounted');
    this.loadDefaultDictionary();
  }
}).mount('#app');
