
const { ref } = Vue;

const jsonParseState = Object.freeze({
  level1: "level1",
  level2: "level2",
  level3: "level3"
})

const promtParseParagraph = `
你是一个只输出 JSON 的解析器。请将给定的中文并列句或者段落分解为若干单句，但不要把主句与从句分开。仅输出 JSON，不得包含额外文本。

输出严格为：
{ "results:: ["<句子1>", "<句子2>", ... ] }
`
async function parseParagraph(url, key, paragraph) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + key
    },
    body: JSON.stringify({
      model: "deepseek-reasoner",
      // model: "deepseek-chat",
      messages: [
        { role: "system", content: promtParseParagraph },
        { role: "user", content: "现在请解析这个文段："+paragraph }
      ],
      response_format: { type: "json_object" },
      max_tokens: 8000,
    })
  });
  const data = await response.json()
  console.log(data)
  return data.choices?.[0]?.message?.content || "{\"空\": \"无段落解析结果\"}";
}
const promtParseSentence = `
你是一个只输出 JSON 的解析器。请将给定中文句子分解为“结构树”，字段包括：
- "语气助词": string —— 只可为 "转折"、"祈使"、"呼唤"、"感叹" 或空字符串。
- "情景列": string[] —— 情景或条件短语的数组（可为空数组）。
- "主语": string —— 句子的主语名词短语。
- "谓语列": { "谓语": string, "宾语列": string[], "介词短语列": string[] }[] —— 形容词/动词及相关成分。

必须遵守：
一、总体要求
1) 仅输出 JSON，不得包含注释、解释或额外文本。
2) 所有键必须使用上述精确的中文命名。
3) 若无法找到对应部分，用空数组 [] 或空字符串 ""，但键必须存在。
4) 主语 必须是完整的短语，不能漏掉修饰其的成分。
二、句子拆分流程
1) 语气助词
- 根据句尾或句中标记，判断是否为“转折”“祈使”“呼唤”“感叹”，否则为空。
2) 情景列
- 包含条件、时间、限制等短语（例如：“如果停电”、“因为天气冷”）。
- 若句中存在的这些短语不在“语义白名单”范围内，但又带有实际语义，则整体放入 "情景列"。
3) 主语
- 确定句子施事者（常为名词短语或代词）。
- 若存在仅修饰主语的修饰词，则该修饰词视为主语的一部分；若修饰的是谓语或整个句子才放入 "情景列"。
- 若为祈使句，主语默认是 "你"。
4) 谓语列
- 将动词及其助动词放入 "谓语"。
- 若有并列动词，分别建立多条谓语项。
- 若存在宾语，从谓语中剥离出来，单独放入 "宾语列"；若存在仅修饰宾语的修饰词，也应视为宾语的一部分。
- 若有短语命中“介词语义白名单”，则可忽略 "谓语"，优先放入 "介词短语列"。
- 若出现宾语从句，则整个从句直接放入 "宾语列"，不再细分。
三、时态处理
- 若句中明确提到时间或时态（如“此刻”“过去”“明天”），可放入 "情景列" 或用助动语义合并进 "谓语"。
- 其他隐含的时态信息可忽略。
四、白名单
- 判断标准以语义为准。只要成分表达以下语义，就归入相应白名单；即使中文中它本身是动词或连词，也按本规则处理。
- 若遇到意思近似的表达，也按归一化规则处理。
1) 介词语义白名单（统一放入 "介词短语列"）
* 工具/手段（kepeken）：使用，利用，用，借助，通过，以…为手段
* 地点/存在（lon）：在，于，处于，位于，存在于
* 相似/比较（sama）：同样，相似，像，如同，类似于
* 来源/原因（tan）：来自，出自，源自，因为，由于，基于
* 方向/目的（tawa）：向，对，给，往，为了，以便，从…角度看
2) 助动语义白名单（出现在动词前时合并进 "谓语"）
* 未来/趋向（kama）：来，未来，将要
* 可能/能力（ken）：可以，能，能够，可能
* 开始/相位起点（kama）：开始，着手，逐步
* 结束/相位终点（pini）：结束，完成，终止
* 知识/掌握（sona）：了解（如何），会（如何），学会，掌握
* 意愿/需求（wile）：想要，需要，渴望，愿意，打算
* 尝试/探索（alasa/lukin）：寻找，试图，尝试，设法
* 保持/持续（awen）：保持，停留，持久，继续
- 若不是语义白名单词，但有实际信息，则放入 "情景列"。
- 若为功能性虚词（如“就”“便”），则舍弃。
`
async function parseSentence(url, key, sentence) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + key
    },
    body: JSON.stringify({
      model: "deepseek-reasoner",
      // model: "deepseek-chat",
      messages: [
        { role: "system", content: promtParseSentence },
        { role: "user", content: "现在请解析这个句子："+sentence }
      ],
      response_format: { type: "json_object" },
      max_tokens: 12000,
    })
  });
  const data = await response.json()
  console.log(data)
  return data.choices?.[0]?.message?.content || "（无句子解析结果）";
}

const promtParseConstituents = `
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
`
async function parseConstituents(url, key, constituents) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + key
    },
    body: JSON.stringify({
      model: "deepseek-reasoner",
      // model: "deepseek-chat",
      messages: [
        { role: "system", content: promtParseConstituents },
        { role: "user", content: "现在请解析这个数组："+JSON.stringify(constituents) }
      ],
      response_format: { type: "json_object" },
      max_tokens: 12000,
    })
  });
  const data = await response.json()
  console.log(data)
  return data.choices?.[0]?.message?.content || "{\"空\": \"无成分解析结果\"}";
}

const promtParsePhrases = `
`
async function parsePhrases(url, key, phrases) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + key
    },
    body: JSON.stringify({
      model: "deepseek-reasoner",
      // model: "deepseek-chat",
      messages: [
        { role: "system", content: promtParsePhrases },
        { role: "user", content: "现在请解析这个数组："+JSON.stringify(phrases, null, 2) }
      ],
      response_format: { type: "json_object" },
      max_tokens: 12000,
    })
  });
  const data = await response.json()
  console.log(data)
  return data.choices?.[0]?.message?.content || "{\"空\": \"无短语解析结果\"}";
}

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
  const jsonLevel2TreeLeaves = ref([]);
  const inputLoadingDuration = ref(0);
  const jsonLoadingDuration = ref(0);
  let inputLoadingInterval = null;
  let jsonLoadingInterval = null;

  // timer methods
  function startLoadingTimer(loadingDuration, loadingInterval) {
    loadingDuration.value = 0;
    loadingInterval = setInterval(() => {
      loadingDuration.value++;
    }, 1000);
  }

  function stopLoadingTimer(loadingInterval) {
    if (loadingInterval) {
      clearInterval(loadingInterval);
      loadingInterval = null;
    }
  }

  // methods
  async function parseToLevel1Tree() {
    startLoadingTimer(inputLoadingDuration, inputLoadingInterval);
    jsonLevel1TreeLoading.value = true;
    console.log('一级结构树解析开始')

    // 先拆分为单句
    let sentenceList = []
    try {
      const content = await parseParagraph(apiUrl.value, apiKey.value, inputSentence.value);
      const parsed = JSON.parse(content);
      if (parsed.results) sentenceList = parsed.results
      console.log("sentenceList",sentenceList)
    } catch (e) {
      console.error(e);
      apiError.value = e?.message || String(e);
    }

    // 并发对每个单句进行解析
    try {
      // 创建每个句子的解析承诺
      const parsePromises = sentenceList.map(sentence =>
        parseSentence(apiUrl.value, apiKey.value, sentence)
      );

      // 等待所有解析完成
      const settlements = await Promise.allSettled(parsePromises);

      // 处理解析结果
      const parsedSentences = settlements.map((settlement, index) => {
        if (settlement.status === 'fulfilled') {
          try {
            // 解析JSON字符串为对象
            const parsed = JSON.parse(settlement.value);
            return parsed;
          } catch (parseError) {
            // 如果JSON解析失败，返回错误对象
            return { error: parseError.message, raw: settlement.value, sentence: sentenceList[index] };
          }
        } else {
          // 承诺被拒绝
          return { error: settlement.reason.message, sentence: sentenceList[index] };
        }
      });

      // 设置jsonTree为解析后的句子数组
      jsonTree.value = JSON.stringify(parsedSentences, null, 2);

      // 检查是否有解析错误
      const hasErrors = settlements.some(s => s.status === 'rejected');
      if (hasErrors) {
        apiError.value = '部分句子解析失败，请查看结果详情。';
      }
    } catch (e) {
      console.error(e);
      apiError.value = e?.message || String(e);
    } finally {
      jsonLevel1TreeLoading.value = false;
      stopLoadingTimer(inputLoadingInterval);
      console.log('一级结构树解析结束');
    }
  }
  async function parseToLevel2Tree() {
    startLoadingTimer(jsonLoadingDuration, jsonLoadingInterval);
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
      const content = await parseConstituents(apiUrl.value, apiKey.value, items)
      const parsed = JSON.parse(content);
      // const map = new Map();
      // for (const r of (parsed.results || [])) {
      //   if (r && r.id) map.set(r.id, r);
      // }

      // 暂时存储起来，后续再一并原路插回
      if (parsed.results) jsonTreeObj["成分解析结果"] = parsed.results
      jsonTree.value = JSON.stringify(jsonTreeObj, null, 2)
      jsonButtonState.value = jsonParseState.level2;
    } catch (e) {
      console.error(e);
      apiError.value = e?.message || String(e);
    } finally {
      jsonLevel2TreeLoading.value = false;
      stopLoadingTimer(jsonLoadingInterval);
      console.log("二级结构树解析结束")
    }
  }
  async function parseToLevel3Tree() {
    const stcPartType = Object.freeze({
      sentence: "句子",
      noun_phrase: "名词短语",
      verv_phrase: "动词短语",
      subject: "主语",
    })
    const items = [];
    let jsonTreeObj = JSON.parse(jsonTree.value || "{}");

    jsonLevel3TreeLoading.value = true;
    console.log("三级结构树解析开始")
  }

  return {
    // state
    apiUrl, apiKey, apiError, inputSentence, jsonLevel1TreeLoading, jsonTree,
    jsonButtonState, jsonLevel2TreeLoading, jsonLevel3TreeLoading, jsonLevel2TreeLeaves,
    inputLoadingDuration, jsonLoadingDuration,
    // methods
    parseToLevel1Tree, parseToLevel2Tree,
  };
}
