import type { DictionaryEntry } from "../../types/dictionary";

export function getSampleDictionaryEntries(): DictionaryEntry[] {
  return [
    {
      source: "jan",
      translation: "人",
      description: "表示人类、人物、有人格的存在。",
    },
    {
      source: "tomo",
      translation: "屋子",
      description: "建筑物，尤其是房屋。",
    },
    {
      source: "moku",
      translation: "吃",
      description: "动词，表示进食或饮用的行为。",
    },
  ];
}
