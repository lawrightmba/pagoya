import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import logoPng from '@assets/pagoya_logo_transparent.png';

export const SCENE_DURATIONS: Record<string, number> = {
  problem: 8000,
  paula: 14000,
  pti: 16000,
  unlocks: 12000,
  traction: 10000,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations, loop });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      audio.currentTime = targetTime;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted]);

  const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
    problem: Scene1,
    paula: Scene2,
    pti: Scene3,
    unlocks: Scene4,
    traction: Scene5,
  };

  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  return (
    <>
      <div className="relative w-full h-screen overflow-hidden bg-[#0A1A0F]">
        {/* Persistent Background */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute w-[80vw] h-[80vw] rounded-full blur-[120px] opacity-20"
            style={{ background: 'radial-gradient(circle, #005432, transparent)' }}
            animate={{ x: ['-20%', '20%', '-10%'], y: ['-10%', '30%', '-20%'], scale: [1, 1.2, 0.9] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute right-0 bottom-0 w-[60vw] h-[60vw] rounded-full blur-[100px] opacity-30"
            style={{ background: 'radial-gradient(circle, #006B3C, transparent)' }}
            animate={{ x: ['10%', '-30%', '5%'], y: ['10%', '-20%', '10%'] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Persistent Mastercard Elements (Visible mainly in Beats 4 & 5) */}
        <motion.div
          className="absolute w-[20vw] h-[20vw] rounded-full bg-[#EB001B] mix-blend-screen blur-3xl"
          animate={{
            opacity: sceneIndex >= 3 ? 0.15 : 0,
            scale: sceneIndex === 4 ? 1.5 : 1,
            x: sceneIndex === 4 ? '40vw' : '70vw',
            y: sceneIndex === 4 ? '50vh' : '20vh',
          }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div
          className="absolute w-[20vw] h-[20vw] rounded-full bg-[#F79E1B] mix-blend-screen blur-3xl"
          animate={{
            opacity: sceneIndex >= 3 ? 0.15 : 0,
            scale: sceneIndex === 4 ? 1.5 : 1,
            x: sceneIndex === 4 ? '60vw' : '85vw',
            y: sceneIndex === 4 ? '50vh' : '40vh',
          }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Persistent Logo */}
        <motion.img
          src={logoPng}
          alt="PagoYa Logo"
          className="absolute z-50 top-12 left-12 w-32 object-contain"
          animate={{
            opacity: sceneIndex === 4 ? 0 : 1,
            scale: sceneIndex === 0 ? 1 : 0.8,
            x: sceneIndex === 0 ? 0 : -10,
            y: sceneIndex === 0 ? 0 : -10,
          }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Scene Render */}
        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>
      </div>

      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </>
  );
}
