"use client";

import { useMemo, useState } from "react";
import type { DictionaryEntry } from "../types/dictionary";
import { getSampleDictionaryEntries } from "../lib/placeholders/dictionaryClient";

export function useDictionarySearch() {
  const [searchText, setSearchText] = useState("");
  const rows = useMemo(() => getSampleDictionaryEntries(), []);

  const filteredRows = useMemo(() => {
    if (!searchText) {
      return rows;
    }
    const normalized = searchText.trim().toLowerCase();
    return rows.filter((row) =>
      [row.source, row.translation, row.description].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [rows, searchText]);

  return {
    searchText,
    setSearchText,
    rows,
    filteredRows,
  } satisfies {
    searchText: string;
    setSearchText: (value: string) => void;
    rows: DictionaryEntry[];
    filteredRows: DictionaryEntry[];
  };
}
