// app/api/mock/detect_faces/route.ts
import { NextResponse } from "next/server";
import { BEFORE_FACE_BOXES, AFTER_FACE_BOXES } from "../_data/faces";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }

  const name = file.name;  // "0001.png" | "0001_out.png" | "0001_out_face.png"

  // prefix 추출
  const prefix = name.split("_")[0].split(".")[0];

  // BEFORE 판정 (파일 이름에 _out이 없으면 BEFORE)
  if (!name.includes("_out")) {
    const before = BEFORE_FACE_BOXES[prefix];

    if (!before) {
      return NextResponse.json({
        width: 0,
        height: 0,
        faces: []
      });
    }

    return NextResponse.json(before);
  }

  // AFTER 판정
  const after = AFTER_FACE_BOXES[prefix];

  if (!after) {
    return NextResponse.json({
      width: 0,
      height: 0,
      faces: []
    });
  }

  return NextResponse.json(after);
}
