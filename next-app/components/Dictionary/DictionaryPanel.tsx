"use client";

import { useDictionarySearch } from "../../hooks/useDictionarySearch";
import { HighlightedText } from "../../lib/placeholders/highlight";

export function DictionaryPanel() {
  const { searchText, setSearchText, filteredRows } = useDictionarySearch();

  return (
    <section className="flex min-h-[60vh] flex-col rounded-2xl border bg-white p-4" data-testid="dictionary-panel">
      <div className="mb-3">
        <h2 className="text-base font-semibold">查询字典</h2>
        <p className="mt-0.5 text-xs text-gray-500">这里展示字典查询结果（占位）。</p>
      </div>

      <div className="mb-3 flex gap-2">
        <input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          type="text"
          placeholder="输入要查询的词…"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="max-h-96 overflow-auto rounded-md border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2 font-semibold">道本语</th>
              <th className="px-3 py-2 font-semibold">翻译</th>
              <th className="px-3 py-2 font-semibold">释义</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => (
              <tr key={`${row.source}-${index}`} className="border-t">
                <td className="px-3 py-2">
                  <HighlightedText text={row.source} query={searchText} />
                </td>
                <td className="px-3 py-2">
                  <HighlightedText text={row.translation} query={searchText} />
                </td>
                <td className="px-3 py-2">
                  <HighlightedText text={row.description} query={searchText} />
                </td>
              </tr>
            ))}

            {filteredRows.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-gray-500" colSpan={3}>
                  未找到匹配项
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default DictionaryPanel;
