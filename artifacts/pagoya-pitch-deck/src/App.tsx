/**
 * Platform contract file — do not restructure.
 *
 * This file is part of the contract between the slides artifact and
 * the surrounding workspace tooling (preview, thumbnails, exports).
 * Reorganizing it, swapping the router, or changing the structure
 * of `AllSlides` can quietly break that tooling even when the page
 * still looks correct in the preview.
 *
 * Agents: see the slides skill `<workspace_contract>` for the full
 * rules, and `references/visual_qa.md` → "Platform contract sanity
 * check" if this file has been hand-edited and needs repair.
 */

import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

import { slides } from "@/slideLoader";
import { LangProvider, useLang } from "@/LangContext";

function getSlideIndex(pathname: string): number {
  const match = pathname.match(/^\/slide(\d+)$/);
  if (!match) return -1;
  const position = parseInt(match[1], 10);
  return slides.findIndex((s) => s.position === position);
}

function LangToggle() {
  const { lang, toggle } = useLang();
  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggle(); }}
      style={{
        position: "absolute",
        top: "2.8vh",
        right: "3vw",
        zIndex: 101,
        display: "flex",
        alignItems: "center",
        gap: "0.4vw",
        background: "rgba(0,20,12,0.75)",
        border: "1px solid rgba(0,200,117,0.45)",
        borderRadius: "2vw",
        padding: "0.55vh 1.1vw",
        cursor: "pointer",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      {(["es", "en"] as const).map((l, i) => (
        <span key={l}>
          {i > 0 && (
            <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", color: "rgba(255,255,255,0.25)", margin: "0 0.2vw" }}>|</span>
          )}
          <span
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.2vw",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: lang === l ? "#00C875" : "rgba(255,255,255,0.35)",
              transition: "color 0.15s",
            }}
          >
            {l}
          </span>
        </span>
      ))}
    </button>
  );
}

function SlideEditor() {
  const [location, navigate] = useLocation();
  const currentIndex = getSlideIndex(location);

  const navigationDisabledRef = useRef(window.parent !== window.parent.parent);
  const touchHandledRefStable = useRef(false);

  useEffect(() => {
    if (currentIndex === -1) return;

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (navigationDisabledRef.current) return;
      if (event.key === " ") {
        event.preventDefault();
      }
      if ((event.key === "ArrowLeft" || event.key === "ArrowUp") && currentIndex > 0) {
        navigate(`/slide${slides[currentIndex - 1].position}`);
      }
      if (
        (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === " ") &&
        currentIndex < slides.length - 1
      ) {
        navigate(`/slide${slides[currentIndex + 1].position}`);
      }
    };

    const INTERACTIVE =
      "a,button,video,audio,input,select,textarea,details,summary,iframe,svg,canvas," +
      '[role="button"],[contenteditable="true"]';

    const isInteractive = (target: EventTarget | null) =>
      (target as HTMLElement | null)?.closest?.(INTERACTIVE);

    const touchHandledRef = touchHandledRefStable;

    const onClick = (event: MouseEvent) => {
      if (touchHandledRef.current) {
        touchHandledRef.current = false;
        return;
      }
      if (event.button !== 0 || event.metaKey || event.ctrlKey) return;
      if (isInteractive(event.target)) return;

      if (navigationDisabledRef.current) {
        window.parent.postMessage({ type: "advanceSlide" }, "*");
        return;
      }

      if (currentIndex < slides.length - 1) {
        navigate(`/slide${slides[currentIndex + 1].position}`);
      }
    };

    let touchStartX = 0;
    let touchStartY = 0;
    let touchTarget: EventTarget | null = null;

    const onTouchStart = (event: TouchEvent) => {
      touchHandledRef.current = false;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
      touchTarget = event.target;
    };

    const onTouchEnd = (event: TouchEvent) => {
      const dx = event.changedTouches[0].clientX - touchStartX;
      const dy = event.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) >= 10 || Math.abs(dy) >= 10) return;
      if (isInteractive(touchTarget)) return;
      touchHandledRef.current = true;

      if (navigationDisabledRef.current) {
        window.parent.postMessage({ type: "advanceSlide" }, "*");
        return;
      }

      const fraction = touchStartX / window.innerWidth;
      if (fraction < 0.4 && currentIndex > 0) {
        navigate(`/slide${slides[currentIndex - 1].position}`);
      } else if (fraction >= 0.4 && currentIndex < slides.length - 1) {
        navigate(`/slide${slides[currentIndex + 1].position}`);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("click", onClick);
    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("click", onClick);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [currentIndex, navigate]);

  const base = import.meta.env.BASE_URL;

  return (
    <div className="select-none">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          style={{ display: index === currentIndex ? "block" : "none", position: "relative" }}
        >
          <slide.Component />
          <img
            src={`${base}pagoya-logo.png`}
            alt="PagoYa"
            style={{
              position: "absolute",
              top: "2.8vh",
              left: "3vw",
              height: "8.5vh",
              width: "auto",
              pointerEvents: "none",
              zIndex: 100,
            }}
          />
          <LangToggle />
        </div>
      ))}
    </div>
  );
}

// Do not rewrite this component. Each slide must remain wrapped in
// `<div className="slide">` sized 1920×1080 — the class name and
// dimensions are part of the platform contract. See the file-level
// banner above for context.
function AllSlides() {
  return (
    <div className="bg-black">
      {slides.map((slide) => (
        <div
          key={slide.id}
          className="slide relative aspect-video overflow-hidden"
          style={{ width: "1920px", height: "1080px" }}
        >
          <div className="h-full w-full [&_.h-screen]:!h-full [&_.w-screen]:!w-full">
            <slide.Component />
          </div>
        </div>
      ))}
    </div>
  );
}

// This component is used for the deployed view at `/`
function SlideViewer() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [dims, setDims] = useState(() => ({
    width: Math.min(window.innerWidth, window.innerHeight * (16 / 9)),
    height: Math.min(window.innerHeight, window.innerWidth * (9 / 16)),
  }));

  useEffect(() => {
    const update = () => {
      setDims({
        width: Math.min(window.innerWidth, window.innerHeight * (16 / 9)),
        height: Math.min(window.innerHeight, window.innerWidth * (9 / 16)),
      });
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== " ") return;
      if (event.key === " ") event.preventDefault();
      iframeRef.current?.contentWindow?.dispatchEvent(
        new KeyboardEvent("keydown", { key: event.key, code: event.code, bubbles: true }),
      );
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const firstPosition = slides.length > 0 ? slides[0].position : 1;

  return (
    <div
      className="slide-viewer h-screen w-screen overflow-hidden bg-black flex items-center justify-center"
      onClick={() => iframeRef.current?.focus()}
    >
      <iframe
        ref={iframeRef}
        src={`${base}/slide${firstPosition}`}
        style={{ width: dims.width, height: dims.height, border: "none" }}
        onLoad={() => iframeRef.current?.focus()}
        title="Slide viewer"
      />
    </div>
  );
}

export default function App() {
  const [location, navigate] = useLocation();

  // DO NOT edit this useEffect - redirects unknown routes to the first slide.
  // The "/" and "/allslides" routes are handled separately below.
  useEffect(() => {
    if (
      location !== "/" &&
      location !== "/allslides" &&
      getSlideIndex(location) === -1
    ) {
      if (slides.length > 0) {
        navigate(`/slide${slides[0].position}`, { replace: true });
      }
    }
  }, [location, navigate]);

  // DO NOT edit this useEffect - allows the parent frame to navigate
  // between slides via postMessage so it can avoid changing the iframe
  // src (which causes a white flash).
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.data?.type === "navigateToSlide" &&
        typeof event.data.position === "number" &&
        slides.some((s) => s.position === event.data.position)
      ) {
        navigate(`/slide${event.data.position}`);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [navigate]);

  if (location === "/") return <LangProvider><SlideViewer /></LangProvider>;
  if (location === "/allslides") return <LangProvider><AllSlides /></LangProvider>;
  return <LangProvider><SlideEditor /></LangProvider>;
}
