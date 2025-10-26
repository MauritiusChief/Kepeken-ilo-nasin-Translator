import { NextResponse } from "next/server";
import { getSampleDictionaryEntries } from "../../../lib/placeholders/dictionaryClient";

export async function GET() {
  return NextResponse.json({
    status: "placeholder",
    message: "返回示例字典数据，待替换为真实逻辑。",
    data: getSampleDictionaryEntries(),
  });
}
