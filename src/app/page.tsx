"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Restaurant, Phase, SearchTab } from "@/types";
import { SIDO_LIST } from "@/data/regions";
import { useSound } from "@/hooks/useSound";
import RouletteWheel from "@/components/RouletteWheel";
import ResultCard from "@/components/ResultCard";
import LocationCard from "@/components/LocationCard";
import RestaurantListPanel from "@/components/RestaurantListPanel";

interface SigunguEntry { code: string; name: string; }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function LEDBezel({ count = 10, alt = false }: { count?: number; alt?: boolean }) {
  return (
    <div className="flex justify-center gap-2 my-2">
      {Array.from({ length: count }, (_, i) => {
        const isAlt = (i % 2 === 0) !== alt;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#facc15",
              animation: `${isAlt ? "ledBlinkAlt" : "ledBlink"} 0.7s ${i * 0.05}s ease-in-out infinite`,
              boxShadow: "0 0 6px #facc15",
            }}
          />
        );
      })}
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<SearchTab>("nearby");
  const [radius, setRadius] = useState("1000");
  const [sidoCode, setSidoCode] = useState("1");
  const [sigunguCode, setSigunguCode] = useState("");
  const [sigunguList, setSigunguList] = useState<SigunguEntry[]>([]);
  const [sigunguLoading, setSigunguLoading] = useState(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [result, setResult] = useState<Restaurant | null>(null);
  const [error, setError] = useState("");
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const rotationRef = useRef(0);
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);

  const { soundEnabled, toggleSound, playTick, playFanfare } = useSound();

  // 시/군/구 동적 페칭
  useEffect(() => {
    if (tab !== "region") return;
    setSigunguCode("");
    setSigunguList([]);
    setSigunguLoading(true);
    const qs = new URLSearchParams({ endpoint: "areaCode2", areaCode: sidoCode, numOfRows: "100", pageNo: "1" });
    fetch(`/api/tour?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        const items = data?.response?.body?.items?.item ?? [];
        setSigunguList(
          (Array.isArray(items) ? items : [items]).map(
            (it: { code: string; name: string }) => ({ code: String(it.code), name: it.name })
          )
        );
      })
      .catch(() => setSigunguList([]))
      .finally(() => setSigunguLoading(false));
  }, [sidoCode, tab]);

  const doFetch = useCallback(
    async (mode: "nearby" | "region") => {
      setPhase("fetching");
      setError("");
      try {
        let qs: URLSearchParams;
        if (mode === "nearby") {
          const loc = locationRef.current!;
          qs = new URLSearchParams({
            endpoint: "locationBasedList2",
            mapX: String(loc.lng), mapY: String(loc.lat),
            radius, numOfRows: "100", pageNo: "1",
          });
        } else {
          qs = new URLSearchParams({
            endpoint: "areaBasedList2",
            areaCode: sidoCode, numOfRows: "100", pageNo: "1",
          });
          if (sigunguCode) qs.set("sigunguCode", sigunguCode);
        }
        const res = await fetch(`/api/tour?${qs}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const items: Restaurant[] = data?.response?.body?.items?.item ?? [];
        const list = Array.isArray(items) ? items : [items];
        if (list.length === 0) {
          setError(mode === "nearby"
            ? "이 근처에서 식당을 찾지 못했어요. 반경을 넓혀보세요."
            : "선택한 지역에서 식당을 찾지 못했어요. 다른 지역을 선택해보세요."
          );
          setPhase(mode === "nearby" ? "located" : "idle");
          return;
        }
        const picked = shuffle(list).slice(0, 8);
        setAllRestaurants(list);
        setRestaurants(picked);
        setResult(null);
        setPhase("ready");
      } catch {
        setError("데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
        setPhase(locationRef.current ? "located" : "idle");
      }
    },
    [radius, sidoCode, sigunguCode]
  );

  function handleLocate() {
    setPhase("locating");
    setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        locationRef.current = { lat: coords.latitude, lng: coords.longitude };
        setPhase("located");
      },
      () => {
        setPhase("idle");
        setTab("region");
        setError("위치 권한이 거부되었습니다. 지역을 직접 선택해 주세요.");
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  }

  function handleTabChange(newTab: SearchTab) {
    if (newTab === tab) return;
    setTab(newTab);
    if (phase !== "spinning") {
      setPhase("idle");
      setAllRestaurants([]);
      setRestaurants([]);
      setResult(null);
      setError("");
      setRotation(0);
      rotationRef.current = 0;
      locationRef.current = null;
    }
  }

  function spin(initialVelocity?: number) {
    if (isSpinning || restaurants.length === 0) return;
    const total = restaurants.length;
    const sliceDeg = 360 / total;
    const targetIdx = Math.floor(Math.random() * total);
    const currentNorm = ((rotationRef.current % 360) + 360) % 360;
    // 슬라이스 중앙(시작점 + sliceDeg/2)에 포인터가 오도록 보정
    const wantedAngle = ((360 - targetIdx * sliceDeg - sliceDeg / 2) % 360 + 360) % 360;
    let diff = wantedAngle - currentNorm;
    if (diff <= 0) diff += 360;
    const extraSpins = initialVelocity
      ? Math.max(3, Math.min(10, Math.abs(initialVelocity) * 4)) * 360
      : 5 * 360;
    const newRot = rotationRef.current + diff + extraSpins;
    rotationRef.current = newRot;
    setResult(restaurants[targetIdx]);
    setPhase("spinning");
    setIsSpinning(true);
    setRotation(newRot);
  }

  function onSpinEnd() {
    setIsSpinning(false);
    setPhase("result");
    playFanfare();
  }

  function handleRefetch() {
    setResult(null);
    if (allRestaurants.length > 0) {
      setRestaurants(shuffle([...allRestaurants]).slice(0, 8));
      setPhase("ready");
    } else if (tab === "nearby" && locationRef.current) {
      doFetch("nearby");
    } else if (tab === "region") {
      doFetch("region");
    }
  }

  function handleReshuffle() {
    if (allRestaurants.length === 0) return;
    setRestaurants(shuffle([...allRestaurants]).slice(0, 8));
    setResult(null);
    if (phase === "result") setPhase("ready");
  }

  function handleSwapIn(r: Restaurant) {
    const alreadyIn = restaurants.some((rr) => rr.title === r.title && rr.addr1 === r.addr1);
    if (alreadyIn) return;
    const idx = Math.floor(Math.random() * restaurants.length);
    const next = [...restaurants];
    next[idx] = r;
    setRestaurants(next);
    setResult(null);
    if (phase === "result") setPhase("ready");
  }

  const loc = locationRef.current;

  const showInsertCoin =
    ["idle", "locating", "located"].includes(phase) ||
    (phase === "fetching" && restaurants.length === 0);

  const showWheel = restaurants.length > 0 && !["idle", "locating", "located"].includes(phase);
  const showResult = phase === "result" && result !== null;

  // 두 컬럼 레이아웃: 룰렛 영역 max-width 확장
  const mainMaxW = showWheel ? "max-w-4xl" : "max-w-sm";

  return (
    <main className={`min-h-screen bg-gray-950 text-white flex flex-col items-center py-8 px-4`}>
      {/* 사운드 토글 */}
      <div className="w-full max-w-4xl flex justify-end mb-1">
        <button
          onClick={toggleSound}
          className="text-xs font-mono text-gray-500 hover:text-yellow-400 transition-colors px-2 py-1"
          aria-label={soundEnabled ? "사운드 끄기" : "사운드 켜기"}
        >
          {soundEnabled ? "🔊 ON" : "🔇 OFF"}
        </button>
      </div>

      {/* 로고 */}
      <div className="mb-6 text-center select-none">
        <div className="text-xs font-mono text-yellow-400/40 tracking-[0.4em] mb-1">★ ★ ★</div>
        <h1
          className="text-3xl sm:text-4xl font-bold font-mono tracking-widest text-yellow-400"
          style={{ textShadow: "0 0 24px #facc15, 0 0 48px #facc15aa" }}
        >
          MATJIP ROULETTE
        </h1>
        <p className="text-xs font-mono text-yellow-400/40 mt-1 tracking-[0.3em]">오늘 뭐 먹지?</p>
      </div>

      {/* 탭 스위처 */}
      <div className={`flex w-full ${mainMaxW} mb-4 rounded-xl overflow-hidden border border-yellow-800/50`}>
        {(["nearby", "region"] as SearchTab[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`flex-1 py-2.5 text-xs font-mono font-bold tracking-widest transition-colors ${
              tab === t ? "bg-yellow-400 text-gray-900" : "bg-gray-900 text-gray-500 hover:text-yellow-400"
            }`}
          >
            {t === "nearby" ? "📍 내 주변" : "🗺 지역 선택"}
          </button>
        ))}
      </div>

      {/* INSERT COIN 섹션 */}
      {showInsertCoin && (
        <section className="w-full max-w-sm">
          <LEDBezel count={10} />
          <p className="text-[10px] font-mono text-yellow-500/50 tracking-[0.3em] text-center mb-2">
            ▸ INSERT COIN
          </p>

          {/* 내 주변 탭 */}
          {tab === "nearby" && (
            <>
              {/* 위치 확인 전 */}
              {phase !== "located" && (
                <div
                  className="rounded-2xl border-2 border-yellow-600 p-6 bg-gray-900/60"
                  style={{ boxShadow: "0 0 30px #854d0e55, inset 0 0 20px #00000044" }}
                >
                  <div className="flex flex-col items-center gap-3">
                    <button
                      onClick={handleLocate}
                      disabled={phase === "locating" || phase === "fetching"}
                      className="w-28 h-28 rounded-full font-mono font-bold text-white text-sm tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-1"
                      style={{
                        background: "radial-gradient(circle at 40% 35%, #ef4444, #b91c1c)",
                        boxShadow: "0 6px 0 #7f1d1d, 0 0 25px #ef444488",
                        border: "3px solid #dc2626",
                      }}
                    >
                      {phase === "locating" ? "위치 확인 중" : "PUSH"}
                    </button>
                    <p className="text-xs text-gray-500 font-mono text-center">
                      {phase === "locating" ? "위치 권한을 허용해 주세요" : "버튼을 눌러 내 위치 확인"}
                    </p>
                  </div>
                </div>
              )}

              {/* 위치 확인 후: 지도 + 반경 선택 */}
              {phase === "located" && loc && (
                <LocationCard
                  lat={loc.lat}
                  lng={loc.lng}
                  radius={radius}
                  onRadiusChange={setRadius}
                  onConfirm={() => doFetch("nearby")}
                  isFetching={false}
                />
              )}

              {/* 페칭 중 (잔존 맵 없을 때) */}
              {phase === "fetching" && restaurants.length === 0 && (
                <div
                  className="rounded-2xl border-2 border-yellow-600 p-8 bg-gray-900/60 flex flex-col items-center gap-3"
                  style={{ boxShadow: "0 0 30px #854d0e55" }}
                >
                  <p className="text-sm font-mono text-yellow-400 animate-pulse">맛집을 불러오는 중…</p>
                </div>
              )}
            </>
          )}

          {/* 지역 선택 탭 */}
          {tab === "region" && (
            <div
              className="rounded-2xl border-2 border-yellow-600 p-6 bg-gray-900/60 space-y-3"
              style={{ boxShadow: "0 0 30px #854d0e55, inset 0 0 20px #00000044" }}
            >
              <p className="text-[10px] font-mono text-gray-500 text-center tracking-widest mb-1">
                SELECT REGION
              </p>
              <select
                value={sidoCode}
                onChange={(e) => { setSidoCode(e.target.value); setSigunguCode(""); }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-yellow-500"
              >
                {SIDO_LIST.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
              <select
                value={sigunguCode}
                onChange={(e) => setSigunguCode(e.target.value)}
                disabled={sigunguLoading || sigunguList.length === 0}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-yellow-500 disabled:opacity-40"
              >
                <option value="">전체 (시/군/구 선택 안함)</option>
                {sigunguLoading && <option disabled>로딩 중…</option>}
                {sigunguList.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
              <div className="flex flex-col items-center gap-3 pt-2">
                <button
                  onClick={() => doFetch("region")}
                  disabled={phase === "fetching"}
                  className="w-28 h-28 rounded-full font-mono font-bold text-white text-sm tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-1"
                  style={{
                    background: "radial-gradient(circle at 40% 35%, #ef4444, #b91c1c)",
                    boxShadow: "0 6px 0 #7f1d1d, 0 0 25px #ef444488",
                    border: "3px solid #dc2626",
                  }}
                >
                  {phase === "fetching" ? "검색 중…" : "PUSH"}
                </button>
                <p className="text-xs text-gray-500 font-mono text-center">
                  {phase === "fetching" ? "맛집을 불러오는 중…" : "지역을 선택 후 버튼을 눌러주세요"}
                </p>
              </div>
            </div>
          )}

          <LEDBezel count={10} alt />
          {error && (
            <p className="mt-3 text-center text-sm text-red-400 font-mono">{error}</p>
          )}
        </section>
      )}

      {/* 룰렛 + 리스트 두 컬럼 */}
      {showWheel && (
        <div className={`w-full ${mainMaxW} flex flex-col lg:flex-row gap-6 items-start justify-center`}>

          {/* 왼쪽: 룰렛 */}
          <div className="flex flex-col items-center lg:w-80 flex-shrink-0 w-full">
            {/* 8곳 미만 배너 */}
            {phase === "ready" && restaurants.length < 8 && (
              <div className="w-full mb-3 px-4 py-3 rounded-xl border border-yellow-600/50 bg-yellow-900/20 text-xs text-yellow-400 font-mono text-center">
                주변에 {restaurants.length}곳의 식당만 발견됐어요.
                <br />
                반경을 넓히거나 다른 지역을 선택해보세요.
              </div>
            )}

            <LEDBezel count={10} />
            <p className="text-[10px] font-mono text-yellow-500/50 tracking-[0.3em] text-center mb-3">
              ▸ ROULETTE
            </p>

            {/* 룰렛 휠 — rounded-full 베젤 */}
            <div
              className="rounded-full border-4 border-yellow-500 p-2 relative"
              style={{ boxShadow: "0 0 50px #854d0e66, 0 0 100px #854d0e33" }}
            >
              {phase === "fetching" && (
                <div className="absolute inset-0 z-10 rounded-full bg-gray-950/70 flex items-center justify-center">
                  <p className="text-xs font-mono text-yellow-400 animate-pulse">로딩 중…</p>
                </div>
              )}
              <RouletteWheel
                restaurants={restaurants}
                rotation={rotation}
                isSpinning={isSpinning}
                canSpin={phase === "ready"}
                onSpin={spin}
                onSpinEnd={onSpinEnd}
                playTick={playTick}
              />
            </div>

            {/* 돌리기 버튼 — rounded-full 베젤 바깥 */}
            {phase === "ready" && (
              <button
                onClick={() => spin()}
                className="mt-5 w-24 h-24 rounded-full font-mono font-bold text-white text-base tracking-widest transition-all active:translate-y-1 hover:brightness-110"
                style={{
                  background: "radial-gradient(circle at 40% 35%, #ef4444, #b91c1c)",
                  boxShadow: "0 6px 0 #7f1d1d, 0 0 25px #ef444488",
                  border: "3px solid #dc2626",
                }}
              >
                돌리기
              </button>
            )}
            {phase === "spinning" && (
              <p className="mt-5 text-sm text-yellow-400 font-mono animate-pulse tracking-widest">
                결과 발표 중…
              </p>
            )}

            <LEDBezel count={10} alt />

            {/* 결과 카드 (모바일: 룰렛 아래 / 데스크톱: 오른쪽 컬럼에서 렌더) */}
            {showResult && (
              <div className="w-full lg:hidden">
                <ResultCard result={result!} onSpinAgain={spin} onRefetch={handleRefetch} />
              </div>
            )}
          </div>

          {/* 오른쪽: 결과 카드(데스크톱) + 식당 목록 */}
          <div className="w-full lg:flex-1 min-w-0 space-y-4">
            {showResult && (
              <div className="hidden lg:block">
                <ResultCard result={result!} onSpinAgain={spin} onRefetch={handleRefetch} />
              </div>
            )}
            <RestaurantListPanel
              allRestaurants={allRestaurants}
              rouletteRestaurants={restaurants}
              onReshuffle={handleReshuffle}
              onSwapIn={handleSwapIn}
            />
          </div>

        </div>
      )}

      <footer className="mt-16 mb-4 text-xs font-mono text-gray-700 text-center">
        데이터 제공: 한국관광공사 · 지도: 카카오맵
      </footer>
    </main>
  );
}
