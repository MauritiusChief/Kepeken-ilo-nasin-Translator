"use client";

import { useCallback, useMemo, useState } from "react";
import type { StructureEntry } from "../types/structure";

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

const INITIAL_ENTRIES: StructureEntry[] = [
  {
    id: "entry-1",
    summary: "条目 1：示例结构",
    expanded: false,
    sending: false,
    elapsed: 0,
    情景: "示例情景",
    主语: "示例主语",
    其他: "示例其他信息",
  },
];

export function useStructureTreePlaceholder() {
  const [entries, setEntries] = useState<StructureEntry[]>(INITIAL_ENTRIES);

  const toggleStructureRow = useCallback((id: string) => {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, expanded: !entry.expanded } : entry
      )
    );
  }, []);

  const addStructureRow = useCallback(() => {
    setEntries((current) => [
      ...current,
      {
        id: createId("entry"),
        summary: `条目 ${current.length + 1}：待完善`,
        expanded: true,
        sending: false,
        elapsed: 0,
        情景: "",
        主语: "",
        其他: "",
      },
    ]);
  }, []);

  const removeStructureRow = useCallback((id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const sendStructureRow = useCallback((id: string) => {
    console.info("sendStructureRow placeholder invoked", { id });
  }, []);

  const canSendStructureRow = useCallback((entry: StructureEntry) => !entry.sending, []);

  const structureSummary = useCallback((entry: StructureEntry) => entry.summary, []);

  const loadingHint = useMemo(() => "点击条目右侧的箭头可单独发送，展开后可编辑详情。", []);

  const updateEntryField = useCallback(
    (id: string, field: keyof Pick<StructureEntry, "summary" | "情景" | "主语" | "其他">, value: string) => {
      setEntries((current) =>
        current.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                [field]: value,
              }
            : entry
        )
      );
    },
    []
  );

  return {
    entries,
    toggleStructureRow,
    addStructureRow,
    removeStructureRow,
    sendStructureRow,
    canSendStructureRow,
    structureSummary,
    loadingHint,
    updateEntryField,
  } as const;
}
