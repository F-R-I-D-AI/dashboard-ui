// app/api/mock/enhance/route.ts
import { NextResponse } from "next/server";

// job_id → { prefix, faceEnhance }
const JOB_STATE = new Map<string, { prefix: string, faceEnhance: boolean }>();

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("image") as File | null;

  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

  const fileName = file.name; // 예: "0001.png"
  const prefix = fileName.split(".")[0]; // "0001"

  const faceEnhanceStr = formData.get("face_enhance") ?? "true";
  const faceEnhance = faceEnhanceStr === "true";

  const job_id = crypto.randomUUID().replace(/-/g, "").slice(0, 32);

  // 상태 저장
  JOB_STATE.set(job_id, { prefix, faceEnhance });

  return NextResponse.json({ job_id });
}

// 다른 route에서 읽을 수 있게 export
export function getJobInfo(jobId: string) {
  return JOB_STATE.get(jobId);
}
