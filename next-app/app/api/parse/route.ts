import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({ input: "" }));
  const input: string = body?.input ?? "";

  return NextResponse.json({
    status: "placeholder",
    message: "解析逻辑尚未实现。",
    input,
    result: input ? `解析结果占位：${input}` : null,
  });
}
