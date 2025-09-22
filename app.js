// 最简 Vue 挂载（仅占位，不做任何逻辑）
const { createApp } = Vue;

createApp({
  data() {
    return {
      // 未来可放置：字典列表、查询结果、API 配置、结构树 JSON 等
      placeholder: true
    };
  },
  mounted() {
    // 占位：后续在此初始化加载状态、读取本地缓存、对接 LLM API 等
    // console.log('App mounted');
  }
}).mount('#app');
