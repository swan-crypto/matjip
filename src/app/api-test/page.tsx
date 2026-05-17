"use client";

import { useState } from "react";

const AREA_CODES = [
  { code: "1", name: "서울" },
  { code: "2", name: "인천" },
  { code: "3", name: "대전" },
  { code: "4", name: "대구" },
  { code: "5", name: "광주" },
  { code: "6", name: "부산" },
  { code: "7", name: "울산" },
  { code: "8", name: "세종" },
  { code: "31", name: "경기" },
  { code: "32", name: "강원" },
  { code: "33", name: "충북" },
  { code: "34", name: "충남" },
  { code: "35", name: "전북" },
  { code: "36", name: "전남" },
  { code: "37", name: "경북" },
  { code: "38", name: "경남" },
  { code: "39", name: "제주" },
];

type Tab = "location" | "area";

export default function ApiTestPage() {
  const [tab, setTab] = useState<Tab>("location");

  // 위치기반
  const [mapX, setMapX] = useState("126.9784");
  const [mapY, setMapY] = useState("37.5665");
  const [radius, setRadius] = useState("1000");
  const [locating, setLocating] = useState(false);

  // 지역기반
  const [areaCode, setAreaCode] = useState("1");
  const [sigunguCode, setSigunguCode] = useState("");

  // 공통
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");

  async function getMyLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMapX(String(pos.coords.longitude));
        setMapY(String(pos.coords.latitude));
        setLocating(false);
      },
      () => {
        setError("위치 권한이 거부되었습니다.");
        setLocating(false);
      }
    );
  }

  async function runTest() {
    setLoading(true);
    setError("");
    setResult(null);

    let params: Record<string, string>;
    let endpoint: string;

    if (tab === "location") {
      if (!mapX || !mapY || !radius) {
        setError("위도, 경도, 반경을 모두 입력해주세요.");
        setLoading(false);
        return;
      }
      endpoint = "locationBasedList2";
      params = { mapX, mapY, radius };
    } else {
      if (!areaCode) {
        setError("시/도를 선택해주세요.");
        setLoading(false);
        return;
      }
      endpoint = "areaBasedList2";
      params = { areaCode, ...(sigunguCode ? { sigunguCode } : {}) };
    }

    try {
      const qs = new URLSearchParams({ endpoint, ...params });
      const res = await fetch(`/api/tour?${qs}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "알 수 없는 오류");
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const items: { title: string; addr1: string; tel: string }[] =
    ((result as { response?: { body?: { items?: { item?: { title: string; addr1: string; tel: string }[] } } } })
      ?.response?.body?.items?.item ?? []);
  const totalCount: number =
    (result as { response?: { body?: { totalCount?: number } } })
      ?.response?.body?.totalCount ?? 0;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-mono">
      <h1 className="text-xl font-bold mb-1 text-yellow-400">한국관광공사 API 테스트</h1>
      <p className="text-gray-400 text-sm mb-6">음식점 (contentTypeId=39) · numOfRows=8</p>

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        {(["location", "area"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setResult(null); setError(""); }}
            className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
              tab === t
                ? "bg-yellow-400 text-gray-900"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {t === "location" ? "위치기반 (locationBasedList2)" : "지역기반 (areaBasedList2)"}
          </button>
        ))}
      </div>

      {/* 입력 */}
      <div className="bg-gray-900 rounded-lg p-5 mb-4 space-y-3 max-w-xl">
        {tab === "location" ? (
          <>
            <div className="flex gap-3 items-end">
              <label className="block flex-1">
                <span className="text-xs text-gray-400">경도 (mapX)</span>
                <input
                  className="mt-1 w-full bg-gray-800 rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-yellow-400"
                  value={mapX}
                  onChange={(e) => setMapX(e.target.value)}
                />
              </label>
              <label className="block flex-1">
                <span className="text-xs text-gray-400">위도 (mapY)</span>
                <input
                  className="mt-1 w-full bg-gray-800 rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-yellow-400"
                  value={mapY}
                  onChange={(e) => setMapY(e.target.value)}
                />
              </label>
              <button
                onClick={getMyLocation}
                disabled={locating}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs disabled:opacity-50"
              >
                {locating ? "가져오는 중…" : "내 위치"}
              </button>
            </div>
            <label className="block">
              <span className="text-xs text-gray-400">반경 (radius, 미터)</span>
              <select
                className="mt-1 w-full bg-gray-800 rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-yellow-400"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
              >
                {["500", "1000", "2000", "3000", "5000"].map((r) => (
                  <option key={r} value={r}>{Number(r).toLocaleString()}m</option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <label className="block">
              <span className="text-xs text-gray-400">시/도 (areaCode)</span>
              <select
                className="mt-1 w-full bg-gray-800 rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-yellow-400"
                value={areaCode}
                onChange={(e) => { setAreaCode(e.target.value); setSigunguCode(""); }}
              >
                {AREA_CODES.map((a) => (
                  <option key={a.code} value={a.code}>{a.name} ({a.code})</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-400">시/군/구 코드 (sigunguCode, 선택)</span>
              <input
                className="mt-1 w-full bg-gray-800 rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-yellow-400"
                placeholder="예: 1 (종로구)"
                value={sigunguCode}
                onChange={(e) => setSigunguCode(e.target.value)}
              />
            </label>
          </>
        )}
      </div>

      <button
        onClick={runTest}
        disabled={loading}
        className="px-6 py-3 bg-red-600 hover:bg-red-500 active:scale-95 rounded-lg font-bold text-sm transition-all disabled:opacity-50 mb-6"
      >
        {loading ? "요청 중…" : "테스트 실행"}
      </button>

      {/* 에러 */}
      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* 결과 요약 */}
      {result && (
        <div className="space-y-4 max-w-2xl">
          <p className="text-sm text-gray-400">
            총 <span className="text-yellow-400 font-bold">{totalCount}</span>건 · 상위 {items.length}개 표시
          </p>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="bg-gray-900 rounded p-3 text-sm">
                <p className="font-semibold text-white">{item.title}</p>
                <p className="text-gray-400 text-xs mt-0.5">{item.addr1}</p>
                {item.tel && <p className="text-gray-500 text-xs">{item.tel}</p>}
              </div>
            ))}
          </div>
          <details className="mt-4">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
              원본 JSON 보기
            </summary>
            <pre className="mt-2 bg-gray-900 rounded p-4 text-xs text-green-400 overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
