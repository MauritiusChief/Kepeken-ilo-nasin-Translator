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
  const resultSentence = ref('此处将会显示最终结果');
  // const jsonButtonState = ref(jsonParseState.level1)
  // const jsonButtonState = ref(jsonParseState.level2)
  const jsonButtonState = ref(jsonParseState.level3)
  const jsonLevel2TreeLoading = ref(false);
  const jsonLevel3TreeLoading = ref(false);
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
    let parsedClauses = [] // 盛装解析出来的结构化的从句
    try {
      // 创建从句解析承诺
      const parsePromieses = clausesList.map(clauseObj =>
        parseClause(apiUrl.value, apiKey.value, clauseObj)
      )
      const settlements = await Promise.allSettled(parsePromieses)
      // 从句解析结果
      parsedClauses = settlements.map((settlement, index) => {
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

    const phrasesMap = new Map(); // 盛装toki pona翻译过的，所有主句与从句的短语结构
    try {
      const content = await parsePhrases(apiUrl.value, apiKey.value, inputSentence.value, phrases)
      const parsed = JSON.parse(content);
      // const parsed = {"results":[{"id":"s0_subj","parsed":[]},{"id":"s0_pred#0","parsed":{"前动词":"","动词":"kama","修饰词":["sin"]}},{"id":"s0_obj#0#0","parsed":[{"头词":"sike","修饰词":["mute"],"复合修饰词":[]}]},{"id":"s0_pp#0#0::subj","parsed":[]},{"id":"s0_pp#0#0::pred#0","parsed":{"前动词":"","动词":"awen","修饰词":[]}},{"id":"s0_pp#0#0::obj#0#0","parsed":[{"头词":"poka","修饰词":[],"复合修饰词":[{"头词":"tenpo","修饰词":["pini"]}]}]},{"id":"s0_pp#0#0::pp#0#0","parsed":[{"头词":"sina","修饰词":[],"复合修饰词":[]}]}]}
      for (const r of (parsed.results || [])) {
        // r.parsed = tokiponaStringBuilder(r.parsed)
        if (r && r.id) phrasesMap.set(r.id, r);
      }

      // 把生成的toki pona结构回插到从句中
      const parsedClausesMap = new Map() // id与其余成分分离的parsedClauses（详见 promptParseClause 中的结构）
      parsedClauses.forEach(parsedClause => {
        let baseId = parsedClause.id // 本从句所在成分的id
        let parsedClauseObj = {} // 将被存储到map中的结构
        // 情景列，插回情景
        let contextList = parsedClause["情景列"]
        parsedClauseObj["情景列"] = contextList.map((ctx, i) => {
          let id = `${baseId}::ctx#${i}`
          return phrasesMap.has(id) ? phrasesMap.get(id).parsed : ctx
        })

        // 主语
        parsedClauseObj["主语"] = phrasesMap.get(`${baseId}::subj`).parsed

        // 谓语列
        if (parsedClause["谓语列"]) {
          let vpList = parsedClause["谓语列"] || [];
          parsedClauseObj["谓语列"] = vpList.map((vp, i) => {
            // 插回谓语
            if (vp["谓语"]) {
              vp["谓语"] = phrasesMap.get(`${baseId}::pred#${i}`).parsed
            }
            // 宾语列，插回宾语
            if (vp["宾语列"]) {
              let objList = vp["宾语列"]
              vp["宾语列"] = objList.map((obj, j) => {
                let id = `${baseId}::obj#${i}#${j}`;
                return phrasesMap.has(id) ? phrasesMap.get(id).parsed : obj;
              })
            }
            // 介词短语列、介词短语，插回介词宾语
            if (vp["介词短语列"]) {
              vp["介词短语列"].forEach((pp, j) => {
                pp["介词宾语"] = phrasesMap.get(`${baseId}::pp#${i}#${j}`).parsed;
              })
            }
            return vp
          })
        }

        parsedClausesMap.set(baseId, parsedClauseObj)
      })
      console.log('parsedClausesMap: ', parsedClausesMap)

      // 把生成的toki pona结构与从句回插到原位，作为三级结构树
      jsonTreeObj.forEach((sentenceObj, s) => {
        // 情景列，插回情景
        let contextList = sentenceObj["情景列"]
        sentenceObj["情景列"] = contextList.map((ctx, i) => {
          let id = `s${s}_ctx#${i}`
          if (phrasesMap.has(id)) return phrasesMap.get(id).parsed
          if (parsedClausesMap.has(id)) return parsedClausesMap.get(id)
          return ctx
        })

        // 主语，主语不存在从句的情况
        sentenceObj["主语"] = phrasesMap.get(`s${s}_subj`).parsed

        // 谓语列
        if (sentenceObj["谓语列"]) {
          let vpList = sentenceObj["谓语列"] || [];
          sentenceObj["谓语列"] = vpList.map((vp, i) => {
            // 插回谓语，谓语不存在从句的情况
            if (vp["谓语"]) {
              vp["谓语"] = phrasesMap.get(`s${s}_pred#${i}`).parsed
            }
            // 宾语列，插回宾语
            if (vp["宾语列"]) {
              let objList = vp["宾语列"]
              vp["宾语列"] = objList.map((obj, j) => {
                let id = `s${s}_obj#${i}#${j}`;
                if (phrasesMap.has(id)) return phrasesMap.get(id).parsed
                if (parsedClausesMap.has(id)) return parsedClausesMap.get(id)
                return obj
              })
            }
            // 介词短语列、介词短语，插回介词宾语
            if (vp["介词短语列"]) {
              vp["介词短语列"].forEach((pp, j) => {
                let ppId = `s${s}_pp#${i}#${j}`
                if (phrasesMap.has(ppId)) pp["介词宾语"] = phrasesMap.get(ppId).parsed;
                if (parsedClausesMap.has(ppId)) pp["介词宾语"] = parsedClausesMap.get(ppId);
              })
            }
            return vp
          })
        }
      });

      jsonTree.value = JSON.stringify(jsonTreeObj, null, 2)
      jsonButtonState.value = jsonParseState.level3;
    } catch (e) {
      console.error(e);
      apiError.value = e?.message || String(e);
    } finally {
      jsonLevel3TreeLoading.value = false;
      jsonLoadingInterval = stopLoadingTimer(jsonLoadingInterval);
      console.log("三级结构树解析结束")
    }
    // console.log(phrasesMap)
    // jsonTree.value = Array.from(phrasesMap.values()).map(v => JSON.stringify(v,null,2));
  }


  async function translateToTokiPona() {
    const prepoMap = new Map([
      ["工具/手段", "kepeken"],
      ["地点/存在", "lon"],
      ["相似/比较", "sama"],
      ["来源/原因", "tan"],
      ["方向/目的", "tawa"],
    ])
    const preVerbMap = new Map([
      ["未来/趋向", "kama"],
      ["可能/能力", "ken"],
      ["开始/相位起点", "kama"],
      ["结束/相位终点", "pini"],
      ["知识/掌握", "sona"],
      ["意愿/需求", "wile"],
      ["尝试/探索", "lukin"],
      ["保持/持续", "awen"],
    ])
    // 把结构化tokipona词组Object转化为字符串
    function tokiponaStringBuilder(obj) {
      function _nounPhrase(obj) {
        let arr = [obj["头词"]]
        if (obj["修饰词"].length !== 0) arr = [...arr, ' ', ...obj["修饰词"]]
        if (obj["复合修饰词"].length !== 0) {
          obj["复合修饰词"].forEach( pi => {
            arr = [...arr, 'pi', pi["头词"], ...pi["修饰词"]]
          })
        }
        return arr.join(' ')
      }
      if (Array.isArray(obj)) { // 为名词短语
        let nouns = obj.map( nounObj => _nounPhrase(nounObj))
        return nouns.join(' en ')
      } else { // 为动词短语
        let arr = [obj["动词"]]
        if (obj["前动词"].length !== 0) arr = [obj["前动词"], ...arr]
        if (obj["修饰词"].length !== 0) arr = [...arr, ...obj["修饰词"]]
        return arr.join(' ')
      }
    }
    // 从句解析函数
    function clauseStringBuilder(obj) {
      let arr = []
      // 从句情景列
      if (obj["情景列"].length !== 0) {
        obj["情景列"].forEach( ctx => {
          // TODO：未处理情景内数组多个对象的可能
          arr.push(tokiponaStringBuilder(ctx))
          arr.push('la')
        })
      }
      // 从句主语
      arr.push(tokiponaStringBuilder(obj["主语"]))
      // 从句谓语列
      if (obj["谓语列"].length !== 0) {
        let vpArr = ['li']
        obj["谓语列"].forEach( vp => {
          // 从句谓语
          if (vp["谓语"]) {
            // TODO：未处理谓语内数组多个对象的可能
            vpArr.push(tokiponaStringBuilder(vp["谓语"]))
          }
          // 从句宾语列与宾语
          if (vp["宾语列"].length !== 0) {
            vp["宾语列"].forEach( o => {
              // TODO：未处理宾语内数组多个对象的可能
              vpArr.push('e')
              vpArr.push(tokiponaStringBuilder(o))
            })
          }
          // 从句介词短语列、介词短语、介词宾语
          if (vp["介词短语列"].length !== 0) {
            vp["介词短语列"].forEach( pp => {
              // TODO：未处理介词宾语内数组多个对象的可能
              vpArr.push(prepoMap.get(pp["介词"]))
              vpArr.push(tokiponaStringBuilder(pp["介词宾语"]))
            })
          }
        })
        arr = arr.concat(vpArr)
      }
      return arr.join(' ')
    }

    let jsonTreeObj = JSON.parse(jsonTree.value || "[]");
    // let jsonTreeObj = [{"语气助词":"转折","情景列":[{"情景列":[],"主语":[{"头词":"ike","修饰词":[],"复合修饰词":[]}],"谓语列":[{"谓语":[{"头词":"mute","修饰词":[],"复合修饰词":[]}],"宾语列":[],"介词短语列":[]}]}],"主语":[{"头词":"mi","修饰词":[],"复合修饰词":[]}],"谓语列":[{"谓语":{"前动词":"wile","动词":"utala","修饰词":["awen"]},"宾语列":[],"介词短语列":[{"介词":"工具/手段","介词宾语":[{"头词":"luka","修饰词":["mi","tu"],"复合修饰词":[]}]},{"介词":"工具/手段","介词宾语":[{"头词":"wile","修饰词":["mi"],"复合修饰词":[]}]},{"介词":"方向/目的","介词宾语":[{"头词":"ike","修饰词":[],"复合修饰词":[]}]}]}]}]

    let resultArray = []
    jsonTreeObj.forEach(sentenceObj => {
      let arr = []
      // 情景列
      if (sentenceObj["情景列"].length !== 0) {
        sentenceObj["情景列"].forEach( ctx => {
          if (ctx["主语"]) { // 从句作为情景
            arr.push(clauseStringBuilder(ctx))
            arr.push('la,')
          } else { // 名词短语作为情景
            // TODO：未处理情景内数组多个对象的可能
            arr.push(tokiponaStringBuilder(ctx))
            arr.push('la')
          }
        })
      }
      // 主语
      arr.push(tokiponaStringBuilder(sentenceObj["主语"]))
      // 谓语列
      if (sentenceObj["谓语列"].length !== 0) {
        let noLi = new Set(["mi", "sina"])
        let vpArr = []
        if (!noLi.has(arr[arr.length-1])) vpArr.push('li') // 若前面不是 mi 或者 sina，才有 li
        sentenceObj["谓语列"].forEach( vp => {
          // 谓语
          if (vp["谓语"]) {
            // TODO：未处理谓语内数组多个对象的可能
            vpArr.push(tokiponaStringBuilder(vp["谓语"]))
          }
          // 宾语列与宾语
          if (vp["宾语列"].length !== 0) {
            vp["宾语列"].forEach( o => {
              if (o["主语"]) { // 从句作为宾语
                vpArr.push('e ni:')
                vpArr.push(clauseStringBuilder(o))
                vpArr.push(',')
              } else { // 名词短语作为宾语
                // TODO：未处理宾语内数组多个对象的可能
                vpArr.push('e')
                vpArr.push(tokiponaStringBuilder(o))
              }
            })
          }
          // 介词短语列、介词短语、介词宾语
          if (vp["介词短语列"].length !== 0) {
            vp["介词短语列"].forEach( pp => {
              vpArr.push(prepoMap.get(pp["介词"]))
              if (pp["介词宾语"]["主语"]) { // 从句作为介词宾语
                vpArr.push(clauseStringBuilder(pp["介词宾语"]))
                vpArr.push(',')
              } else { // 名词短语作为介词宾语
                // TODO：未处理介词宾语内数组多个对象的可能
                vpArr.push(tokiponaStringBuilder(pp["介词宾语"]))
              }

            })
          }
        })
        arr = arr.concat(vpArr)
      }
      if (arr[arr.length-1] === ',') arr.pop()
      let sentenceStr = arr.join(' ')
      sentenceStr = sentenceStr.replace(' ,', ',')
      switch (sentenceObj["语气助词"]) {
          case "转折":
            sentenceStr = "taso, "+sentenceStr+"."
            break
          case "感叹":
            sentenceStr += " a!"
            break
          case "呼唤":
            sentenceStr += " o!"
            break
          case "祈使":
            sentenceStr = "o "+sentenceStr+"!"
            break
          case "疑问":
            sentenceStr += " anu seme?"
            break
          default:
            sentenceStr += "."
        }
      resultArray.push(sentenceStr)
    })

    resultSentence.value = resultArray.join(' ')
  }

  async function handleJsonClick() {
    switch (jsonButtonState.value) {
      case jsonParseState.level1:
        await parseToLevel2Tree()
        break;
      case jsonParseState.level2:
        await parseToLevel3Tree()
        break;
      case jsonParseState.level3:
        await translateToTokiPona()
        break
      default:
        break;
    }
  }

  const jsonButtonTitle = computed(() => {
    if (jsonLevel2TreeLoading.value || jsonLevel3TreeLoading.value) return '正在分析…';
    switch (jsonButtonState.value) {
      case jsonParseState.level1: return '点击以向二级结构树转化';
      case jsonParseState.level2: return '点击以向三级结构树转化';
      case jsonParseState.level3: return '生成最终结果';
      default: return '';
    }
  });

  return {
    // state
    apiUrl, apiKey, apiError, inputSentence, jsonLevel1TreeLoading, jsonTree, resultSentence,
    jsonButtonState, jsonLevel2TreeLoading, jsonLevel3TreeLoading,
    inputLoadingDuration, jsonLoadingDuration,
    // computed
    jsonButtonTitle,
    // methods
    parseToLevel1Tree, parseToLevel2Tree, handleJsonClick,
  };
}
