export type StatusState = "idle" | "loading" | "success" | "error";

export type DictionaryStatus = {
  state: StatusState;
  totalEntries?: number;
  errorMessage?: string;
};

export type ApiStatus = {
  state: StatusState;
  message?: string;
};
