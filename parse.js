// #region 解析函数,提示词
const promtParseParagraph = `
你是一个只输出 JSON 的中文句子分解器。

规则：
1. 并列句（用连接词连接或者用逗号连接都是允许的并列句形式）要拆分成多个句子。
2. 主句+从句保持整体；但若从句位于主句后的补充说明区且内部存在并列关系，允许将该并列部分拆分为多句。
3. 拆分后每个句子必须可独立成句。如导致主项缺失，补充代词（如“某物”）作为主项。
4. 段落先按句号、问号、感叹号、分号等明确的句子分割标点切分，再应用以上规则。
5. 若输入确实只有一个句子，输出数组可只包含这个句子。
6. 输出严格为：{ "results": ["句子1", "句子2", ...] }；不得输出 JSON 以外内容。
`
export async function parseParagraph(url, key, paragraph) {
  console.log('parseParagraph 触发')
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
        { role: "user", content: "请处理以下文本："+paragraph }
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
- "语气助词": string —— 只可为 "转折"、"祈使"、"呼唤"、"感叹"、"疑问" 或空字符串。
- "情景列": string[] —— 情景或条件短语的数组（可为空数组）。
- "主语": string —— 句子的主语名词短语。
- "谓语列": { "谓语": string, "宾语列": string[], "介词短语列": { "介词": string, "介词宾语": string }[] }[] —— 形容词/动词/介词及相关成分。

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
- 若句中存在的这些短语不在“语义白名单”范围内，但又带有实际语义，则放入 "情景列"；若某个情景或短语太长导致含义不清晰，拆分后再放入 "情景列"。
3) 主语
- 确定句子施事者（常为名词短语或代词）。
- 若存在仅修饰主语的修饰词，则该修饰词视为主语的一部分；若修饰的是谓语或整个句子才放入 "情景列"。
4) 谓语列
- 将动词及其助动词放入 "谓语"。
- 若有并列动词，分别建立多条谓语项。
- 若存在宾语，从谓语中剥离出来，单独放入 "宾语列"；若存在仅修饰宾语的修饰词，也应视为宾语的一部分。
- 若出现宾语从句，则整个从句直接放入 "宾语列"，不再细分。
5) 介词短语
- 若有短语命中“介词语义白名单”，则可忽略 "谓语"，优先放入 "介词短语列"。
- "介词" 处只需填写在“介词语义白名单”中命中的语义，"介词宾语" 填写该语义作用的宾语；仅修饰该宾语的修饰词视为其一部分。
三、时态处理
- 若句中明确提到时间或时态（如“此刻”“过去”“明天”），可放入 "情景列" 或用助动语义合并进 "谓语"。
- 其他隐含的时态信息可忽略。
四、语义白名单
- 判断标准以语义为准。只要成分表达以下语义，就归入相应白名单；即使中文中它本身是动词或连词，也按本规则处理。
- 若遇到意思近似的表达，也按归一化规则处理。
1) 介词语义白名单（结构化后放入 "介词短语列"）
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
export async function parseSentence(url, key, sentence) {
  console.log('parseSentence 触发')
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
你是一个只输出 JSON 的解析器。现在对一些字符串条目进行分类。输入是一个待分解条目的数组；每个条目包含：
- id: string —— 唯一标识
- type: "情景" | "谓语" | "宾语" | "介词宾语"
- text: string —— 原句中的片段

请按以下规则把每个条目转为“分析结构”：
1) 情景 → { "类型": "名词短语"|"句子", "值": "<...>" }
2) 谓语 → { "类型": "名词短语"|"动词短语", "值": "<...>" }
3) 宾语 → { "类型": "名词短语"|"句子", "值": "<...>" }
4) 介词宾语 → { "类型": "名词短语"|"句子", "值": "<...>" }

输出严格为：
{ "results": [ { "id":"...", "type":"...", "parsed": <分析结构> }, ... ] }

必须遵守：
- 仅输出 JSON（不得包含额外文本）。
- 所有输入 id 原样返回。
- 需要时可以在 "值" 中补充名词（如“此事”/“某个东西”）以让语义更显化。
- 无法判断时，将条目分类为"名词短语"然后给出分析结构（允许把原文放入 "值"）。
`
export async function parseConstituents(url, key, bgsentence, constituents) {
  console.log('parseConstituents 触发')
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
        { role: "user", content: "字符串条目的背景句子："+bgsentence+"\n现在请解析这个数组："+JSON.stringify(constituents) }
      ],
      response_format: { type: "json_object" },
      max_tokens: 12000,
    })
  });
  const data = await response.json()
  console.log(data)
  return data.choices?.[0]?.message?.content || "{\"空\": \"无成分解析结果\"}";
}

const promptParseClause = `
你是一个只输出 JSON 的解析器。输入是一个带id的中文句子：
- "id": string —— 唯一标识。
- "text": string —— 待分解的中文句子。
请将输入的中文句子分解为“结构树”，字段包括：
- "id": string —— 来自输入的唯一标识。
- "情景列": string[] —— 情景或条件短语的数组（可为空数组）。
- "主语": string —— 句子的主语名词短语。
- "谓语列": { "谓语": {"类型": string, "值": string }, "宾语列": string[], "介词短语列": { "介词": string, "介词宾语": string }[] }[] —— 形容词/动词/介词及相关成分。

必须遵守：
一、总体要求
1) 仅输出 JSON，不得包含注释、解释或额外文本。
2) 所有输入 id 原样返回。
3) 所有键必须使用上述精确的中文命名。
4) 若无法找到对应部分，用空数组 [] 或空字符串 ""，但键必须存在。
5) 主语 必须是完整的短语，不能漏掉修饰其的成分。
二、句子拆分流程
1) 情景列
- 包含条件、时间、限制等短语。
- 若句中存在的这些短语不在“语义白名单”范围内，但又带有实际语义，则放入 "情景列"；若某个情景或短语太长导致含义不清晰，拆分后再放入 "情景列"。
2) 主语
- 确定句子施事者（常为名词短语或代词）。
- 若存在仅修饰主语的修饰词，则该修饰词视为主语的一部分；若修饰的是谓语或整个句子才放入 "情景列"。
3) 谓语列
- 将动词及其助动词放入 "谓语"。
- 若有并列动词，分别建立多条谓语项。
- "谓语" 需要结构化：首先根据其文本判断为 "名词短语" 或 "动词短语"，然后将判断结果填写至 "类型"，将文本填写至 "值"；若无法判断，默认为 "名词短语"。
- 若存在宾语，从谓语中剥离出来后放入 "宾语列"；若存在仅修饰宾语的修饰词，也应视为宾语的一部分。
4) 介词短语
- 若有短语命中“介词语义白名单”，则可忽略 "谓语"，优先放入 "介词短语列"。
- "介词" 处只需填写在“介词语义白名单”中命中的语义，"介词宾语" 填写该语义作用的宾语；仅修饰该宾语的修饰词视为其一部分。
三、语义白名单
- 判断标准以语义为准。只要成分表达以下语义，就归入相应白名单；即使中文中它本身是动词或连词，也按本规则处理。
- 若遇到意思近似的表达，也按归一化规则处理。
1) 介词语义白名单（结构化后放入 "介词短语列"）
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
export async function parseClause(url, key, clause) {
  console.log('parseClause 触发')
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
        { role: "system", content: promptParseClause },
        { role: "user", content: "现在请解析这个句子："+JSON.stringify(clause) }
      ],
      response_format: { type: "json_object" },
      max_tokens: 8000,
    })
  });
  const data = await response.json()
  console.log(data)
  return data.choices?.[0]?.message?.content || "{\"空\": \"无从句解析结果\"}";
}

const promtParsePhrases = `
你是一个只输出 JSON 的中文短语 → toki pona 短语翻译解析器，将中文短语翻译和转化“分析结构”。
输入是一条已经标注类型的短语对象数组，每个条目包含：
- "id": string —— 唯一标识
- "type": "情景" | "谓语" | "宾语" | "介词宾语"
- "kind": "名词短语" | "动词短语",
- "text": string —— 原句中的片段

若条目的 "kind" 为 "名词短语"，将 "text" 转为此分析结构：
[
  {
    "头词": "<toki pona 单词A>",
    "修饰词": ["<toki pona 单词B>", "..."],
    "复合修饰词": [
      {
        "头词": "<toki pona 单词C>",
        "修饰词": ["<toki pona 单词D>", "..."]
      },
      {...}...
    ]
  },
  {...}...
]
名词短语解析原则：
1. 先整体翻译，得到一个或多个自然的 toki pona 名词短语（允许由多个 toki pona 单词组成）。
2. 若翻译结果是多个用 en 连接的并列名词短语，则分别建立多条名词项放入数组。
3. 将翻译结果的中心词（根据 toki pona 的修饰词顺序，应当为短语的第一个单词）提取出来，放入 "头词"。
4. 将翻译结果中直接修饰 "头词" 的修饰词放入 "修饰词" 数组。
5. 将翻译结果中的复合修饰词（也就是用次级修饰词修饰的修饰词）提取出来，以类似的前两条原则的形式提取出 "头词" 与 "修饰词" 数组，然后使用 {头词, 修饰词[]} 结构放入 "复合修饰词" 数组。
6. 不用拘泥于整体翻译时的结果，重点是体现中心词、修饰词与次级修饰词之间的修饰关系。

若条目的 "kind" 为 "动词短语"，将 "text" 转为此分析结构：
{
  "前动词": "<toki pona 单词A>" | "",
  "动词": "<toki pona 单词B>",
  "修饰词": ["<toki pona 单词C>", "..."]
}
动词短语解析原则：
1. 先整体翻译，得到自然的 toki pona 动词短语（允许由多个 toki pona 单词组成）。
2. 若存在，将翻译结果中的符合“助动语义列表”的助动词提取出来，填入 "前动词"。
3. 将翻译结果的中心动词提取出来填入 "动词"。
4. 将翻译结果中直接修饰中心动词的修饰词放入 "修饰词" 数组。
5. 不用拘泥于整体翻译时的结果，重点是体现前动词、中心动词与修饰词之间的修饰关系。

助动语义列表
* 未来/趋向（kama）：来，未来，将要
* 可能/能力（ken）：可以，能，能够，可能
* 开始/相位起点（kama）：开始，着手，逐步
* 结束/相位终点（pini）：结束，完成，终止
* 知识/掌握（sona）：了解（如何），会（如何），学会，掌握
* 意愿/需求（wile）：想要，需要，渴望，愿意，打算
* 尝试/探索（alasa/lukin）：寻找，试图，尝试，设法
* 保持/持续（awen）：保持，停留，持久，继续

输出严格为：
{ "results": [ { "id":"...", "parsed": <分析结构> }, ... ] }

严格规范：
- 只输出 JSON，不得包含注释或多余文本。
- 所有输入 id 原样返回。
- 在最终的输出结果中，所有词必须是单个 toki pona 词（禁止复合词、空格、多词短语）；此限制不施加于解析初期的整体翻译阶段。
- 不能空缺键；无内容时，用 "" 或 []。
`
export async function parsePhrases(url, key, bgsentence, phrases) {
  console.log('parsePhrases 触发')
  // let placeholders = phrases.map(p => {
  //   return {id: p.id, type: p.type, kind: p.kind, parsed: {"PLACE HOLDER": p.kind+p.text}}
  // })
  // console.log(placeholders)
  // return JSON.stringify({ results: placeholders })
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
        { role: "user", content: "短语数组的背景句子："+bgsentence+"\n现在请解析这个数组："+JSON.stringify(phrases) }
      ],
      response_format: { type: "json_object" },
      max_tokens: 12000,
    })
  });
  const data = await response.json()
  console.log(data)
  return data.choices?.[0]?.message?.content || "{\"空\": \"无短语解析结果\"}";
}