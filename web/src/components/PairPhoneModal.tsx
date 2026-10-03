"use client";
import React, { useEffect, useState, useMemo } from "react";
import { generateQRCodeSVG } from "@/lib/qr";
import { useDevice } from "@/context/DeviceContext";

interface PairPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PairPhoneModal({ isOpen, onClose }: PairPhoneModalProps) {
  const { tvPairingCode, phoneConnected, generateNewPairingCode } = useDevice();
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const remoteUrl = useMemo(() => {
    if (!tvPairingCode || !origin) return "";
    return `${origin}/remote?code=${tvPairingCode}`;
  }, [tvPairingCode, origin]);

  const qrSvg = useMemo(() => {
    if (!remoteUrl) return "";
    return generateQRCodeSVG(remoteUrl, 180);
  }, [remoteUrl]);

  if (!isOpen) return null;

  const formattedCode = tvPairingCode
    ? `${tvPairingCode.slice(0, 3)} ${tvPairingCode.slice(3)}`
    : "------";

  const handleCopy = () => {
    if (remoteUrl && navigator.clipboard) {
      navigator.clipboard.writeText(remoteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-indigo-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl shadow-indigo-500/20 relative animate-in zoom-in-95 duration-200 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          data-nav="pair-modal-close"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition border border-zinc-700"
          title="Close (Esc)"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Connect Phone Remote</h2>
        </div>

        <p className="text-xs text-zinc-400 mb-5 max-w-xs mx-auto">
          Control this TV from your phone browser without Chromecast or installing any app!
        </p>

        {/* Pairing Code Big Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">
            TV Pairing Code
          </div>
          <div className="text-4xl sm:text-5xl font-mono font-black text-indigo-400 tracking-wider select-all py-1 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            {formattedCode}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Open <strong className="text-zinc-300">/remote</strong> on your phone and enter this code
          </div>
        </div>

        {/* QR Code */}
        {qrSvg && (
          <div className="flex flex-col items-center justify-center mb-5">
            <div
              className="p-3 bg-white rounded-2xl shadow-xl w-44 h-44 flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <span className="text-[11px] text-zinc-400 mt-2 font-medium">
              Scan with your phone camera to pair instantly
            </span>
          </div>
        )}

        {/* Connection Status Indicator */}
        <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 mb-5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              phoneConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-ping"
            }`}
          />
          <span className="text-xs font-semibold text-zinc-300">
            {phoneConnected ? "Phone Connected & Ready! 🟢" : "Waiting for phone to connect..."}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 justify-center">
          <button
            onClick={generateNewPairingCode}
            data-nav="pair-new-code"
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition"
          >
            New Code
          </button>
          <button
            onClick={handleCopy}
            data-nav="pair-copy-url"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition shadow-lg shadow-indigo-600/20"
          >
            {copied ? "Link Copied! ✓" : "Copy Remote Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
