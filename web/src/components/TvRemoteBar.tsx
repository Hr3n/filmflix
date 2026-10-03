"use client";
import React, { useState } from "react";
import { useDevice } from "@/context/DeviceContext";

export default function TvRemoteBar() {
  const {
    isTvMode,
    toggleTvMode,
    navigateDirection,
    activateCurrentElement,
    showRemoteOverlay,
    phoneConnected,
    setIsPairModalOpen,
  } = useDevice();

  const [expandedPad, setExpandedPad] = useState(false);

  if (!isTvMode && !showRemoteOverlay) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none flex flex-col items-center pb-2 px-4 transition-all duration-300">
      {/* Expandable Virtual D-Pad Controller for testing and touch remote control */}
      {expandedPad && (
        <div className="pointer-events-auto mb-3 p-4 rounded-3xl bg-zinc-950/95 border border-indigo-500/40 shadow-2xl shadow-indigo-500/20 backdrop-blur-2xl animate-in slide-in-from-bottom duration-200 flex flex-col items-center gap-2">
          <div className="flex items-center justify-between w-full pb-2 border-b border-zinc-800 text-xs text-zinc-400">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Virtual TV Remote
            </span>
            <button
              onClick={() => setExpandedPad(false)}
              className="p-1 hover:text-white transition"
              title="Close D-Pad"
            >
              ✕
            </button>
          </div>

          {/* D-Pad Buttons */}
          <div className="grid grid-cols-3 gap-2 p-2">
            <div />
            <button
              onClick={() => navigateDirection("up")}
              className="w-12 h-12 rounded-2xl bg-zinc-800 hover:bg-indigo-600 active:scale-95 text-white flex items-center justify-center font-bold text-lg border border-zinc-700 hover:border-indigo-400 transition-all shadow-md"
              title="D-Pad Up"
            >
              ▲
            </button>
            <div />

            <button
              onClick={() => navigateDirection("left")}
              className="w-12 h-12 rounded-2xl bg-zinc-800 hover:bg-indigo-600 active:scale-95 text-white flex items-center justify-center font-bold text-lg border border-zinc-700 hover:border-indigo-400 transition-all shadow-md"
              title="D-Pad Left"
            >
              ◄
            </button>
            <button
              onClick={() => activateCurrentElement()}
              className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-90 text-white flex items-center justify-center font-bold text-xs border border-indigo-400 transition-all shadow-lg shadow-indigo-600/30"
              title="OK / Enter"
            >
              OK
            </button>
            <button
              onClick={() => navigateDirection("right")}
              className="w-12 h-12 rounded-2xl bg-zinc-800 hover:bg-indigo-600 active:scale-95 text-white flex items-center justify-center font-bold text-lg border border-zinc-700 hover:border-indigo-400 transition-all shadow-md"
              title="D-Pad Right"
            >
              ►
            </button>

            <div />
            <button
              onClick={() => navigateDirection("down")}
              className="w-12 h-12 rounded-2xl bg-zinc-800 hover:bg-indigo-600 active:scale-95 text-white flex items-center justify-center font-bold text-lg border border-zinc-700 hover:border-indigo-400 transition-all shadow-md"
              title="D-Pad Down"
            >
              ▼
            </button>
            <div />
          </div>

          {/* Quick Action Shortcuts */}
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-800 w-full justify-center">
            <button
              onClick={() => setIsPairModalOpen(true)}
              className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md"
            >
              📱 Pair Phone [R]
            </button>
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {});
                  } else {
                    document.documentElement.requestFullscreen().catch(() => {});
                  }
                }
              }}
              className="px-3 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 border border-zinc-700"
            >
              Fullscreen [F]
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-3 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 border border-zinc-700"
            >
              Back [Esc]
            </button>
          </div>
        </div>
      )}

      {/* Floating 10-foot TV Remote Navigation Bar */}
      <div className="pointer-events-auto max-w-4xl w-full mx-auto px-4 py-2 rounded-2xl bg-zinc-950/90 border border-indigo-500/30 shadow-2xl backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Navigation Legend */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar text-zinc-300">
          <span className="flex items-center gap-1.5 font-bold text-indigo-400 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            TV 10-Foot Mode
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800 text-[11px] font-mono">
            ▲▼◄► D-Pad
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800 text-[11px] font-mono">
            [OK] Select
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800 text-[11px] font-mono">
            [ESC] Back
          </span>
        </div>

        {/* Remote Toolbar Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Pair Phone Remote Button */}
          <button
            onClick={() => setIsPairModalOpen(true)}
            data-nav="bar-pair-phone"
            className={`px-3 py-1 rounded-xl font-semibold transition flex items-center gap-1.5 border ${
              phoneConnected
                ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/40"
                : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 shadow-md shadow-indigo-600/20"
            }`}
            title="Pair Phone as TV Remote [Shortcut: R]"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>{phoneConnected ? "Phone Linked 🟢" : "Pair Phone [R]"}</span>
          </button>

          <button
            onClick={() => setExpandedPad(!expandedPad)}
            className={`px-3 py-1 rounded-xl font-medium transition flex items-center gap-1.5 border ${
              expandedPad
                ? "bg-indigo-600 text-white border-indigo-400"
                : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>D-Pad</span>
          </button>

          <button
            onClick={toggleTvMode}
            className="px-3 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition"
            title="Exit TV Mode"
          >
            Exit TV [T]
          </button>
        </div>
      </div>
    </div>
  );
}
