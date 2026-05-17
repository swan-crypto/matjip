"use client";

import { useState, useEffect } from "react";

const RADII = [
  { label: "500m", value: "500" },
  { label: "1km",  value: "1000" },
  { label: "2km",  value: "2000" },
  { label: "5km",  value: "5000" },
];

interface LocationCardProps {
  lat: number;
  lng: number;
  radius: string;
  onRadiusChange: (r: string) => void;
  onConfirm: () => void;
  isFetching: boolean;
}

export default function LocationCard({
  lat, lng, radius, onRadiusChange, onConfirm, isFetching,
}: LocationCardProps) {
  const [address, setAddress] = useState("주소 확인 중…");

  useEffect(() => {
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ko`,
      { headers: { "Accept-Language": "ko" } }
    )
      .then((r) => r.json())
      .then((data) => {
        const a = data.address || {};
        const parts = [
          a.city || a.county || a.town || a.village || "",
          a.suburb || a.neighbourhood || a.borough || a.quarter || "",
        ].filter(Boolean);
        setAddress(parts.length > 0 ? parts.join(" ") : (data.display_name?.split(",")[0] ?? "위치 확인됨"));
      })
      .catch(() => setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`));
  }, [lat, lng]);

  // OSM 임베드: bbox = 반경의 1.6배 영역
  const radiusM = parseInt(radius);
  const SCALE = 1.6;
  const latDelta = (radiusM * SCALE) / 111000;
  const lngDelta = latDelta / Math.cos((lat * Math.PI) / 180);
  const bbox = [lng - lngDelta, lat - latDelta, lng + lngDelta, lat + latDelta].join(",");
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  const circlePct = (1 / SCALE) * 100; // ≈ 62.5%

  return (
    <div
      className="rounded-2xl border-2 border-yellow-600 bg-gray-900/60 overflow-hidden"
      style={{ boxShadow: "0 0 30px #854d0e55, inset 0 0 20px #00000044" }}
    >
      {/* 지도 + 반경 원형 오버레이 */}
      <div className="relative w-full h-44">
        <iframe
          src={osmUrl}
          className="absolute inset-0 w-full h-full border-0"
          loading="lazy"
          title="위치 지도"
        />
        {/* 반경 원형 오버레이 */}
        <div
          className="absolute pointer-events-none rounded-full border-2 border-yellow-400/70"
          style={{
            width: `${circlePct}%`,
            height: `${circlePct}%`,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(250, 204, 21, 0.07)",
            boxShadow: "0 0 0 1px rgba(250,204,21,0.2)",
          }}
        />
        {/* 반경 라벨 */}
        <span
          className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-gray-900 bg-yellow-400"
        >
          반경 {radiusM >= 1000 ? `${radiusM / 1000}km` : `${radiusM}m`}
        </span>
      </div>

      {/* 주소 + 반경 선택 + 버튼 */}
      <div className="p-4 space-y-4">
        <p className="text-sm font-mono text-white">
          <span className="text-yellow-400">📍</span> {address}
        </p>

        <div>
          <p className="text-[10px] font-mono text-gray-500 tracking-widest mb-2">SEARCH RADIUS</p>
          <div className="flex gap-2">
            {RADII.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => onRadiusChange(value)}
                className={`flex-1 py-1.5 rounded text-xs font-mono font-bold transition-all border ${
                  radius === value
                    ? "bg-yellow-400 text-gray-900 border-yellow-400"
                    : "bg-gray-800 text-gray-400 border-gray-700 hover:border-yellow-600 hover:text-yellow-400"
                }`}
                style={radius === value ? { boxShadow: "0 0 10px #facc1588" } : {}}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={onConfirm}
            disabled={isFetching}
            className="w-24 h-24 rounded-full font-mono font-bold text-white text-sm tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-1"
            style={{
              background: "radial-gradient(circle at 40% 35%, #ef4444, #b91c1c)",
              boxShadow: "0 6px 0 #7f1d1d, 0 0 25px #ef444488",
              border: "3px solid #dc2626",
            }}
          >
            {isFetching ? "검색 중…" : "PUSH"}
          </button>
        </div>
      </div>
    </div>
  );
}
