// app/api/mock/jobs/[id]/route.ts
import { NextResponse } from "next/server";
import { getJobInfo } from "../../enhance/route";
import { AFTER_FACE_BOXES } from "../../_data/faces";

const counter: Record<string, number> = {};

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const jobId = id;

  counter[jobId] ??= 0;
  counter[jobId]++;

  // STEP 1
  if (counter[jobId] === 1) {
    return NextResponse.json({ job_id: jobId, status: "queued" });
  }

  // STEP 2
  if (counter[jobId] === 2) {
    return NextResponse.json({ job_id: jobId, status: "processing" });
  }

  // STEP 3 (completed)
  const info = getJobInfo(jobId);

  if (!info) {
    return NextResponse.json({ error: "unknown job" }, { status: 404 });
  }

  const { prefix, faceEnhance } = info;

  // 결과 파일 이름 결정
  const resultFile = faceEnhance
    ? `/mock/${prefix}_out_face.png`
    : `/mock/${prefix}_out.png`;

  // AFTER 얼굴 박스 결정
  const faceBoxes = AFTER_FACE_BOXES[prefix] ?? null;

  return NextResponse.json({
    job_id: jobId,
    status: "completed",
    result_url: resultFile,
    face_data: faceBoxes
  });
}
