// app/api/mock/jobs/[id]/route.ts
import { NextResponse } from "next/server";

let counter: Record<string, number> = {};

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;   // ★★★ 핵심: await로 params 풀기
  const jobId = id;

  counter[jobId] ??= 0;
  counter[jobId]++;

  // 1) queued
  if (counter[jobId] === 1) {
    return NextResponse.json({
      job_id: jobId,
      status: "queued"
    });
  }

  // 2) processing
  if (counter[jobId] === 2) {
    return NextResponse.json({
      job_id: jobId,
      status: "processing"
    });
  }

  // 3) completed
  return NextResponse.json({
    job_id: jobId,
    status: "completed",
    result_url: "/mock/after.png",
    face_data: {
      width: 800,
      height: 600,
      faces: [
        { x: 150, y: 160, w: 160, h: 160 },
        { x: 380, y: 220, w: 140, h: 140 }
      ]
    }
  });
}
