// app/api/mock/enhance/route.ts
import { NextResponse } from "next/server";

// Mock 상태 저장 (전역)
let enhanced = false;

export async function POST(req: Request) {
  enhanced = true;

  const job_id = crypto.randomUUID().replace(/-/g, "").slice(0, 32);

  return NextResponse.json({ job_id });
}

// 다른 파일에서 이 상태 값을 가져갈 수 있도록 export
export function isEnhanced() {
  return enhanced;
}
