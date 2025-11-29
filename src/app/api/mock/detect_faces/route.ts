// app/api/mock/detect_faces/route.ts
import { NextResponse } from "next/server";
import { isEnhanced } from "../enhance/route";  // enhance에서 상태 가져오기

export async function POST(req: Request) {

  // BEFORE 얼굴 박스
  const beforeFaces = {
    width: 800,
    height: 600,
    faces: [
      { x: 120, y: 130, w: 150, h: 150 },
      { x: 360, y: 200, w: 120, h: 120 }
    ]
  };

  // AFTER 얼굴 박스 (조금 다른 위치와 크기)
  const afterFaces = {
    width: 800,
    height: 600,
    faces: [
      { x: 140, y: 150, w: 165, h: 165 },
      { x: 380, y: 230, w: 140, h: 140 },
      { x: 250, y: 300, w: 110, h: 110 } // 추가 박스도 가능
    ]
  };

  // 🔥 enhance 실행 여부에 따라 다른 결과 반환
  return NextResponse.json(isEnhanced() ? afterFaces : beforeFaces);
}
