
const { ref } = Vue;

const promtForLevel1Tree = `
你是一个只输出 JSON 的解析器。请将给定中文句子分解为“一级结构树”，字段包括：
- "情景列": string[] —— 情景短语的数组（可为空数组）
- "主语": string —— 句子的主语名词短语
- "谓语列": { "谓语": string, "宾语列": string[], "介词短语列": string[] }[]

必须遵守：
1) 仅输出 JSON（不得包含注释、解释或额外文本）。
2) 所有键必须使用以上精确的中文命名。
3) 若无法找到对应部分，用空数组或空字符串，但键必须存在。
4) 返回的 JSON 顶层必须是一个对象 {}。
5) 如果有“动宾短语”则将其拆分，动词进入 "谓语"，宾语进入该项的 "宾语列"。
6) 设定一个【介词白名单】，若句子中有在白名单中的含义的介词，则其短语放入 "介词短语列"；否则请将此介词短语按原句形式放入 "情景列"。
7) 相同介词短语可以被多个谓语共享时，允许在不同谓语项的 "介词短语列" 中重复同一介词短语。
8) 设定一个【助动词白名单】，若句中有在白名单中含义的助动词，则并入 "谓语" 项；否则请将助动词成分按原句形式放入 "情景列"。
9) 如句子中有因用语习惯而隐藏的成分，可自行补全然后再进行分析。

介词白名单：
* 使用，利用
* 在，于，真实的，存在
* 同样，相似，像，兄弟姐妹
* 来自，因为，原因
* 向，为了，移动，从……角度看

助动词白名单：
* 来，未来，事件
* 可以，能力，可能性
* 开始，打开
* 结束，完成，关闭
* 知识，了解（如何）
* 想要，需要，渴望
* 眼睛，看，寻找
* 保持，停留，持久，保护，继续

示例（仅供格式参考，不要照抄内容）：
{
  "情景列": [],
  "主语": "我的车",
  "谓语列": [
    { "谓语": "坏掉了", "宾语列": [], "介词短语列": [] }
  ]
}

{
  "情景列": [],
  "主语": "小孩",
  "谓语列": [
    { "谓语": "玩耍", "宾语列": [], "介词短语列": ["在房间里"] }
  ]
}

{
  "情景列": ["如果停电了","只能"],
  "主语": "这群小伙子",
  "谓语列": [
    { "谓语": "喝", "宾语列": ["酒"], "介词短语列": ["在漆黑的宿舍里"] },
    { "谓语": "唱", "宾语列": ["歌"], "介词短语列": ["在漆黑的宿舍里"] }
  ]
}

{
  "情景列": ["如果你品行恶劣"],
  "主语": "你",
  "谓语列": [
    { "谓语": "可能面对", "宾语列": ["这个处罚：踢出这个群组"], "介词短语列": [] }
  ]
}
`

export function useLLM() {
  // state
  const apiUrl = ref("https://api.deepseek.com/chat/completions");
  const apiKey = ref('');
  const apiError = ref(null);
  const inputSentence = ref('');
  const jsonLoading = ref(false);
  const jsonTree = ref('');

  // methods
  async function parseToLevel1Tree() {
    jsonLoading.value = true;
    console.log('一级结构树解析开始')
    try {
      const response = await fetch(apiUrl.value, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + apiKey.value
        },
        body: JSON.stringify({
          model: "deepseek-reasoner",
          // model: "deepseek-chat",
          messages: [
            { role: "system", content: promtForLevel1Tree },
            { role: "user", content: "现在请解析这个句子："+inputSentence.value }
          ],
          response_format: { type: "json_object" },
        })
      });
      const data = await response.json()
      console.log(data)
      jsonTree.value = data.choices?.[0]?.message?.content || "（无回复）";
    } catch (e) {
      console.error(e);
      apiError.value = e?.message || String(e);
    } finally {
      jsonLoading.value = false;
      console.log('一级结构树解析结束')
    }
  }

  return {
    // state
    apiUrl, apiKey, apiError, inputSentence, jsonLoading, jsonTree,
    // methods
    parseToLevel1Tree,
  };
}
