"use client";

import { useState, useEffect, useMemo } from "react";
import type { Restaurant } from "@/types";

interface ResultCardProps {
  result: Restaurant;
  onSpinAgain: () => void;
  onRefetch: () => void;
}

interface ConfettiParticle {
  id: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  rotation: number;
  drift: number;
  isCircle: boolean;
}

const CONFETTI_COLORS = ["#facc15", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#f97316"];

export default function ResultCard({ result, onSpinAgain, onRefetch }: ResultCardProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    setShowConfetti(true);
    const id = setTimeout(() => setShowConfetti(false), 3500);
    return () => clearTimeout(id);
  }, [result]);

  const particles = useMemo<ConfettiParticle[]>(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
        delay: Math.random() * 1.2,
        duration: 1.8 + Math.random() * 1.2,
        rotation: Math.random() * 360,
        drift: (Math.random() - 0.5) * 60,
        isCircle: i % 3 === 0,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const kakaoMapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(result.title)}`;

  return (
    <>
      {/* 컨페티 오버레이 */}
      {showConfetti && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
            zIndex: 50,
          }}
        >
          {particles.map((p) => (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: "-20px",
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                borderRadius: p.isCircle ? "50%" : "2px",
                transform: `rotate(${p.rotation}deg)`,
                animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
                "--drift": `${p.drift}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* 결과 카드 */}
      <section className="w-full max-w-sm mt-6">
        <p className="text-[10px] font-mono text-yellow-500/50 tracking-[0.3em] text-center mb-2">
          ▸ WINNER
        </p>
        <div
          className="rounded-2xl border-2 border-yellow-500 overflow-hidden"
          style={{ boxShadow: "0 0 40px #854d0e88" }}
        >
          <div className="h-44 bg-gray-800 relative overflow-hidden">
            {result.firstimage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.firstimage}
                alt={result.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-7xl opacity-20">🍽</span>
              </div>
            )}
            <span
              className="absolute top-3 left-3 px-2 py-0.5 rounded text-xs font-mono font-bold text-gray-900 bg-yellow-400 animate-pulse"
              style={{ textShadow: "0 0 10px #facc15" }}
            >
              JACKPOT!
            </span>
          </div>
          <div className="p-4 bg-gray-900 space-y-1.5">
            <h2 className="text-base font-bold text-white font-mono">{result.title}</h2>
            {result.cat3 && (
              <p className="text-xs text-yellow-400/60 font-mono">{result.cat3}</p>
            )}
            <p className="text-sm text-gray-300">{result.addr1}</p>
            {result.tel && (
              <a
                href={`tel:${result.tel}`}
                className="block text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                📞 {result.tel}
              </a>
            )}
            <a
              href={kakaoMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 mt-3 py-2.5 rounded-lg text-sm font-mono font-bold text-gray-900 bg-yellow-400 hover:bg-yellow-300 active:scale-95 transition-all"
            >
              카카오맵에서 보기 →
            </a>
          </div>
        </div>

        <div className="flex gap-3 mt-3">
          <button
            onClick={onSpinAgain}
            className="flex-1 py-3 rounded-xl font-mono font-bold text-sm text-white active:scale-95 transition-all"
            style={{
              background: "radial-gradient(circle at 40% 35%, #ef4444, #b91c1c)",
              boxShadow: "0 4px 0 #7f1d1d",
              border: "2px solid #dc2626",
            }}
          >
            한 번 더!
          </button>
          <button
            onClick={onRefetch}
            className="flex-1 py-3 rounded-xl font-mono font-bold text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 active:scale-95 transition-all border border-gray-600"
          >
            다른 8곳으로
          </button>
        </div>
      </section>
    </>
  );
}
