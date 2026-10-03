"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MediaItem } from "@/app/page";

interface OnDemandDownloadModalProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDownloadStarted?: () => void;
}

export default function OnDemandDownloadModal({
  item,
  isOpen,
  onClose,
  onDownloadStarted,
}: OnDemandDownloadModalProps) {
  const [quality, setQuality] = useState<"1080p" | "720p" | "4K">("1080p");
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [readyFileId, setReadyFileId] = useState<string | null>(null);

  const isTv = item?.media_type === "tv";
  const itemId = item?.imdb_id || (item?.tmdb_id ? String(item.tmdb_id) : "") || item?.title || "";

  // Reset state when opening a new item
  useEffect(() => {
    if (isOpen && item) {
      setDownloading(false);
      setProgress(0);
      setIsCompleted(false);
      setReadyFileId(null);
      setStatusText("");

      // Check if already in drive
      fetch(`/api/ondemand/download?id=${encodeURIComponent(itemId)}${isTv ? `&s=${selectedSeason}&e=${selectedEpisode}` : ""}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.item?.status === "ready") {
            setIsCompleted(true);
            setProgress(100);
            setReadyFileId(data.item.driveFileId || "sample_ready");
            setStatusText("Title already available in your Google Drive Cloud!");
          } else if (data.item?.status === "downloading" || data.item?.status === "uploading_drive") {
            setDownloading(true);
            setProgress(data.item.progressPercent || 20);
            setStatusText(data.item.downloadSpeed || "Downloading in progress...");
          }
        })
        .catch(() => {});
    }
  }, [isOpen, item, itemId, isTv, selectedSeason, selectedEpisode]);

  if (!isOpen || !item) return null;

  const handleStartDownload = async () => {
    setDownloading(true);
    setProgress(5);
    setStatusText("Locating high-bitrate source...");

    try {
      const res = await fetch("/api/ondemand/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: itemId,
          title: item.title,
          media_type: item.media_type || "movie",
          year: item.year,
          poster: item.poster,
          backdrop: item.backdrop,
          plot_overview: item.plot_overview,
          season: isTv ? selectedSeason : undefined,
          episode: isTv ? selectedEpisode : undefined,
          quality,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusText("Download request failed. Please retry.");
        setDownloading(false);
        return;
      }

      if (onDownloadStarted) onDownloadStarted();

      // Poll progress until ready
      const interval = setInterval(async () => {
        try {
          const pollRes = await fetch(
            `/api/ondemand/download?id=${encodeURIComponent(itemId)}${isTv ? `&s=${selectedSeason}&e=${selectedEpisode}` : ""}`
          );
          const pollData = await pollRes.json();
          const currentItem = pollData.item;

          if (currentItem) {
            setProgress(currentItem.progressPercent || 0);

            if (currentItem.status === "downloading") {
              setStatusText(`Downloading: ${currentItem.progressPercent}% (${currentItem.downloadSpeed || "42 MB/s"})`);
            } else if (currentItem.status === "uploading_drive") {
              setStatusText(`Syncing to Google Drive: ${currentItem.progressPercent}%`);
            } else if (currentItem.status === "ready") {
              setProgress(100);
              setIsCompleted(true);
              setDownloading(false);
              setReadyFileId(currentItem.driveFileId);
              setStatusText("Ready in Google Drive! ✓");
              clearInterval(interval);
            }
          }
        } catch {
          // Keep polling
        }
      }, 1000);
    } catch {
      setStatusText("Failed to connect to download engine.");
      setDownloading(false);
    }
  };

  const watchHref = `/watch?id=${encodeURIComponent(itemId)}&title=${encodeURIComponent(item.title)}${
    isTv ? `&type=tv&s=${selectedSeason}&e=${selectedEpisode}` : ""
  }&mode=ondemand${item.imdb_id ? `&imdb_id=${encodeURIComponent(item.imdb_id)}` : ""}${
    item.tmdb_id ? `&tmdb_id=${item.tmdb_id}` : ""
  }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-purple-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          data-nav="ondemand-modal-close"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition border border-zinc-700"
          title="Close (Esc)"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
          </div>
          <div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-600/30 text-purple-300 border border-purple-500/40">
              Watch On-Demand
            </span>
            <h3 className="text-xl font-black text-white truncate max-w-xs sm:max-w-sm mt-0.5">
              {item.title}
            </h3>
          </div>
        </div>

        {/* Media Preview Box */}
        <div className="flex gap-4 p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 mb-5">
          {item.poster && (
            <img
              src={item.poster}
              alt={item.title}
              className="w-16 h-24 object-cover rounded-xl shrink-0 shadow"
            />
          )}
          <div className="flex-1 min-w-0 text-xs text-zinc-300 space-y-1">
            <div className="font-semibold text-white truncate">{item.title}</div>
            <div className="text-zinc-400">
              {item.year ? `${item.year} • ` : ""}
              {isTv ? "TV Series" : "Cinema Film"}
            </div>
            <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
              {item.plot_overview || "Ready to download and sync to your Google Drive cloud archive."}
            </p>
          </div>
        </div>

        {/* TV Series Episode Picker */}
        {isTv && (
          <div className="grid grid-cols-2 gap-3 mb-5 p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                Select Season:
              </label>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {[1, 2, 3, 4, 5].map((s) => (
                  <option key={s} value={s}>
                    Season {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                Select Episode:
              </label>
              <select
                value={selectedEpisode}
                onChange={(e) => setSelectedEpisode(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map((ep) => (
                  <option key={ep} value={ep}>
                    Episode {ep}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Quality Options */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-zinc-300 block mb-2">
            Target Bitrate & Resolution:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["720p", "1080p", "4K"] as const).map((q) => {
              const isSelected = quality === q;
              const estSize = q === "4K" ? "~5.8 GB" : q === "720p" ? "~1.1 GB" : "~2.2 GB";
              return (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  disabled={downloading || isCompleted}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    isSelected
                      ? "bg-purple-600/20 border-purple-500 text-white shadow-md shadow-purple-600/20 font-bold"
                      : "bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  <div className="text-xs">{q}</div>
                  <div className="text-[10px] opacity-75 font-normal">{estSize}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Google Drive Destination */}
        <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 mb-6 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">📁</span>
            <div>
              <span className="text-zinc-400">Target Drive Folder:</span>
              <div className="font-mono text-zinc-200 text-[11px]">FilmFlix On-Demand/{isTv ? "TV Shows/" : "Movies/"}</div>
            </div>
          </div>
          <span className="text-emerald-400 font-bold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Google Drive
          </span>
        </div>

        {/* Progress Bar (when downloading or ready) */}
        {(downloading || isCompleted) && (
          <div className="mb-5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-300">{statusText}</span>
              <span className="font-mono font-bold text-purple-400">{progress}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        {isCompleted ? (
          <Link
            href={watchHref}
            data-nav="play-gdrive-btn"
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm transition-all shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 min-h-[48px]"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play Now from Google Drive
          </Link>
        ) : (
          <button
            onClick={handleStartDownload}
            disabled={downloading}
            data-nav="start-download-btn"
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 min-h-[48px]"
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Downloading to Google Drive...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Download & Save to Google Drive
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
