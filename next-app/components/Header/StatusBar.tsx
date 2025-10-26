"use client";

import { useApiStatusPlaceholder, useDictionaryStatusPlaceholder } from "../../hooks/useStatusPlaceholders";
import type { ApiStatus, DictionaryStatus, StatusState } from "../../types/status";

function renderDictionaryBadge({ state, totalEntries, errorMessage }: DictionaryStatus) {
  switch (state) {
    case "loading":
      return (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700" title="正在加载 dictionary.csv">
          <svg className="mr-1 h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"></path>
          </svg>
          加载中…
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700" title={errorMessage ?? "加载失败"}>
          加载失败
        </span>
      );
    case "success":
      return (
        <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700" title={`已成功加载 ${totalEntries ?? 0} 条`}>
          已加载 {totalEntries ?? 0} 条
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700" title="占位状态">
          未加载
        </span>
      );
  }
}

function renderApiBadge(state: StatusState, message?: string) {
  const baseClass = "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium";
  switch (state) {
    case "loading":
      return (
        <span className={`${baseClass} bg-blue-50 text-blue-700`} title={message}>
          <svg className="mr-1 h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"></path>
          </svg>
          {message ?? "请求中"}
        </span>
      );
    case "error":
      return (
        <span className={`${baseClass} bg-red-50 text-red-700`} title={message}>
          {message ?? "请求失败"}
        </span>
      );
    case "success":
      return (
        <span className={`${baseClass} bg-green-50 text-green-700`} title={message}>
          {message ?? "已连接"}
        </span>
      );
    default:
      return (
        <span className={`${baseClass} bg-gray-100 text-gray-700`} title={message}>
          {message ?? "未连接"}
        </span>
      );
  }
}

export function StatusBar() {
  const dictionaryStatus: DictionaryStatus = useDictionaryStatusPlaceholder();
  const apiStatus: ApiStatus = useApiStatusPlaceholder();

  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="status-bar">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">字典状态</span>
        {renderDictionaryBadge(dictionaryStatus)}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">API 状态</span>
        {renderApiBadge(apiStatus.state, apiStatus.message)}
      </div>
    </div>
  );
}

export default StatusBar;
