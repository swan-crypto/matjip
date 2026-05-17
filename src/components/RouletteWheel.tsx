"use client";

import { useRef, useEffect, useState } from "react";
import type { Restaurant } from "@/types";

interface RouletteWheelProps {
  restaurants: Restaurant[];
  rotation: number;
  isSpinning: boolean;
  canSpin: boolean;
  onSpin: (velocity?: number) => void;
  onSpinEnd: () => void;
  playTick: () => void;
}

const SLICE_COLORS = [
  "#9b2335", "#c0392b", "#7B3F00", "#B8860B",
  "#1a5c38", "#27ae60", "#1a3a6b", "#2471a3",
];

const CX = 250, CY = 250, R = 210;
const toRad = (d: number) => (d * Math.PI) / 180;

function getSlicePath(i: number, total: number): string {
  const deg = 360 / total;
  const s = i * deg - 90;
  const e = s + deg;
  const x1 = CX + R * Math.cos(toRad(s));
  const y1 = CY + R * Math.sin(toRad(s));
  const x2 = CX + R * Math.cos(toRad(e));
  const y2 = CY + R * Math.sin(toRad(e));
  return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`;
}

export default function RouletteWheel({
  restaurants,
  rotation,
  isSpinning,
  canSpin,
  onSpin,
  onSpinEnd,
  playTick,
}: RouletteWheelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const dragRef = useRef<{
    active: boolean;
    lastAngle: number;
    lastTime: number;
    totalOffset: number;
    angularVelocity: number;
    deltaHistory: Array<{ dAngle: number; dt: number }>;
  } | null>(null);

  const prevRotationRef = useRef(rotation);
  const lastTickSliceRef = useRef(-1);

  // 째깍 소리: 스핀 중 진행도 시뮬레이션
  useEffect(() => {
    if (!isSpinning) {
      prevRotationRef.current = rotation;
      return;
    }
    const startRot = prevRotationRef.current;
    const endRot = rotation;
    const totalDeg = endRot - startRot;
    const duration = 4000;
    const startTime = performance.now();
    const sliceDeg = 360 / restaurants.length;

    const id = setInterval(() => {
      const elapsed = performance.now() - startTime;
      if (elapsed >= duration) { clearInterval(id); return; }
      const t = elapsed / duration;
      const easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const norm = (((startRot + totalDeg * easedT) % 360) + 360) % 360;
      const slice = Math.floor(norm / sliceDeg);
      if (slice !== lastTickSliceRef.current) {
        playTick();
        lastTickSliceRef.current = slice;
      }
    }, 80);
    return () => clearInterval(id);
  }, [isSpinning]); // eslint-disable-line react-hooks/exhaustive-deps

  function getPointerAngle(e: React.PointerEvent, svgEl: SVGSVGElement): number {
    const rect = svgEl.getBoundingClientRect();
    return Math.atan2(
      e.clientY - rect.top - rect.height / 2,
      e.clientX - rect.left - rect.width / 2
    ) * (180 / Math.PI);
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (!canSpin || isSpinning) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const angle = getPointerAngle(e, e.currentTarget);
    dragRef.current = {
      active: true,
      lastAngle: angle,
      lastTime: e.timeStamp,
      totalOffset: 0,
      angularVelocity: 0,
      deltaHistory: [],
    };
    setIsDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragRef.current?.active) return;
    const currentAngle = getPointerAngle(e, e.currentTarget);
    let dAngle = currentAngle - dragRef.current.lastAngle;
    if (dAngle > 180) dAngle -= 360;
    if (dAngle < -180) dAngle += 360;
    const dt = e.timeStamp - dragRef.current.lastTime;
    if (dt > 0) {
      dragRef.current.deltaHistory.push({ dAngle, dt });
      if (dragRef.current.deltaHistory.length > 5) dragRef.current.deltaHistory.shift();
      const recent = dragRef.current.deltaHistory.slice(-3);
      const totalDt = recent.reduce((s, d) => s + d.dt, 0);
      const totalDA = recent.reduce((s, d) => s + d.dAngle, 0);
      dragRef.current.angularVelocity = totalDt > 0 ? totalDA / totalDt : 0;
    }
    dragRef.current.lastAngle = currentAngle;
    dragRef.current.lastTime = e.timeStamp;
    dragRef.current.totalOffset += dAngle;
    setDragOffset(dragRef.current.totalOffset);
  }

  function handlePointerUp() {
    if (!dragRef.current?.active) return;
    dragRef.current.active = false;
    const velocity = dragRef.current.angularVelocity;
    dragRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
    if (Math.abs(velocity) > 0.08) {
      onSpin(velocity);
    }
  }

  const displayRotation = rotation + (isDragging ? dragOffset : 0);
  const total = restaurants.length;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 500 500"
      className="w-64 h-64 sm:w-72 sm:h-72 block"
      style={{
        touchAction: "none",
        cursor: canSpin && !isSpinning ? (isDragging ? "grabbing" : "grab") : "default",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <g
        style={{
          transformOrigin: "250px 250px",
          transform: `rotate(${displayRotation}deg)`,
          transition: isSpinning
            ? "transform 4s cubic-bezier(0.17,0.67,0.12,0.99)"
            : "none",
        }}
        onTransitionEnd={onSpinEnd}
      >
        {restaurants.map((r, i) => {
          const sliceDeg = 360 / total;
          const midAngle = i * sliceDeg + sliceDeg / 2 - 90;
          const tr = R * 0.63;
          const tx = CX + tr * Math.cos(toRad(midAngle));
          const ty = CY + tr * Math.sin(toRad(midAngle));
          const label = r.title.length > 5 ? r.title.slice(0, 4) + "…" : r.title;
          return (
            <g key={i}>
              <path
                d={getSlicePath(i, total)}
                fill={SLICE_COLORS[i % SLICE_COLORS.length]}
                stroke="#1a1a1a"
                strokeWidth="2"
              />
              <text
                transform={`translate(${tx},${ty}) rotate(${midAngle + 90})`}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.92)"
                fontSize="14"
                fontFamily="monospace"
                fontWeight="bold"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {label}
              </text>
            </g>
          );
        })}
        <circle cx={CX} cy={CY} r="30" fill="#111" stroke="#facc15" strokeWidth="2.5" />
        <text
          x={CX} y={CY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#facc15"
          fontSize="9"
          fontFamily="monospace"
          fontWeight="bold"
          style={{ userSelect: "none" }}
        >
          SPIN
        </text>
      </g>
      {/* 고정 포인터 */}
      <polygon
        points="250,5 240,28 260,28"
        fill="#facc15"
        style={{ filter: "drop-shadow(0 0 8px #facc15)" }}
      />
    </svg>
  );
}
