"use client";

import { useState, useRef, useCallback } from "react";

interface UseSoundReturn {
  soundEnabled: boolean;
  toggleSound: () => void;
  playTick: () => void;
  playFanfare: () => void;
}

export function useSound(): UseSoundReturn {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("matjip_sound");
    return stored === null ? true : stored === "true";
  });

  const audioCtxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("matjip_sound", String(next));
      return next;
    });
  }, []);

  const playTick = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 900;
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.045);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // 사운드 실패는 무시
    }
  }, [soundEnabled, getCtx]);

  const playFanfare = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getCtx();
      const notes = [523, 659, 784];

      // 3음 순차 재생
      notes.forEach((freq, i) => {
        const offset = i * 0.24;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.25, ctx.currentTime + offset);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + offset + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.20);
      });

      // 마지막 동시 코드
      notes.forEach((freq) => {
        const offset = 0.72;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime + offset);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + offset + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.55);
      });
    } catch {
      // 사운드 실패는 무시
    }
  }, [soundEnabled, getCtx]);

  return { soundEnabled, toggleSound, playTick, playFanfare };
}
