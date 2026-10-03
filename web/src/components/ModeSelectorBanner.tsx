"use client";
import React from "react";
import { useDevice } from "@/context/DeviceContext";

export default function ModeSelectorBanner() {
  const { appMode, setAppMode, setIsModeModalOpen } = useDevice();

  return (
    <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-zinc-900/90 via-zinc-900/70 to-zinc-950 border border-zinc-800 shadow-xl backdrop-blur-xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Info */}
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                appMode === "ondemand"
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                  : "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
              }`}
            >
              Active Mode: {appMode === "ondemand" ? "☁️ Google Drive On-Demand" : "⚡ Instant Live Stream"}
            </span>
            <button
              onClick={() => setIsModeModalOpen(true)}
              className="text-[11px] text-zinc-400 hover:text-white underline underline-offset-2 transition"
            >
              Compare Modes
            </button>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white">
            {appMode === "ondemand"
              ? "Watch On-Demand from your Google Drive Cloud"
              : "Instant Cinema Streaming via Video Endpoints"}
          </h3>

          <p className="text-xs text-zinc-400 leading-relaxed">
            {appMode === "ondemand"
              ? "Titles are downloaded and saved directly to your personal Google Drive for highest quality, buffer-free playback and permanent cloud storage."
              : "Play any movie or series instantly through multi-server video endpoints with zero storage or download required."}
          </p>
        </div>

        {/* Right Mode Switcher Tabs */}
        <div className="flex items-center gap-2 bg-zinc-950/80 p-1.5 rounded-2xl border border-zinc-800 w-full sm:w-auto">
          {/* Mode 1: Instant Live Stream */}
          <button
            onClick={() => setAppMode("stream")}
            data-nav="mode-btn-stream"
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 min-h-[42px] ${
              appMode === "stream"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <svg className="w-4 h-4 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <div className="text-left">
              <div className="leading-tight">Instant Stream</div>
              <div className="text-[9px] opacity-75 font-normal">Live Endpoints</div>
            </div>
          </button>

          {/* Mode 2: Google Drive On-Demand */}
          <button
            onClick={() => setAppMode("ondemand")}
            data-nav="mode-btn-ondemand"
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 min-h-[42px] ${
              appMode === "ondemand"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            <div className="text-left">
              <div className="leading-tight">Watch On-Demand</div>
              <div className="text-[9px] opacity-75 font-normal">Google Drive Cloud</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
