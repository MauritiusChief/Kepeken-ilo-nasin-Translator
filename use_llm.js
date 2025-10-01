import { parseParagraph, parseSentence, parseConstituents, parseClause, parsePhrases } from "./parse.js"

const { ref, computed } = Vue;

const jsonParseState = Object.freeze({
  level1: "level1",
  level2: "level2",
  level3: "level3"
})

// #region 主体useLLM()
export function useLLM() {
  // state
  const apiUrl = ref("https://api.deepseek.com/chat/completions");
  const apiKey = ref('');
  const apiError = ref(null);
  const inputSentence = ref('');
  const jsonLevel1TreeLoading = ref(false);
  const jsonTree = ref('');
  const jsonButtonState = ref(jsonParseState.level1)
  // const jsonButtonState = ref(jsonParseState.level2)
  const jsonLevel2TreeLoading = ref(false);
  const jsonLevel3TreeLoading = ref(false);
  const jsonLevel2TreeLeaves = ref([]);
  const inputLoadingDuration = ref(0);
  const jsonLoadingDuration = ref(0);
  let inputLoadingInterval = null;
  let jsonLoadingInterval = null;

  // timer methods
  function startLoadingTimer(loadingDuration) {
    loadingDuration.value = 0;
    const intervalId = setInterval(() => {
      // console.log('当前loadingDuration: ', loadingDuration.value);
      loadingDuration.value++;
    }, 1000);
    return intervalId;
  }

  function stopLoadingTimer(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
    }
    return null;
  }

  // methods
  async function parseToLevel1Tree() {
    inputLoadingInterval = startLoadingTimer(inputLoadingDuration);
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
      inputLoadingInterval = stopLoadingTimer(inputLoadingInterval);
      console.log('一级结构树解析结束');
    }
  }


  async function parseToLevel2Tree() {
    jsonLoadingInterval = startLoadingTimer(jsonLoadingDuration);
    const constituents = [];
    let jsonTreeObj = JSON.parse(jsonTree.value || "[]");

    jsonLevel2TreeLoading.value = true;
    console.log("二级结构树解析开始")

    // 遍历每个句子对象
    jsonTreeObj.forEach((sentenceObj, s) => {
      // 情景列与情景
      sentenceObj["情景列"].forEach((ctx, i) => {
        constituents.push({ id: `s${s}_ctx#${i}`, type: "情景", text: ctx})
      })

      // 谓语列
      if (sentenceObj["谓语列"]) {
        sentenceObj["谓语列"].forEach((vp, i) => {
          // 谓语
          if (vp["谓语"]) {
            constituents.push({ id: `s${s}_pred#${i}`, type: "谓语", text: vp["谓语"]})
          }
          // 宾语列与宾语
          if (vp["宾语列"]) {
            vp["宾语列"].forEach((obj, j) => {
              constituents.push({ id: `s${s}_obj#${i}#${j}`, type: "宾语", text: obj})
            })
          }
          // 介词短语列、介词短语、介词宾语
          if (vp["介词短语列"]) {
            vp["介词短语列"].forEach((pp, j) => {
              constituents.push({ id: `s${s}_pp#${i}#${j}`, type: "介词宾语", text: pp["介词宾语"]})
            })
          }
        })
      }
    })
    console.log("constituents:",constituents)

    try {
      const content = await parseConstituents(apiUrl.value, apiKey.value, inputSentence.value, constituents)
      const parsed = JSON.parse(content);
      const map = new Map();
      for (const r of (parsed.results || [])) {
        if (r && r.id) map.set(r.id, r);
      }

      // 插回原句
      jsonTreeObj.forEach((sentenceObj, s) => {
        // 情景列，插回情景
        let contextList = sentenceObj["情景列"]
        sentenceObj["情景列"] = contextList.map((ctx, i) => {
          let id = `s${s}_ctx#${i}`
          return map.has(id) ? map.get(id).parsed : ctx
        })

        // 谓语列
        if (sentenceObj["谓语列"]) {
          let vpList = sentenceObj["谓语列"] || [];
          sentenceObj["谓语列"] = vpList.map((vp, i) => {
            // 插回谓语
            if (vp["谓语"]) {
              vp["谓语"] = map.get(`s${s}_pred#${i}`).parsed
            }
            // 宾语列，插回宾语
            if (vp["宾语列"]) {
              let objList = vp["宾语列"]
              vp["宾语列"] = objList.map((obj, j) => {
                let id = `s${s}_obj#${i}#${j}`;
                return map.has(id) ? map.get(id).parsed : obj;
              })
            }
            // 介词短语列、介词短语，插回介词宾语
            if (vp["介词短语列"]) {
              vp["介词短语列"].forEach((pp, j) => {
                pp["介词宾语"] = map.get(`s${s}_pp#${i}#${j}`).parsed;
              })
            }
            return vp
          })
        }
      })

      jsonTree.value = JSON.stringify(jsonTreeObj, null, 2)
      jsonButtonState.value = jsonParseState.level2;
    } catch (e) {
      console.error(e);
      apiError.value = e?.message || String(e);
    } finally {
      jsonLevel2TreeLoading.value = false;
      jsonLoadingInterval = stopLoadingTimer(jsonLoadingInterval);
      console.log("二级结构树解析结束")
    }
  }


  async function parseToLevel3Tree() {
    jsonLoadingInterval = startLoadingTimer(jsonLoadingDuration);
    const phrases = [] // 盛装类型为 "名词短语"|"动词短语" 的item
    const clauses = [] // 盛装类型为 "句子" 的item
    let jsonTreeObj = JSON.parse(jsonTree.value || "[]");

    jsonLevel3TreeLoading.value = true;
    console.log("三级结构树解析开始")

    // 遍历每个句子对象，找出需要解析的{ "类型": "名词短语"|"动词短语"|"句子", "值": "<...>" }
    jsonTreeObj.forEach((sentenceObj, s) => {
      // 情景列与情景
      sentenceObj["情景列"].forEach((ctxObj, i) => {
        let item = { id: `s${s}_ctx#${i}`, type: "情景", kind: ctxObj["类型"], text: ctxObj["值"]}
        if (ctxObj["类型"] === "名词短语") {
          phrases.push(item)
        } else if (ctxObj["类型"] === "句子") {
          clauses.push(item)
        }
      })

      // 主语
      phrases.push({ id: `s${s}_subj`, type: "主语", kind: "名词短语", text: sentenceObj["主语"]})

      // 谓语列
      if (sentenceObj["谓语列"]) {
        sentenceObj["谓语列"].forEach((vp, i) => {
          // 谓语
          if (vp["谓语"]) {
            phrases.push({ id: `s${s}_pred#${i}`, type: "谓语", kind: vp["谓语"]["类型"], text: vp["谓语"]["值"]})
          }
          // 宾语列与宾语
          if (vp["宾语列"]) {
            vp["宾语列"].forEach((obj, j) => {
              let item = { id: `s${s}_obj#${i}#${j}`, type: "宾语", kind: obj["类型"], text: obj["值"]}
              if (obj["类型"] === "名词短语") {
                phrases.push(item)
              } else if (obj["类型"] === "句子") {
                clauses.push(item)
              }
            })
          }
          // 介词短语列、介词短语、介词宾语
          if (vp["介词短语列"]) {
            vp["介词短语列"].forEach((pp, j) => {
              let item = { id: `s${s}_pp#${i}#${j}`, type: "介词宾语", kind: pp["介词宾语"]["类型"], text: pp["介词宾语"]["值"]}
              if (pp["介词宾语"]["类型"] === "名词短语") {
                phrases.push(item)
              } else if (pp["介词宾语"]["类型"] === "句子") {
                clauses.push(item)
              }
            })
          }
        })
      }
    })
    console.log('phrases: ', phrases)
    console.log('clauses: ', clauses)

    let clausesList = clauses.map(clause => {
      return {id: clause.id, text: clause.text}
    })
    console.log('clausesList: ', clausesList)

    // 解析从句，把从句内部的名词短语/动词短语也提取出来
    try {
      // 创建从句解析承诺
      const parsePromieses = clausesList.map(clauseObj =>
        parseClause(apiUrl.value, apiKey.value, clauseObj)
      )
      const settlements = await Promise.allSettled(parsePromieses)
      // 从句解析结果
      const parsedClauses = settlements.map((settlement, index) => {
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
      console.log('parsedClauses: ',parsedClauses)

      parsedClauses.forEach(parsedClause => {
        let baseId = parsedClause.id // 本从句所在成分的id
        // 遍历从句找出需要提取的东西
        // 情景列与情景
        parsedClause["情景列"].forEach((ctx, i) => {
          phrases.push({ id: `${baseId}::ctx#${i}`, type: "情景", kind: "名词短语", text: ctx})
        })

        // 主语
        phrases.push({ id: `${baseId}::subj`, type: "主语", kind: "名词短语", text: parsedClause["主语"]})

        // 谓语列
        if (parsedClause["谓语列"]) {
          parsedClause["谓语列"].forEach((vp, i) => {
            // 谓语
            if (vp["谓语"]) {
              phrases.push({ id: `${baseId}::pred#${i}`, type: "谓语", kind: vp["谓语"]["类型"], text: vp["谓语"]["值"]})
            }
            // 宾语列与宾语
            if (vp["宾语列"]) {
              vp["宾语列"].forEach((obj, j) => {
                phrases.push({ id: `${baseId}::obj#${i}#${j}`, type: "宾语", kind: "名词短语", text: obj})
              })
            }
            // 介词短语列、介词短语、介词宾语
            if (vp["介词短语列"]) {
              vp["介词短语列"].forEach((pp, j) => {
                phrases.push({ id: `${baseId}::pp#${i}#${j}`, type: "介词宾语", kind: "名词短语", text: pp["介词宾语"]})
              })
            }
          })
        }
      })
      console.log('从句解析后的phrases: ', phrases)
    } catch(e) {
      console.error(e);
      apiError.value = e?.message || String(e);
    }

    // const phrases = [{"id":"s0_subj","type":"主语","kind":"名词短语","text":""},{"id":"s0_pred#0","type":"谓语","kind":"动词短语","text":"轮回"},{"id":"s0_obj#0#0","type":"宾语","kind":"名词短语","text":"百转"},{"id":"s0_pp#0#0::subj","type":"主语","kind":"名词短语","text":""},{"id":"s0_pp#0#0::pred#0","type":"谓语","kind":"动词短语","text":"续"},{"id":"s0_pp#0#0::obj#0#0","type":"宾语","kind":"名词短语","text":"前缘"},{"id":"s0_pp#0#0::pp#0#0","type":"介词宾语","kind":"名词短语","text":"你"}]

    const phrasesMap = new Map();
    // 把结构化tokipona词组Object转化为字符串
    function tokiponaStringBuilder(obj) {
      function _nounPhrase(obj) {
        let str = obj["头词"]
        if (obj["修饰词"].length !== 0) str += (' '+obj["修饰词"].join(' '))
        if (obj["复合修饰词"].length !== 0) {
          obj["复合修饰词"].forEach( pi => {
            str += (' pi '+pi["头词"]+' '+pi["修饰词"].join(' '))
          })
        }
        return str
      }
      if (Array.isArray(obj)) { // 为名词短语
        let nouns = obj.map( nounObj => _nounPhrase(nounObj))
        return nouns.join(' en ')
      } else { // 为动词短语
        let str = obj["动词"]
        if (obj["前动词"].length !== 0) str = obj["前动词"]+' '+str
        if (obj["修饰词"].length !== 0) str += (' '+obj["修饰词"].join(' '))
        return str
      }
    }
    try {
      const content = await parsePhrases(apiUrl.value, apiKey.value, inputSentence.value, phrases)
      const parsed = JSON.parse(content);
      // const parsed = {"results":[{"id":"s0_subj","parsed":[]},{"id":"s0_pred#0","parsed":{"前动词":"","动词":"kama","修饰词":["sin"]}},{"id":"s0_obj#0#0","parsed":[{"头词":"sike","修饰词":["mute"],"复合修饰词":[]}]},{"id":"s0_pp#0#0::subj","parsed":[]},{"id":"s0_pp#0#0::pred#0","parsed":{"前动词":"","动词":"awen","修饰词":[]}},{"id":"s0_pp#0#0::obj#0#0","parsed":[{"头词":"poka","修饰词":[],"复合修饰词":[{"头词":"tenpo","修饰词":["pini"]}]}]},{"id":"s0_pp#0#0::pp#0#0","parsed":[{"头词":"sina","修饰词":[],"复合修饰词":[]}]}]}
      for (const r of (parsed.results || [])) {
        r.parsed = tokiponaStringBuilder(r.parsed)
        if (r && r.id) phrasesMap.set(r.id, r);
      }
    } catch (e) {
      console.error(e);
      apiError.value = e?.message || String(e);
    }
    console.log(phrasesMap)
    // jsonTree.value = Array.from(phrasesMap.values()).map(v => JSON.stringify(v,null,2));

    // 对于类型为"名词短语"|"动词短语"的，把其"值"类似parseToLevel2Tree函数中那样加入一个array，最终对其array呼叫parsePhrases，然后进行类似parseToLevel2Tree的原路插回（不过parsePhrases返回的array的元素取代的是{ "类型": "名词短语"|"动词短语", "值": "<...>" }这个对象）
    // 对于类型为"句子"的，通过Promise.allSettled进行并发的parseSentence。对返回的结果也类似地呼叫parseConstituents，但解析出来的"句子"类型全部换成"名词短语"。然后就是同样的对"名词短语"|"动词短语"的处理。
    //二级结构树的一个例子：
    //[{"语气助词":"","情景列":[{"类型":"句子","值":"如果天黑了"}],"主语":"我","谓语列":[{"谓语":{"类型":"动词短语","值":"回"},"宾语列":[{"类型":"名词短语","值":"镇子里"}],"介词短语列":[{"介词":"工具/手段","介词宾语":{"类型":"名词短语","值":"汽车"}}]}]}]

    jsonLevel3TreeLoading.value = false;
    jsonLoadingInterval = stopLoadingTimer(jsonLoadingInterval);
    console.log("三级结构树解析结束")
  }

  async function handleJsonClick() {
    switch (jsonButtonState.value) {
      case jsonParseState.level1:
        await parseToLevel2Tree()
        break;
      case jsonParseState.level2:
        await parseToLevel3Tree()
        break;
      default:
        break;
    }
  }

  const jsonButtonTitle = computed(() => {
    if (jsonLevel2TreeLoading.value || jsonLevel3TreeLoading.value) return '正在分析…';
    switch (jsonButtonState.value) {
      case 'level1': return '点击以向二级结构树转化';
      case 'level2': return '点击以向三级结构树转化';
      case 'level3': return '生成最终结果';
      default: return '';
    }
  });

  return {
    // state
    apiUrl, apiKey, apiError, inputSentence, jsonLevel1TreeLoading, jsonTree,
    jsonButtonState, jsonLevel2TreeLoading, jsonLevel3TreeLoading, jsonLevel2TreeLeaves,
    inputLoadingDuration, jsonLoadingDuration,
    // computed
    jsonButtonTitle,
    // methods
    parseToLevel1Tree, parseToLevel2Tree, handleJsonClick,
  };
}
