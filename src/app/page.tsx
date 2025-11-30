"use client";

const API_URL_V1 = process.env.NEXT_PUBLIC_API_URL_V1!;

import { useState, useRef, useEffect } from "react";

type FaceBox = { x: number; y: number; w: number; h: number };

type JobInfo = {
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  result_url?: string;
  error?: string;
  face_data?: {
    width: number;
    height: number;
    faces: FaceBox[];
  };
};

export default function Home() {
  const [beforeImg, setBeforeImg] = useState<string | null>(null);
  const [afterImg, setAfterImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgRatio, setImgRatio] = useState<number | null>(null);
  const [prefix, setPrefix] = useState<string | null>(null);

  const [beforeFaces, setBeforeFaces] = useState<FaceBox[]>([]);
  const [afterFaces, setAfterFaces] = useState<FaceBox[]>([]);
  const [imgMetaBefore, setImgMetaBefore] = useState<{ width: number; height: number } | null>(null);
  const [imgMetaAfter, setImgMetaAfter] = useState<{ width: number; height: number } | null>(null);

  const [sliderPos, setSliderPos] = useState(0.5);
  const sliderRef = useRef<HTMLDivElement>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [croppedFaces, setCroppedFaces] = useState<string[]>([]);

  const [dragActive, setDragActive] = useState(false);

  const [useFaceEnhance, setUseFaceEnhance] = useState(true);

  const MAX_LONG_EDGE = 2500;
  const MAX_PIXELS = 4500000; // 4.5MP

  const [showPolicy, setShowPolicy] = useState(false);

  const loadImageInfo = (url: string) => {
    const img = new Image();
    img.onload = () => setImgRatio(img.height / img.width);
    img.src = url;
  };

  async function checkImageResolution(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;

        if (w > MAX_LONG_EDGE || h > MAX_LONG_EDGE) {
          alert(`이미지가 너무 큽니다. 최대 해상도는 한 변 2500px 이하입니다.`);
          resolve(false);
        } else if (w * h > MAX_PIXELS) {
          alert(`이미지가 너무 큽니다. 최대 4.5MP (약 2500×1800)를 초과합니다.`);
          resolve(false);
        } else {
          resolve(true);
        }
      };
      img.src = URL.createObjectURL(file);
    });
  }

  async function requestFaceDetection(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL_V1}/detect_faces`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Face detection failed");
    return await res.json();
  }

  async function cropFacesFromAfterImage(afterImgUrl: string, faces: FaceBox[], meta: { width: number; height: number }) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = afterImgUrl;
    await new Promise((resolve) => (img.onload = resolve));

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    const croppedUrls: string[] = [];

    const scaleX = img.width / meta.width;
    const scaleY = img.height / meta.height;

    for (const f of faces) {
      const cropW = f.w * scaleX;
      const cropH = f.h * scaleY;

      canvas.width = cropW;
      canvas.height = cropH;

      ctx.clearRect(0, 0, cropW, cropH);
      ctx.drawImage(img, f.x * scaleX, f.y * scaleY, cropW, cropH, 0, 0, cropW, cropH);

      croppedUrls.push(canvas.toDataURL("image/png"));
    }

    return croppedUrls;
  }

  // 업로드 로직 통합 (drag&drop + file input 공용)
  async function handleFileSelect(file: File) {
    const p = file.name.split(".")[0];
    setPrefix(p);
    
    // 이미지 해상도 제한 검사
    const isValid = await checkImageResolution(file);
    if (!isValid) return;

    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setBeforeImg(url);
    loadImageInfo(url);

    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrentJobId(null);
    setLoading(false);
    setAfterImg(null);
    setAfterFaces([]);
    setSliderPos(0.5);

    try {
      const detection = await requestFaceDetection(file);
      setBeforeFaces(detection.faces);
      setImgMetaBefore({ width: detection.width, height: detection.height });
    } catch (e) {
      console.error(e);
    }
  }

  // Drag & Drop 핸들러
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  async function checkStatus(jobId: string) {
    try {
      const res = await fetch(`${API_URL_V1}/jobs/${jobId}`);
      const data: JobInfo = await res.json();

      if (data.status === "completed") {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        setCurrentJobId(null);

        const restoredUrl = data.result_url || null;
        setAfterImg(restoredUrl);

        if (restoredUrl) {
          try {
            const blob = await fetch(restoredUrl).then((r) => r.blob());
            const afterFileName = `${prefix}${useFaceEnhance ? "_out_face-enhanced.png" : "_out.png"}`;
            const restoredFile = new File([blob], afterFileName, { type: "image/png" });
            const detection = await requestFaceDetection(restoredFile);

            setAfterFaces(detection.faces);
            setImgMetaAfter({ width: detection.width, height: detection.height });

            const faceCrops = await cropFacesFromAfterImage(restoredUrl, detection.faces, {
              width: detection.width,
              height: detection.height,
            });
            setCroppedFaces(faceCrops);
          } catch (e) {
            console.error("AFTER face detect failed:", e);
          }
        }

        setLoading(false);
      } else if (data.status === "failed") {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setCurrentJobId(null);
        alert("복원 실패: " + data.error);
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function runRestore() {
    if (!uploadedFile) return;

    setLoading(true);
    setAfterImg(null);
    setAfterFaces([]);
    setElapsedTime(0);

    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    const start = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedTime((Date.now() - start) / 1000);
    }, 100);

    try {
      const formData = new FormData();
      formData.append("image", uploadedFile);
      formData.append("face_enhance", useFaceEnhance ? "true" : "false");

      const res = await fetch(`${API_URL_V1}/enhance`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Enhance request failed");

      const data = await res.json();
      const { job_id } = data;

      setCurrentJobId(job_id);
      intervalRef.current = setInterval(() => checkStatus(job_id), 2000);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const updatePos = (clientX: number) => {
    const rect = sliderRef.current?.getBoundingClientRect();
    if (!rect) return;
    let ratio = (clientX - rect.left) / rect.width;
    ratio = Math.max(0, Math.min(1, ratio));
    setSliderPos(ratio);
  };

  const startDrag = (clientX: number) => {
    updatePos(clientX);
    const move = (e: any) => updatePos(e.touches ? e.touches[0].clientX : e.clientX);
    const end = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    window.addEventListener("touchmove", move);
    window.addEventListener("touchend", end);
  };

  function getRenderedImageRect(containerRect: DOMRect, imgW: number, imgH: number) {
    const containerW = containerRect.width;
    const containerH = containerRect.height;
    const imgRatio = imgW / imgH;
    const containerRatio = containerW / containerH;

    let renderW: number, renderH: number;
    if (imgRatio > containerRatio) {
      renderW = containerW;
      renderH = containerW / imgRatio;
    } else {
      renderH = containerH;
      renderW = containerH * imgRatio;
    }

    const offsetX = (containerW - renderW) / 2;
    const offsetY = (containerH - renderH) / 2;
    return { renderW, renderH, offsetX, offsetY };
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-10">
      <header className="flex items-center justify-between pb-6 border-b border-[var(--border)]">
        <h1 className="text-xl font-bold tracking-tight">저조도 이미지 복원 웹 서비스 v0.2.0</h1>
      </header>

      {/* DRAG & DROP 영역 포함 업로드 패널 */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-10 items-start">

        <div className="flex justify-center w-full">
          <div className="w-full max-w-2xl flex flex-col items-center select-none relative">
            {/* Timer */}
            {elapsedTime > 0 && (
              <div className="absolute -top-8 right-0 z-[999]">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-xs text-white shadow-lg">
                  {elapsedTime.toFixed(1)}s
                </div>
              </div>
            )}

            {/* IMAGE SLIDER */}
            <div
              ref={sliderRef}
              className="relative w-full rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--panel)]"
              style={{ height: imgRatio ? `${imgRatio * 600}px` : "400px" }}
            >
              {/* BEFORE */}
              {beforeImg && imgMetaBefore && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    clipPath: afterImg ? `inset(0 ${(1 - sliderPos) * 100}% 0 0)` : "none",
                    zIndex: 20,
                  }}
                >
                  <img src={beforeImg} className="absolute inset-0 w-full h-full object-contain" />
                  {beforeFaces.map((f, idx) => {
                    if (!sliderRef.current) return null;
                    const rect = sliderRef.current.getBoundingClientRect();
                    const { renderW, renderH, offsetX, offsetY } =
                      getRenderedImageRect(rect, imgMetaBefore.width, imgMetaBefore.height);
                  
                    const left = offsetX + f.x * (renderW / imgMetaBefore.width);
                    const top = offsetY + f.y * (renderH / imgMetaBefore.height);
                    const w = f.w * (renderW / imgMetaBefore.width);
                    const h = f.h * (renderH / imgMetaBefore.height);
                  
                    return (
                      <div
                        key={`b-${idx}`}
                        className="absolute animate-pulse rounded-sm"
                        style={{
                          left,
                          top,
                          width: w,
                          height: h,
                          border: "3px solid white",
                          boxShadow: "0 0 14px rgba(255, 255, 255, 1)",
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* AFTER */}
              {afterImg && imgMetaAfter && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ clipPath: `inset(0 0 0 ${sliderPos * 100}%)`, zIndex: 30 }}
                >
                  <img
                    src={afterImg}
                    className="absolute inset-0 w-full h-full object-contain contrast-[1.15] brightness-[1.1] saturate-[1.1]"
                  />
                  {afterFaces.map((f, idx) => {
                    if (!sliderRef.current) return null;
                    const rect = sliderRef.current.getBoundingClientRect();
                    const { renderW, renderH, offsetX, offsetY } =
                      getRenderedImageRect(rect, imgMetaAfter.width, imgMetaAfter.height);
                  
                    const left = offsetX + f.x * (renderW / imgMetaAfter.width);
                    const top = offsetY + f.y * (renderH / imgMetaAfter.height);
                    const w = f.w * (renderW / imgMetaAfter.width);
                    const h = f.h * (renderH / imgMetaAfter.height);
                  
                    return (
                      <div
                        key={`a-${idx}`}
                        className="absolute animate-pulse rounded-sm"
                        style={{
                          left,
                          top,
                          width: w,
                          height: h,
                          border: "3px solid #3b82f6",
                          boxShadow: "0 0 16px rgba(59, 130, 246, 1)",
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* Slider Handle */}
              {afterImg && (
                <div
                  className="absolute top-0 bottom-0 w-[3px] bg-[var(--accent)] shadow-[0_0_15px_var(--accent-glow)] cursor-col-resize z-[999]"
                  style={{ left: `${sliderPos * 100}%` }}
                  onMouseDown={(e) => startDrag(e.clientX)}
                  onTouchStart={(e) => startDrag(e.touches[0].clientX)}
                >
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-8 h-8 rounded-full bg-[var(--accent)] shadow-[0_0_15px_var(--accent-glow)] flex items-center justify-center text-white">
                      ⇆
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 업로드 / Drag & Drop 패널 */}
        <div
          onDragOver={handleDrag}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-xl border-2 p-6 transition-colors ${
            dragActive ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border)] bg-[var(--panel)]"
          }`}
        >
          <h2 className="font-semibold text-lg mb-4">이미지 업로드</h2>

          <label className="block px-4 py-3 text-center bg-[var(--accent)]/15 text-[var(--accent)] rounded-md cursor-pointer border border-[var(--accent)]/40">
            파일 선택하기
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
          </label>

          <div className="text-sm text-gray-300 text-center my-2">또는 이미지를 여기에 드래그하세요</div>

          <label className="mt-4 flex items-center gap-2 text-sm text-gray-200 cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-[var(--accent)]"
              checked={useFaceEnhance}
              onChange={(e) => setUseFaceEnhance(e.target.checked)}
            />
            <span>
              Real-ESRFAN <span className="font-semibold">Face Enhancement</span> 사용
            </span>
          </label>

          <button
            disabled={!beforeImg || loading}
            onClick={runRestore}
            className="w-full px-4 py-2 mt-4 rounded-md bg-[var(--accent)] text-white disabled:bg-gray-600"
          >
            {loading ? "복원 진행 중..." : "복원 실행"}
          </button>

          {afterImg && (
            <a
              href={afterImg}
              download="restored.png"
              className="block w-full px-4 py-2 mt-3 rounded-md bg-[var(--success)] text-[var(--bg)] hover:bg-[var(--success)]/80 font-medium text-center"
            >
              복원된 이미지 다운로드
            </a>
          )}
        </div>
      </div>

      {/* FACE CROPS */}
      {croppedFaces.length > 0 && (
        <div className="w-full flex justify-center mt-10">
          <div className="w-full max-w-5xl">
            <h3 className="text-lg font-semibold mb-3">Detected Faces</h3>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {croppedFaces.map((src, idx) => (
                  <div key={idx} className="relative group">
                    <div className="w-full rounded-lg border border-[var(--border)] bg-black/40 p-1">
                      <img
                        src={src}
                        className="w-full h-auto object-contain rounded-md transition-transform duration-200 group-hover:scale-105"
                      />
                    </div>
                    <div className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">
                      #{idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Policy Button */}
      <button
        onClick={() => setShowPolicy(true)}
        className="fixed bottom-4 right-4 px-3 py-1.5 text-xs rounded-md 
                   bg-[var(--panel)] border border-[var(--border)] text-gray-300 
                   hover:bg-[var(--accent)]/20 hover:text-white transition-colors shadow-lg"
      >
        Privacy Policy
      </button>

      {/* Policy Modal */}
      {showPolicy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="w-[90%] max-w-lg max-h-[80vh] overflow-y-auto 
                          bg-[var(--panel)] border border-[var(--border)] rounded-xl p-6 relative shadow-2xl">
            
            {/* Close Button */}
            <button
              onClick={() => setShowPolicy(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-200"
            >
              ✕
            </button>

            <h2 className="text-lg font-semibold mb-4">Privacy &amp; Data Policy (시연용)</h2>

            <p className="mb-3 text-sm text-gray-300">
              이 웹 서비스는 <span className="font-medium">저조도 이미지 복원 기술 시연</span>을 위해 운영됩니다.
              사용자가 업로드한 이미지는 복원 처리를 위해 서버로 전송되며 일시적으로 저장·처리됩니다.
            </p>

            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300 mb-4">
              <li>
                업로드된 이미지는 오남용 방지 및 장애 분석을 위해 
                최대 <span className="font-medium">30일간</span> 저장될 수 있습니다.
              </li>
              <li>
                저장된 이미지는 시연 목적 외의 용도로 사용되지 않으며,
                재학습·마케팅 등 2차 활용은 이루어지지 않습니다.
              </li>
              <li>
                로그 및 이미지는 보관 기간 이후 자동 삭제됩니다.
              </li>
              <li>
                데이터는 운영 인원에게만 제한적으로 접근 가능하며, 제3자와 공유되지 않습니다.
              </li>
              <li>
                사용자는 타인의 초상권·저작권을 침해하지 않는 이미지만 업로드해야 합니다.
              </li>
            </ul>

            <p className="text-xs text-gray-400">
              본 데모는 상용 서비스가 아니며, 시연 환경에서의 기술 검증을 목적으로 합니다.
              시연 종료 후 관련 로그 및 캐시는 순차적으로 폐기될 수 있습니다. (Last update: 2025-11-30)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
