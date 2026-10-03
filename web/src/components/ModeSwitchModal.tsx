"use client";
import React from "react";
import { useDevice } from "@/context/DeviceContext";

interface ModeSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModeSwitchModal({ isOpen, onClose }: ModeSwitchModalProps) {
  const { appMode, setAppMode } = useDevice();

  if (!isOpen) return null;

  const selectMode = (mode: "stream" | "ondemand") => {
    setAppMode(mode);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          data-nav="mode-modal-close"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition border border-zinc-700"
          title="Close (Esc)"
        >
          ✕
        </button>

        <div className="text-center max-w-md mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold mb-3">
            FilmFlix Viewing Experience
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Choose Your Playback Mode
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Switch anytime from the header or settings.
          </p>
        </div>

        {/* 2 Modes Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mode 1: Instant Live Stream */}
          <div
            onClick={() => selectMode("stream")}
            className={`p-6 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
              appMode === "stream"
                ? "bg-zinc-950 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xl shadow-indigo-500/10"
                : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-950/90"
            }`}
          >
            {appMode === "stream" && (
              <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white uppercase tracking-wider">
                Current
              </span>
            )}

            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>

              <h3 className="text-lg font-bold text-white mb-1.5 flex items-center gap-1.5">
                ⚡ Mode 1: Instant Stream
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Watch immediately through multi-server live video embed endpoints.
              </p>

              <ul className="space-y-2 text-xs text-zinc-300 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Instant click-and-play
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> 0 storage space required
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Multi-server provider fallback
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Anti-popup shield protection
                </li>
              </ul>
            </div>

            <button
              onClick={() => selectMode("stream")}
              data-nav="choose-mode-stream"
              className={`w-full py-3 rounded-2xl font-bold text-xs transition ${
                appMode === "stream"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700"
              }`}
            >
              {appMode === "stream" ? "Active Mode" : "Switch to Instant Stream"}
            </button>
          </div>

          {/* Mode 2: Watch On-Demand (Google Drive) */}
          <div
            onClick={() => selectMode("ondemand")}
            className={`p-6 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
              appMode === "ondemand"
                ? "bg-zinc-950 border-purple-500 ring-2 ring-purple-500/30 shadow-xl shadow-purple-500/10"
                : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-950/90"
            }`}
          >
            {appMode === "ondemand" && (
              <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white uppercase tracking-wider">
                Current
              </span>
            )}

            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>

              <h3 className="text-lg font-bold text-white mb-1.5 flex items-center gap-1.5">
                ☁️ Mode 2: Watch On-Demand
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Download titles to your personal Google Drive for buffer-free playback.
              </p>

              <ul className="space-y-2 text-xs text-zinc-300 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Saves directly to your Google Drive
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Full 1080p / 4K buffer-free bitrate
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Permanent personal cloud library
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Native Google Drive video player
                </li>
              </ul>
            </div>

            <button
              onClick={() => selectMode("ondemand")}
              data-nav="choose-mode-ondemand"
              className={`w-full py-3 rounded-2xl font-bold text-xs transition ${
                appMode === "ondemand"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30"
                  : "bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700"
              }`}
            >
              {appMode === "ondemand" ? "Active Mode" : "Switch to Google Drive"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
