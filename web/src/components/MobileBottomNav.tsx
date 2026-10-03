"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDevice } from "@/context/DeviceContext";

interface MobileBottomNavProps {
  mediaFilter?: "all" | "movie" | "tv";
  onSelectFilter?: (filter: "all" | "movie" | "tv") => void;
  onFocusSearch?: () => void;
}

export default function MobileBottomNav({
  mediaFilter = "all",
  onSelectFilter,
  onFocusSearch,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const { isTvMode, toggleTvMode } = useDevice();

  const handleHaptic = () => {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
      }
    } catch {}
  };

  const isWatchPage = pathname.startsWith("/watch");

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-2xl border-t border-zinc-800/80 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 px-3 shadow-2xl"
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Home */}
        <Link
          href="/"
          onClick={() => {
            handleHaptic();
            if (onSelectFilter) onSelectFilter("all");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all ${
            !isWatchPage && mediaFilter === "all"
              ? "text-indigo-400 font-semibold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] tracking-tight">Home</span>
        </Link>

        {/* Movies */}
        <button
          onClick={() => {
            handleHaptic();
            if (isWatchPage) {
              window.location.href = "/?filter=movie";
            } else if (onSelectFilter) {
              onSelectFilter("movie");
            }
          }}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all ${
            !isWatchPage && mediaFilter === "movie"
              ? "text-indigo-400 font-semibold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
          <span className="text-[10px] tracking-tight">Movies</span>
        </button>

        {/* TV Series */}
        <button
          onClick={() => {
            handleHaptic();
            if (isWatchPage) {
              window.location.href = "/?filter=tv";
            } else if (onSelectFilter) {
              onSelectFilter("tv");
            }
          }}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all ${
            !isWatchPage && mediaFilter === "tv"
              ? "text-purple-400 font-semibold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-[10px] tracking-tight">Series</span>
        </button>

        {/* Search */}
        <button
          onClick={() => {
            handleHaptic();
            if (isWatchPage) {
              window.location.href = "/";
            } else if (onFocusSearch) {
              onFocusSearch();
            }
          }}
          className="flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl text-zinc-400 hover:text-zinc-200 transition-all"
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[10px] tracking-tight">Search</span>
        </button>

        {/* TV Mode */}
        <button
          onClick={() => {
            handleHaptic();
            toggleTvMode();
          }}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all ${
            isTvMode
              ? "text-emerald-400 font-semibold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="text-[10px] tracking-tight">{isTvMode ? "TV Active" : "TV Mode"}</span>
        </button>
      </div>
    </nav>
  );
}
