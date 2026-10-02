"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function VideoPlayer() {
  const searchParams = useSearchParams();
  const title = searchParams.get("title") || "Unknown Video";
  const videoUrl = searchParams.get("url");

  if (!videoUrl) {
    return (
      <div className="text-center mt-20">
        <p className="text-red-500 mb-4">Error: No video URL provided.</p>
        <Link href="/" className="text-white underline">Go Back</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Top Bar */}
      <div className="p-4 flex items-center gap-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10 transition-opacity">
        <Link href="/" className="text-zinc-300 hover:text-white transition">
          ← Back
        </Link>
        <h1 className="font-semibold text-lg">{title}</h1>
      </div>

      {/* Video Player */}
      <div className="flex-1 flex items-center justify-center bg-black">
        <video 
          controls 
          autoPlay 
          className="w-full h-full max-h-screen object-contain"
          src={videoUrl}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-black text-white">Loading...</div>}>
      <VideoPlayer />
    </Suspense>
  );
}
