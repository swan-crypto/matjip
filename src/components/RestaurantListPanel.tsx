"use client";

import { useMemo, useState } from "react";
import type { Restaurant } from "@/types";

interface RestaurantListPanelProps {
  allRestaurants: Restaurant[];
  rouletteRestaurants: Restaurant[];
  onReshuffle: () => void;
  onSwapIn: (r: Restaurant) => void;
}

function key(r: Restaurant) {
  return `${r.title}|${r.addr1}`;
}

export default function RestaurantListPanel({
  allRestaurants,
  rouletteRestaurants,
  onReshuffle,
  onSwapIn,
}: RestaurantListPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const rouletteKeys = useMemo(
    () => new Set(rouletteRestaurants.map(key)),
    [rouletteRestaurants]
  );

  const isInRoulette = (r: Restaurant) => rouletteKeys.has(key(r));

  // 룰렛 포함 항목 먼저, 나머지 뒤로
  const sorted = useMemo(
    () => [
      ...allRestaurants.filter((r) => isInRoulette(r)),
      ...allRestaurants.filter((r) => !isInRoulette(r)),
    ],
    [allRestaurants, rouletteKeys] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div
      className="w-full rounded-2xl border-2 border-yellow-600/50 bg-gray-900/60 overflow-hidden"
      style={{ boxShadow: "0 0 20px #854d0e33" }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-600/20">
        <p className="text-[10px] font-mono text-yellow-500/70 tracking-[0.3em]">
          ▸ RESTAURANTS{" "}
          <span className="text-yellow-400/50">({allRestaurants.length}곳)</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onReshuffle}
            className="text-[10px] font-mono text-yellow-400 hover:text-yellow-300 transition-colors px-2 py-1 border border-yellow-600/40 rounded hover:border-yellow-400/60"
          >
            🎰 다시 뽑기
          </button>
          {/* 모바일 토글 */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="lg:hidden text-xs font-mono text-gray-500 hover:text-yellow-400 transition-colors px-1"
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {/* 범례 */}
      <div className="hidden lg:flex items-center gap-3 px-4 py-2 border-b border-gray-800/50">
        <span className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
          룰렛 포함
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
          <span className="w-2 h-2 rounded-full bg-gray-600 inline-block" />
          클릭 시 교체
        </span>
      </div>

      {/* 목록 */}
      <div
        className={`overflow-y-auto transition-all ${
          expanded ? "max-h-64" : "max-h-0 lg:max-h-[420px]"
        }`}
      >
        {sorted.map((r, i) => {
          const inRoulette = isInRoulette(r);
          const addrShort = r.addr1.split(" ").slice(0, 3).join(" ");
          return (
            <div
              key={i}
              onClick={() => !inRoulette && onSwapIn(r)}
              className={`flex items-start gap-3 px-4 py-2.5 border-b border-gray-800/30 transition-all ${
                inRoulette
                  ? "bg-yellow-900/20"
                  : "hover:bg-gray-800/60 cursor-pointer"
              }`}
            >
              <span
                className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  inRoulette ? "bg-yellow-400" : "bg-gray-600"
                }`}
                style={inRoulette ? { boxShadow: "0 0 6px #facc15" } : {}}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-bold truncate ${
                    inRoulette ? "text-yellow-100" : "text-gray-300"
                  }`}
                >
                  {r.title}
                </p>
                <p className="text-[11px] text-gray-500 font-mono truncate">{addrShort}</p>
              </div>
              {inRoulette && (
                <span className="flex-shrink-0 text-[9px] font-mono text-yellow-500/70 bg-yellow-900/40 px-1.5 py-0.5 rounded mt-1">
                  IN
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 모바일: 접힌 상태 요약 */}
      {!expanded && (
        <div
          className="lg:hidden flex items-center justify-center gap-2 py-2.5 cursor-pointer"
          onClick={() => setExpanded(true)}
        >
          {rouletteRestaurants.slice(0, 4).map((r, i) => (
            <span
              key={i}
              className="text-[10px] font-mono text-yellow-400/70 truncate max-w-[60px]"
            >
              {r.title.slice(0, 4)}
            </span>
          ))}
          {rouletteRestaurants.length > 4 && (
            <span className="text-[10px] font-mono text-gray-600">
              +{rouletteRestaurants.length - 4}
            </span>
          )}
          <span className="text-[10px] font-mono text-gray-500 ml-1">목록 보기 ▼</span>
        </div>
      )}
    </div>
  );
}
