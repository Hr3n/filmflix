"use client";
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import PairPhoneModal from "@/components/PairPhoneModal";
import ModeSwitchModal from "@/components/ModeSwitchModal";

export type AppMode = "stream" | "ondemand";

interface DeviceContextType {
  isTvMode: boolean;
  isMobile: boolean;
  toggleTvMode: () => void;
  setTvMode: (value: boolean) => void;
  showRemoteOverlay: boolean;
  setShowRemoteOverlay: (value: boolean) => void;
  navigateDirection: (direction: "up" | "down" | "left" | "right") => void;
  activateCurrentElement: () => void;
  // Phone remote pairing
  tvPairingCode: string;
  phoneConnected: boolean;
  isPairModalOpen: boolean;
  setIsPairModalOpen: (val: boolean) => void;
  generateNewPairingCode: () => Promise<string>;
  // App Mode: Live Stream vs Google Drive On-Demand
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  toggleAppMode: () => void;
  isModeModalOpen: boolean;
  setIsModeModalOpen: (val: boolean) => void;
}

const DeviceContext = createContext<DeviceContextType>({
  isTvMode: false,
  isMobile: false,
  toggleTvMode: () => {},
  setTvMode: () => {},
  showRemoteOverlay: false,
  setShowRemoteOverlay: () => {},
  navigateDirection: () => {},
  activateCurrentElement: () => {},
  tvPairingCode: "",
  phoneConnected: false,
  isPairModalOpen: false,
  setIsPairModalOpen: () => {},
  generateNewPairingCode: async () => "",
  appMode: "stream",
  setAppMode: () => {},
  toggleAppMode: () => {},
  isModeModalOpen: false,
  setIsModeModalOpen: () => {},
});

export const useDevice = () => useContext(DeviceContext);

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [isTvMode, setIsTvModeState] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showRemoteOverlay, setShowRemoteOverlay] = useState(false);
  const [tvPairingCode, setTvPairingCode] = useState<string>("");
  const [phoneConnected, setPhoneConnected] = useState<boolean>(false);
  const [isPairModalOpen, setIsPairModalOpen] = useState<boolean>(false);
  const [appMode, setAppModeState] = useState<AppMode>("stream");
  const [isModeModalOpen, setIsModeModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("filmflix_app_mode");
      if (savedMode === "ondemand" || savedMode === "stream") {
        setAppModeState(savedMode);
      }
    }
  }, []);

  const setAppMode = useCallback((mode: AppMode) => {
    setAppModeState(mode);
    try {
      localStorage.setItem("filmflix_app_mode", mode);
    } catch {}
  }, []);

  const toggleAppMode = useCallback(() => {
    setAppMode(appMode === "stream" ? "ondemand" : "stream");
  }, [appMode, setAppMode]);

  const activeFocusRef = useRef<HTMLElement | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  // Generate or retrieve TV pairing code
  const generateNewPairingCode = useCallback(async (): Promise<string> => {
    try {
      const res = await fetch("/api/remote/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success && data.code) {
        setTvPairingCode(data.code);
        try {
          localStorage.setItem("filmflix_tv_code", data.code);
        } catch {}
        return data.code;
      }
    } catch (err) {
      console.error("Failed to generate TV pairing code:", err);
    }
    return "";
  }, []);

  // Detect TV or Mobile device on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = navigator.userAgent || "";
    const isTvUserAgent = /SmartTV|Tizen|Web0S|Android TV|GoogleTV|AppleTV|HbbTV|BRAVIA|Roku|Viera|NetCast|Xbox|PlayStation/i.test(ua);
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isSmallScreen = window.innerWidth < 768;

    setIsMobile(isMobileUserAgent || isSmallScreen);

    // Check saved preference
    const savedMode = localStorage.getItem("filmflix_tv_mode");
    if (savedMode !== null) {
      const parsed = savedMode === "true";
      setIsTvModeState(parsed);
      if (parsed) {
        document.documentElement.classList.add("tv-mode");
      }
    } else if (isTvUserAgent) {
      setIsTvModeState(true);
      document.documentElement.classList.add("tv-mode");
    }

    // Initialize or load TV pairing code
    const savedCode = localStorage.getItem("filmflix_tv_code");
    if (savedCode && savedCode.length === 6) {
      setTvPairingCode(savedCode);
      // Re-register session on server
      fetch("/api/remote/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: savedCode }),
      }).catch(() => {});
    } else {
      generateNewPairingCode();
    }

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768 || isMobileUserAgent);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [generateNewPairingCode]);

  const setTvMode = useCallback((val: boolean) => {
    setIsTvModeState(val);
    try {
      localStorage.setItem("filmflix_tv_mode", String(val));
    } catch {}
    if (val) {
      document.documentElement.classList.add("tv-mode");
    } else {
      document.documentElement.classList.remove("tv-mode");
    }
  }, []);

  const toggleTvMode = useCallback(() => {
    setTvMode(!isTvMode);
  }, [isTvMode, setTvMode]);

  // Spatial Navigation function
  const navigateDirection = useCallback((direction: "up" | "down" | "left" | "right") => {
    if (typeof document === "undefined") return;

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-nav], button:not([disabled]):not([tabindex="-1"]), a[href]:not([tabindex="-1"]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex="0"]'
      )
    ).filter((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null;
    });

    if (elements.length === 0) return;

    let current = document.activeElement as HTMLElement | null;
    if (!current || !elements.includes(current)) {
      current = elements[0];
      current.focus();
      current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      activeFocusRef.current = current;
      return;
    }

    const curRect = current.getBoundingClientRect();
    const curCenter = {
      x: curRect.left + curRect.width / 2,
      y: curRect.top + curRect.height / 2,
    };

    let bestCandidate: HTMLElement | null = null;
    let minDistance = Infinity;

    for (const el of elements) {
      if (el === current) continue;
      const rect = el.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };

      const dx = center.x - curCenter.x;
      const dy = center.y - curCenter.y;

      let isMatchingDirection = false;
      let primaryDistance = 0;
      let secondaryDistance = 0;

      switch (direction) {
        case "left":
          isMatchingDirection = dx < -15;
          primaryDistance = -dx;
          secondaryDistance = Math.abs(dy);
          break;
        case "right":
          isMatchingDirection = dx > 15;
          primaryDistance = dx;
          secondaryDistance = Math.abs(dy);
          break;
        case "up":
          isMatchingDirection = dy < -15;
          primaryDistance = -dy;
          secondaryDistance = Math.abs(dx);
          break;
        case "down":
          isMatchingDirection = dy > 15;
          primaryDistance = dy;
          secondaryDistance = Math.abs(dx);
          break;
      }

      if (isMatchingDirection) {
        const score = primaryDistance + secondaryDistance * 2.2;
        if (score < minDistance) {
          minDistance = score;
          bestCandidate = el;
        }
      }
    }

    if (bestCandidate) {
      bestCandidate.focus();
      bestCandidate.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      activeFocusRef.current = bestCandidate;
    }
  }, []);

  const activateCurrentElement = useCallback(() => {
    const current = document.activeElement as HTMLElement | null;
    if (current && typeof current.click === "function") {
      current.click();
    }
  }, []);

  // TV Real-time Command Receiver from Paired Phone
  useEffect(() => {
    if (!tvPairingCode || typeof window === "undefined") return;

    if (sseRef.current) {
      sseRef.current.close();
    }

    const es = new EventSource(`/api/remote/events?code=${tvPairingCode}&role=tv`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "status") {
          setPhoneConnected(Boolean(data.phoneConnected));
        } else if (data.type === "connected") {
          setPhoneConnected(Boolean(data.phoneConnected));
        } else if (data.type === "command") {
          const { command, payload } = data;

          switch (command) {
            case "UP":
              navigateDirection("up");
              break;
            case "DOWN":
              navigateDirection("down");
              break;
            case "LEFT":
              navigateDirection("left");
              break;
            case "RIGHT":
              navigateDirection("right");
              break;
            case "SELECT":
              activateCurrentElement();
              break;
            case "BACK":
              if (isPairModalOpen) {
                setIsPairModalOpen(false);
              } else {
                const closeBtn = document.querySelector<HTMLElement>('[data-nav="modal-close"]');
                if (closeBtn) {
                  closeBtn.click();
                } else {
                  window.history.back();
                }
              }
              break;
            case "HOME":
              window.location.href = "/";
              break;
            case "FULLSCREEN": {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              } else {
                const fsBtn = document.querySelector<HTMLElement>('[data-nav="watch-fullscreen"], [data-nav="frame-fullscreen"]');
                if (fsBtn) {
                  fsBtn.click();
                } else {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              }
              break;
            }
            case "TV_MODE":
              toggleTvMode();
              break;
            case "PREV_EP": {
              const prevBtn = document.querySelector<HTMLElement>('[data-nav="prev-ep-btn"]');
              if (prevBtn) prevBtn.click();
              break;
            }
            case "NEXT_EP": {
              const nextBtn = document.querySelector<HTMLElement>('[data-nav="next-ep-btn"]');
              if (nextBtn) nextBtn.click();
              break;
            }
            case "SEARCH": {
              if (payload?.query) {
                const searchInput = document.querySelector<HTMLInputElement>('[data-nav="search-input"]');
                if (searchInput) {
                  searchInput.value = payload.query;
                  searchInput.dispatchEvent(new Event("input", { bubbles: true }));
                  searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }
              break;
            }
            case "NAVIGATE": {
              if (payload?.path) {
                window.location.href = payload.path;
              }
              break;
            }
          }
        }
      } catch (err) {
        console.error("Remote command processing error:", err);
      }
    };

    sseRef.current = es;

    return () => {
      es.close();
    };
  }, [tvPairingCode, navigateDirection, activateCurrentElement, toggleTvMode, isPairModalOpen]);

  // Global D-Pad and Keyboard Remote Controller
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");

      if (e.key === "Escape") {
        if (isInput) {
          target.blur();
        }
        return;
      }

      // Quick toggle TV mode with 't' or 'T' key
      if ((e.key === "t" || e.key === "T") && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleTvMode();
        return;
      }

      // Quick open Phone Pair modal with 'r' or 'R' key
      if ((e.key === "r" || e.key === "R") && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsPairModalOpen((prev) => !prev);
        return;
      }

      // Quick toggle Remote Help overlay with 'h' or 'H'
      if ((e.key === "h" || e.key === "H") && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowRemoteOverlay((prev) => !prev);
        return;
      }

      const isNavActive = isTvMode || (target && target.hasAttribute("data-nav"));

      if (!isInput && isNavActive) {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          navigateDirection("up");
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          navigateDirection("down");
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          navigateDirection("left");
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          navigateDirection("right");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTvMode, toggleTvMode, navigateDirection]);

  return (
    <DeviceContext.Provider
      value={{
        isTvMode,
        isMobile,
        toggleTvMode,
        setTvMode,
        showRemoteOverlay,
        setShowRemoteOverlay,
        navigateDirection,
        activateCurrentElement,
        tvPairingCode,
        phoneConnected,
        isPairModalOpen,
        setIsPairModalOpen,
        generateNewPairingCode,
        appMode,
        setAppMode,
        toggleAppMode,
        isModeModalOpen,
        setIsModeModalOpen,
      }}
    >
      {children}
      <PairPhoneModal
        isOpen={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
      />
      <ModeSwitchModal
        isOpen={isModeModalOpen}
        onClose={() => setIsModeModalOpen(false)}
      />
    </DeviceContext.Provider>
  );
}
