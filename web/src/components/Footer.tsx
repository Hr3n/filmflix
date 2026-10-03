"use client";
import React from "react";
import Link from "next/link";
import { useDevice } from "@/context/DeviceContext";

export default function Footer() {
  const { isTvMode, toggleTvMode, setIsPairModalOpen, setIsModeModalOpen, appMode } = useDevice();

  return (
    <footer className="w-full border-t border-zinc-850/80 bg-zinc-950/90 backdrop-blur-xl mt-auto py-8 sm:py-10 px-4 sm:px-6 md:px-8 pb-28 sm:pb-12 text-zinc-400">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand & Tagline */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className="flex items-center gap-2 mb-1.5">
            <img src="/icon.png" alt="FilmFlix" className="w-6 h-6 rounded-lg object-contain border border-pink-500/30 shadow-sm" />
            <span className="font-black text-lg tracking-wider text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
              FILMFLIX
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              v2.0
            </span>
          </div>
          <p className="text-xs text-zinc-500 max-w-sm">
            Next-generation cinema catalog with Live Stream Endpoints, Google Drive On-Demand cloud playback, and Smart TV Phone Remote.
          </p>
        </div>

        {/* Quick Nav & Mode Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <button
            onClick={() => setIsModeModalOpen(true)}
            data-nav="footer-mode-btn"
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition flex items-center gap-1.5 min-h-[36px]"
          >
            <span className="text-sm">⇄</span>
            <span>Mode: <strong className="text-white capitalize">{appMode}</strong></span>
          </button>

          <button
            onClick={() => setIsPairModalOpen(true)}
            data-nav="footer-remote-btn"
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition flex items-center gap-1.5 min-h-[36px]"
          >
            <span>📱</span>
            <span>Phone Remote</span>
          </button>

          <button
            onClick={toggleTvMode}
            data-nav="footer-tv-btn"
            className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 min-h-[36px] ${
              isTvMode
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800"
            }`}
          >
            <span>📺</span>
            <span>TV Mode</span>
          </button>
        </div>

        {/* Creator Attribution with Instagram Link */}
        <div className="flex flex-col items-center md:items-end gap-1.5 text-center md:text-right">
          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
            <span>Created by</span>
            <a
              href="https://www.instagram.com/hr3n/"
              target="_blank"
              rel="noopener noreferrer"
              data-nav="footer-instagram-link"
              className="inline-flex items-center gap-1.5 font-bold text-white hover:text-pink-400 transition-colors px-2.5 py-1 rounded-xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-500/20 hover:border-pink-500/50 group"
              title="Visit Hr3n on Instagram"
            >
              {/* Instagram Gradient Icon */}
              <svg
                className="w-3.5 h-3.5 transition-transform group-hover:scale-110"
                viewBox="0 0 24 24"
                fill="none"
              >
                <defs>
                  <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fdf497" />
                    <stop offset="5%" stopColor="#fdf497" />
                    <stop offset="45%" stopColor="#fd5949" />
                    <stop offset="60%" stopColor="#d6249f" />
                    <stop offset="90%" stopColor="#285AEB" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                  fill="url(#ig-grad)"
                />
              </svg>
              <span className="bg-gradient-to-r from-pink-400 via-rose-300 to-indigo-300 bg-clip-text text-transparent">
                Hr3n
              </span>
              <span className="text-[10px] text-zinc-500 group-hover:text-pink-400 transition-colors">↗</span>
            </a>
          </div>

          <div className="text-[11px] text-zinc-500">
            Follow on Instagram for updates & new releases
          </div>
        </div>
      </div>
    </footer>
  );
}
