import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Repeat, Download, Maximize, Minimize } from 'lucide-react';
import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from './useSceneControls';
import type { Lang } from '@/lib/video/LangContext';

const PROGRESS_TICK_MS = 60;

function getLangFromUrl(): Lang {
  const p = new URLSearchParams(window.location.search).get('lang');
  return p === 'en' ? 'en' : 'es';
}

interface ControlBarProps {
  visible: boolean;
  collapsed: boolean;
  locked: boolean;
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  tick: number;
  lang: Lang;
  isFullscreen: boolean;
  onToggleLock: () => void;
  onJumpTo: (index: number) => void;
  onToggleCollapsed: () => void;
  onToggleLang: () => void;
  onToggleFullscreen: () => void;
}

function ProgressSegments({
  sceneKeys,
  activeIndex,
  activeDuration,
  tick,
  onJumpTo,
}: {
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  tick: number;
  onJumpTo: (index: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    const start = performance.now();
    const id = window.setInterval(() => {
      setElapsed(performance.now() - start);
    }, PROGRESS_TICK_MS);
    return () => window.clearInterval(id);
  }, [tick]);

  const progress = activeDuration > 0 ? Math.min(1, elapsed / activeDuration) : 0;

  return (
    <div className="flex-1 flex items-center gap-1">
      {sceneKeys.map((key, i) => {
        const isActive = i === activeIndex;
        const fill = isActive ? progress * 100 : 0;
        return (
          <button
            key={key}
            onClick={() => onJumpTo(i)}
            className="flex-1 h-2.5 bg-white/20 rounded-full overflow-hidden cursor-pointer hover:h-3.5 hover:bg-white/25 transition-all relative min-h-[10px]"
            aria-label={`Jump to scene ${i + 1}`}
            aria-current={isActive ? 'true' : undefined}
          >
            <div
              className="absolute inset-y-0 left-0 bg-white/90 rounded-full transition-[width] duration-100"
              style={{ width: `${fill}%` }}
            />
          </button>
        );
      })}
    </div>
  );
}

function ControlBar({
  visible,
  collapsed,
  locked,
  sceneKeys,
  activeIndex,
  activeDuration,
  tick,
  lang,
  isFullscreen,
  onToggleLock,
  onJumpTo,
  onToggleCollapsed,
  onToggleLang,
  onToggleFullscreen,
}: ControlBarProps) {
  const handleDownload = useCallback(() => {
    const exportUrl = `${window.location.pathname}?export=true`;
    window.open(exportUrl, '_blank', 'noopener');
  }, []);

  return (
    <div
      className={`flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-3 transition-all duration-200 ease-out ${
        visible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-full opacity-0 pointer-events-none'
      }`}
      aria-hidden={!visible}
    >
      <button
        onClick={onToggleLock}
        className={`w-12 h-12 flex items-center justify-center transition-colors rounded-lg shrink-0 ${
          locked
            ? 'text-white bg-white/15 hover:bg-white/25'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
        title={locked ? 'Loop: on' : 'Loop: off'}
        aria-label={locked ? 'Loop: on' : 'Loop: off'}
        aria-pressed={locked}
      >
        <Repeat className="w-7 h-7" />
      </button>

      <div className="w-px self-stretch bg-white/15" aria-hidden="true" />

      <ProgressSegments
        sceneKeys={sceneKeys}
        activeIndex={activeIndex}
        activeDuration={activeDuration}
        tick={tick}
        onJumpTo={onJumpTo}
      />

      <div className="text-base text-white/50 font-mono tabular-nums shrink-0 px-1">
        {activeIndex + 1}/{sceneKeys.length}
      </div>

      <div className="w-px self-stretch bg-white/15" aria-hidden="true" />

      {/* Language toggle */}
      <button
        onClick={onToggleLang}
        className="flex items-center shrink-0 rounded-lg overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.15)' }}
        aria-label={`Switch to ${lang === 'en' ? 'Spanish' : 'English'}`}
        title={`Switch to ${lang === 'en' ? 'Spanish' : 'English'}`}
      >
        <span
          className="px-3 py-2 text-xs font-bold transition-colors"
          style={{
            background: lang === 'es' ? '#00C875' : 'transparent',
            color: lang === 'es' ? '#004F2D' : 'rgba(255,255,255,0.4)',
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.08em',
          }}
        >
          ES
        </span>
        <span
          className="px-3 py-2 text-xs font-bold transition-colors"
          style={{
            background: lang === 'en' ? '#00C875' : 'transparent',
            color: lang === 'en' ? '#004F2D' : 'rgba(255,255,255,0.4)',
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.08em',
          }}
        >
          EN
        </span>
      </button>

      {/* Download English MP4 */}
      <button
        onClick={handleDownload}
        className="flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-colors hover:bg-white/10"
        style={{
          border: '1px solid rgba(0,200,117,0.5)',
          color: '#00C875',
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.06em',
        }}
        title="Download English version as MP4"
        aria-label="Download English MP4"
      >
        <Download className="w-4 h-4" />
        EN MP4
      </button>

      {/* Fullscreen toggle */}
      <button
        onClick={onToggleFullscreen}
        className="w-12 h-12 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors rounded-lg shrink-0"
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? <Minimize className="w-7 h-7" /> : <Maximize className="w-7 h-7" />}
      </button>

      <button
        onClick={onToggleCollapsed}
        className="w-12 h-12 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors rounded-lg shrink-0"
        title={collapsed ? 'Show controls' : 'Hide controls'}
        aria-label={collapsed ? 'Show controls' : 'Hide controls'}
        aria-expanded={!collapsed}
      >
        {collapsed ? <ChevronUp className="w-8 h-8" /> : <ChevronDown className="w-8 h-8" />}
      </button>
    </div>
  );
}

export default function VideoWithControls() {
  const isIframed = typeof window !== 'undefined' && window.self !== window.top;

  const {
    sceneKeys,
    activeIndex,
    locked,
    mountKey,
    tick,
    durations,
    activeDuration,
    onSceneChange,
    jumpTo,
    toggleLock,
  } = useSceneControls(SCENE_DURATIONS);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const sensorRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tapPinned, setTapPinned] = useState(false);
  const [lang, setLang] = useState<Lang>(getLangFromUrl);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handlePointerEnter = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') setHovering(true);
  }, []);
  const handlePointerLeave = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') setHovering(false);
  }, []);
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    if (collapsed) setTapPinned(true);
  }, [collapsed]);
  const handleToggleCollapsed = useCallback(() => {
    setCollapsed(c => {
      if (!c) { setHovering(false); setTapPinned(false); }
      return !c;
    });
  }, []);
  const handleToggleLang = useCallback(() => {
    setLang(l => l === 'es' ? 'en' : 'es');
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    if (!(collapsed && tapPinned)) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const sensor = sensorRef.current;
      if (sensor && !sensor.contains(e.target as Node)) setTapPinned(false);
    };
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [collapsed, tapPinned]);

  const barVisible = !collapsed || hovering || tapPinned;

  if (!isIframed) return <VideoTemplate lang={lang} />;

  return (
    <div ref={containerRef} className="relative w-full h-screen">
      <VideoTemplate
        key={mountKey}
        durations={durations}
        loop
        onSceneChange={onSceneChange}
        lang={lang}
      />
      <div
        ref={sensorRef}
        className="absolute bottom-0 left-0 right-0 z-50 flex flex-col justify-end"
        style={{ height: '25%' }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
      >
        <div className="flex-1 w-full" aria-hidden="true" />
        <ControlBar
          visible={barVisible}
          collapsed={collapsed}
          locked={locked}
          sceneKeys={sceneKeys}
          activeIndex={activeIndex}
          activeDuration={activeDuration}
          tick={tick}
          lang={lang}
          isFullscreen={isFullscreen}
          onToggleLock={toggleLock}
          onJumpTo={jumpTo}
          onToggleCollapsed={handleToggleCollapsed}
          onToggleLang={handleToggleLang}
          onToggleFullscreen={handleToggleFullscreen}
        />
      </div>
    </div>
  );
}
