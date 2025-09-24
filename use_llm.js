
const { ref } = Vue;

const jsonParseState = Object.freeze({
  level1: "level1",
  level2: "level2",
  level3: "level3"
})

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
6) 设定一个【介词白名单】，若句子中的介词有在白名单中的含义，则其短语放入 "介词短语列"；否则请将此介词短语按原句形式放入 "情景列"。
7) 相同介词短语可以被多个谓语共享时，允许在不同谓语项的 "介词短语列" 中重复同一介词短语。
8) 设定一个【助动词白名单】，若句中的副词、助动词等成分有白名单中的含义，则其作为助动词并入 "谓语" 项；否则请将这个成分按原句形式放入 "情景列"。
9) 时态信息可通过在谓语中添加助动词来表示。

介词白名单：
* 使用，利用
* 在，于，真实的，存在
* 同样，相似，像，兄弟姐妹
* 来自，因为，原因
* 向，为了，移动，从……角度看

助动词白名单：
* 来，未来，事件
* 可以，能力，可能性（此条不包含“仅/只有”的含义）
* 开始，打开
* 结束，完成，关闭
* 知识，了解（如何）
* 想要，需要，渴望
* 眼睛，看，寻找
* 保持，停留，持久，保护，继续

示例（仅供格式参考）：
原句“我的车坏掉了。”：
{
  "情景列": [],
  "主语": "我的车",
  "谓语列": [
    { "谓语": "坏掉了", "宾语列": [], "介词短语列": [] }
  ]
}
原句“小孩在房间里玩耍。”：
{
  "情景列": [],
  "主语": "小孩",
  "谓语列": [
    { "谓语": "玩耍", "宾语列": [], "介词短语列": ["在房间里"] }
  ]
}
原句“如果停电了，那么这群小伙子就只有在漆黑的宿舍里继续喝酒唱歌了。”：
{
  "情景列": ["如果停电了","只有"],
  "主语": "这群小伙子",
  "谓语列": [
    { "谓语": "继续喝", "宾语列": ["酒"], "介词短语列": ["在漆黑的宿舍里"] },
    { "谓语": "继续唱", "宾语列": ["歌"], "介词短语列": ["在漆黑的宿舍里"] }
  ]
}
原句“如果你品行恶劣，那么你可能面对这个处罚：被踢出这个群组。”：
{
  "情景列": ["如果你品行恶劣"],
  "主语": "你",
  "谓语列": [
    { "谓语": "可能面对", "宾语列": ["这个处罚：被踢出这个群组"], "介词短语列": [] }
  ]
}
`

const promtForLevel2Tree = `
你是一个只输出 JSON 的解析器。现在对一些字符串条目进行分类或者分解。输入是一个待分解条目的数组；每个条目包含：
- id: string —— 唯一标识
- type: "情景" | "谓语" | "宾语" | "介词短语"
- text: string —— 原句中的片段

请按以下规则把每个条目转为“分析结构”：
1) 情景 → { "类型": "名词短语"|"句子", "值": "<...>" }
2) 谓语 → { "类型": "名词短语"|"动词短语", "值": "<...>" }
3) 宾语 → { "类型": "名词短语"|"句子", "值": "<...>" }
4) 介词短语 → { "介词":"<介词>", "名词短语":"<名词短语>" }

输出严格为：
{ "results": [ { "id":"...", "type":"...", "parsed": <分析结构> }, ... ] }

必须遵守：
- 仅输出 JSON（不得包含额外文本）。
- 所有输入 id 原样返回
- 无法判断时，将条目分类为"名词短语"然后给出分析结构（允许把原文放入 "值"）。
- 不要改变输入语义范围。
`

export function useLLM() {
  // state
  const apiUrl = ref("https://api.deepseek.com/chat/completions");
  const apiKey = ref('');
  const apiError = ref(null);
  const inputSentence = ref('');
  const jsonLevel1TreeLoading = ref(false);
  const jsonTree = ref('');
  const jsonButtonState = ref(jsonParseState.level1)
  const jsonLevel2TreeLoading = ref(false);
  const jsonLevel3TreeLoading = ref(false);
  const jsonLevel2TreeLeaves = ref([])

  // methods
  async function parseToLevel1Tree() {
    jsonLevel1TreeLoading.value = true;
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
      jsonTree.value = data.choices?.[0]?.message?.content || "（无一级解析结果）";
    } catch (e) {
      console.error(e);
      apiError.value = e?.message || String(e);
    } finally {
      jsonLevel1TreeLoading.value = false;
      console.log('一级结构树解析结束')
    }
  }
  async function parseToLevel2Tree() {
    const stcPartType = Object.freeze({
      context: "情景",
      predicate: "谓语",
      object: "宾语",
      prepo_phrase: "介词短语",

      context_list: "情景列",
      predicate_list: "谓语列",
      object_list: "宾语列",
      prepo_phrase_list: "介词短语列",
    })
    const items = [];
    let jsonTreeObj = JSON.parse(jsonTree.value || "{}");

    jsonLevel2TreeLoading.value = true;
    console.log("二级结构树解析开始")
    // 情景列与情景
    jsonTreeObj[stcPartType.context_list].forEach((ctx, i) => {
      items.push({ id: `ctx#${i}`, type: stcPartType.context, text: ctx})
    })
    // 谓语列
    jsonTreeObj[stcPartType.predicate_list].forEach((vp, i) => {
      // 谓语
      if (vp[stcPartType.predicate]) {items.push({ id: `pred#${i}`, type: stcPartType.predicate, text: vp[stcPartType.predicate]})}
      // 宾语列与宾语
      if (vp[stcPartType.object_list]) {
        vp[stcPartType.object_list].forEach((obj, j) => {
          items.push({ id: `obj#${i}#${j}`, type: stcPartType.object, text: obj})
        })
      }
      // 介词短语列与介词短语
      if (vp[stcPartType.prepo_phrase_list]) {
        vp[stcPartType.prepo_phrase_list].forEach((pp, j) => {
          items.push({ id: `pp#${i}#${j}`, type: stcPartType.prepo_phrase, text: pp})
        })
      }
    })
    console.log("items:",items)

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
            { role: "system", content: promtForLevel2Tree },
            { role: "user", content: "现在请解析这个数组："+JSON.stringify(items, null, 2) }
          ],
          response_format: { type: "json_object" },
        })
      });
      const data = await response.json()
      console.log(data)
      // TODO: 原路安插返回的结果
      jsonTree.value += data.choices?.[0]?.message?.content || "（无二级解析结果）";
    } catch (e) {
      console.error(e);
      apiError.value = e?.message || String(e);
    } finally {
      jsonLevel2TreeLoading.value = false;
    }
  }

  return {
    // state
    apiUrl, apiKey, apiError, inputSentence, jsonLevel1TreeLoading, jsonTree,
    jsonButtonState, jsonLevel2TreeLoading, jsonLevel3TreeLoading, jsonLevel2TreeLeaves,
    // methods
    parseToLevel1Tree, parseToLevel2Tree,
  };
}
