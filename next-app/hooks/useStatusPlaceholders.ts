"use client";

import { useMemo } from "react";
import type { ApiStatus, DictionaryStatus } from "../types/status";

export function useDictionaryStatusPlaceholder(): DictionaryStatus {
  return useMemo(
    () => ({
      state: "success",
      totalEntries: 1234,
    }),
    []
  );
}

export function useApiStatusPlaceholder(): ApiStatus {
  return useMemo(
    () => ({
      state: "idle",
      message: "未连接",
    }),
    []
  );
}
