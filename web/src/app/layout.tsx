import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DeviceProvider } from "@/context/DeviceContext";
import TvRemoteBar from "@/components/TvRemoteBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FilmFlix - Movies & TV Series Cinema",
    template: "%s | FilmFlix",
  },
  description: "Browse and stream trending movies and popular TV series seamlessly across mobile phones, desktop, and smart TVs with Live Endpoints & Google Drive On-Demand. Created by Hr3n.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "FilmFlix - Movies & TV Series Cinema",
    description: "Stream movies & series instantly or on-demand to Google Drive. Created by Hr3n.",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "FilmFlix Cinema Logo" }],
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FilmFlix",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <title>FilmFlix - Movies &amp; TV Series Cinema</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" href="/icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 selection:bg-indigo-500 selection:text-white">
        <DeviceProvider>
          {children}
          <TvRemoteBar />
        </DeviceProvider>
      </body>
    </html>
  );
}
