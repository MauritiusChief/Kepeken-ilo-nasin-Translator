"use client";

import { useMemo, useState } from "react";

export function useParserPlaceholder() {
  const [inputSentence, setInputSentence] = useState("小孩在屋子里吃饭。");
  const [isParsing, setIsParsing] = useState(false);
  const [resultSentence, setResultSentence] = useState("这里显示根据结构树生成的内容（占位）。");

  const inputHint = useMemo(() => {
    if (isParsing) {
      return "已解析 0 秒（占位）";
    }
    return "输入要分解的句子，请勿输入过于复杂（从句套从句）的句子。";
  }, [isParsing]);

  const parse = async () => {
    setIsParsing(true);
    console.info("parseToLevel1Tree placeholder invoked", { inputSentence });
    await new Promise((resolve) => setTimeout(resolve, 600));
    setResultSentence(`解析结果占位：${inputSentence}`);
    setIsParsing(false);
  };

  return {
    inputSentence,
    setInputSentence,
    isParsing,
    parse,
    resultSentence,
    inputHint,
  } as const;
}
