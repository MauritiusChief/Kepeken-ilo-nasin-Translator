"use client";

import { useParserPlaceholder } from "../../hooks/useParserPlaceholder";

export function ParserPanel() {
  const { inputSentence, setInputSentence, isParsing, parse, resultSentence, inputHint } =
    useParserPlaceholder();

  return (
    <section className="flex min-h-[60vh] flex-col rounded-2xl border bg-white p-4" data-testid="parser-panel">
      <div className="grid h-full grid-rows-2 gap-4">
        <div className="flex flex-col">
          <div className="mb-2 flex gap-2">
            <div className="w-full">
              <h2 className="text-base font-semibold">输入</h2>
              <p className="mt-0.5 text-xs text-gray-500">{inputHint}</p>
            </div>
            <button
              type="button"
              onClick={parse}
              disabled={isParsing || !inputSentence}
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
              aria-label="解析句子"
            >
              {isParsing ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"></path>
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          </div>
          <textarea
            value={inputSentence}
            onChange={(event) => setInputSentence(event.target.value)}
            className="flex-1 resize-none rounded-md border px-3 py-2 text-sm"
            placeholder="例如：小孩在屋子里吃饭。"
          />
        </div>

        <div className="flex flex-col">
          <div className="mb-2">
            <h2 className="text-base font-semibold">结果</h2>
            <p className="mt-0.5 text-xs text-gray-500">这里显示根据结构树生成的内容（占位）。</p>
          </div>
          <div className="flex-1 overflow-auto rounded-md border bg-gray-50 p-3 text-sm">
            <p className="text-gray-500">{resultSentence}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ParserPanel;
